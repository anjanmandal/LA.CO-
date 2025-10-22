import CcusProject from '../models/CcusProject.js';
import CcusWell from '../models/CcusWell.js';
import CcusPermit from '../models/CcusPermit.js';
import CcusInjection from '../models/CcusInjection.js';
import CcusPipe from '../models/CcusPipe.js';
import CcusAlert from '../models/CcusAlert.js';
import Organization from '../models/Organization.js';
import { computeRiskScore } from '../services/ccus/riskScore.js';
import { checkGeofences } from '../services/ccus/geoAlerts.js';
import mongoose from 'mongoose';

export const listProjects = async (_req, res) => {
  const projects = await CcusProject.find().lean();
  if (!projects.length) return res.json([]);

  const ids = projects.map((p) => p._id);

  const [wellCounts, permitCounts, alertCounts, orgDocs] = await Promise.all([
    CcusWell.aggregate([
      { $match: { projectId: { $in: ids } } },
      { $group: { _id: '$projectId', count: { $sum: 1 } } },
    ]),
    CcusPermit.aggregate([
      { $match: { projectId: { $in: ids } } },
      { $group: { _id: '$projectId', count: { $sum: 1 } } },
    ]),
    CcusAlert.aggregate([
      { $match: { projectId: { $in: ids } } },
      { $group: { _id: '$projectId', count: { $sum: 1 } } },
    ]),
    Organization.find({ _id: { $in: projects.filter((p) => p.organizationId).map((p) => p.organizationId) } })
      .select('name')
      .lean(),
  ]);

  const wellMap = Object.fromEntries(wellCounts.map((w) => [String(w._id), w.count]));
  const permitMap = Object.fromEntries(permitCounts.map((w) => [String(w._id), w.count]));
  const alertMap = Object.fromEntries(alertCounts.map((w) => [String(w._id), w.count]));
  const orgMap = Object.fromEntries(orgDocs.map((o) => [String(o._id), o.name]));

  const decorated = projects.map((p) => ({
    ...p,
    counts: {
      wells: wellMap[String(p._id)] || 0,
      permits: permitMap[String(p._id)] || 0,
      alerts: alertMap[String(p._id)] || 0,
    },
    organizationName: p.organizationId ? orgMap[String(p.organizationId)] || null : null,
  }));

  res.json(decorated);
};

export const getProject = async (req, res) => {
  const p = await CcusProject.findById(req.params.id).lean();
  if (!p) return res.status(404).json({ error: 'not found' });
  const wells = await CcusWell.find({ projectId: p._id }).lean();
  const permits = await CcusPermit.find({ projectId: p._id }).lean();
  const pipes = await CcusPipe.find({ projectId: p._id }).lean();

  // KPI: last 30 days relative to latest available injection record
  let vol30 = 0;
  let maxP30 = 0;
  const latestInjection = await CcusInjection.findOne({ projectId: p._id }).sort({ date: -1 }).lean();
  if (latestInjection) {
    const windowStart = new Date(latestInjection.date);
    windowStart.setDate(windowStart.getDate() - 30);
    const injAgg = await CcusInjection.aggregate([
      {
        $match: {
          projectId: new mongoose.Types.ObjectId(p._id),
          date: { $gte: windowStart, $lte: latestInjection.date }
        }
      },
      {
        $group: {
          _id: null,
          volume: { $sum: '$volume_tCO2' },
          maxP: { $max: '$maxSurfacePressure_psi' }
        }
      }
    ]);
    vol30 = injAgg[0]?.volume || 0;
    maxP30 = injAgg[0]?.maxP || 0;
  }
  if (!maxP30) {
    maxP30 = Math.max(0, ...wells.map((w) => w.maxAllowablePressure_psi || 0));
  }
  const risk = computeRiskScore({ monthVolume_tCO2: vol30, maxSurfacePressure_psi: maxP30, geologyTags: p.geologyTags });

  let organization = null;
  if (p.organizationId) {
    organization = await Organization.findById(p.organizationId).select('name').lean();
  }

  res.json({ project: p, organization, wells, permits, pipes, kpi: { vol30_tCO2: vol30, maxP30_psi: maxP30, risk } });
};

export const upsertInjection = async (req, res) => {
  const { projectId, wellId, date, volume_tCO2, avgTubingPressure_psi, maxSurfacePressure_psi, source, datasetVersion } = req.body;
  if (!projectId || !wellId || !date) return res.status(400).json({ error: 'projectId, wellId, date required' });

  const d = new Date(date);
  const existing = await CcusInjection.findOne({ projectId, wellId, date: d });
  if (existing) {
    existing.volume_tCO2 = Number(volume_tCO2 ?? existing.volume_tCO2);
    existing.avgTubingPressure_psi = Number(avgTubingPressure_psi ?? existing.avgTubingPressure_psi);
    existing.maxSurfacePressure_psi = Number(maxSurfacePressure_psi ?? existing.maxSurfacePressure_psi);
    if (source) existing.source = source;
    if (datasetVersion) existing.datasetVersion = datasetVersion;
    await existing.save();
    return res.json({ action: 'updated', id: existing._id });
  }

  const created = await CcusInjection.create({
    projectId, wellId, date: d,
    volume_tCO2, avgTubingPressure_psi, maxSurfacePressure_psi,
    source: source || 'reported', datasetVersion
  });
  res.json({ action: 'inserted', id: created._id });
};

export const getTimeSeries = async (req, res) => {
  const { id } = req.params;
  const { from, to } = req.query;
  const q = { projectId: id };
  if (from || to) q.date = {};
  if (from) q.date.$gte = new Date(from);
  if (to) q.date.$lte = new Date(to);
  const series = await CcusInjection.find(q).sort({ date: 1 }).lean();
  res.json(series);
};

export const runGeoAlerts = async (req, res) => {
  const p = await CcusProject.findById(req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  const wells = await CcusWell.find({ projectId: p._id }).lean();
  const out = await checkGeofences({ project: p.toObject(), wells });
  res.json(out);
};

export const listAlerts = async (req, res) => {
  const items = await CcusAlert.find({ projectId: req.params.id }).sort({ createdAt: -1 }).lean();
  res.json(items);
};
