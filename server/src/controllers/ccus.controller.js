import CcusProject from '../models/CcusProject.js';
import CcusWell from '../models/CcusWell.js';
import CcusPermit from '../models/CcusPermit.js';
import CcusInjection from '../models/CcusInjection.js';
import CcusPipe from '../models/CcusPipe.js';
import CcusAlert from '../models/CcusAlert.js';
import { computeRiskScore } from '../services/ccus/riskScore.js';
import { checkGeofences } from '../services/ccus/geoAlerts.js';
import mongoose from 'mongoose';

export const listProjects = async (_req, res) => {
  const items = await CcusProject.find().lean();
  res.json(items);
};

export const getProject = async (req, res) => {
  const p = await CcusProject.findById(req.params.id).lean();
  if (!p) return res.status(404).json({ error: 'not found' });
  const wells = await CcusWell.find({ projectId: p._id }).lean();
  const permits = await CcusPermit.find({ projectId: p._id }).lean();
  const pipes = await CcusPipe.find({ projectId: p._id }).lean();

  // KPI: last 30 days total volume and max pressure
  const since = new Date(); since.setDate(since.getDate() - 30);
  const injAgg = await CcusInjection.aggregate([
    { $match: { projectId: new mongoose.Types.ObjectId(p._id), date: { $gte: since } } },
    { $group: {
        _id: null,
        volume: { $sum: '$volume_tCO2' },
        maxP: { $max: '$maxSurfacePressure_psi' }
    }}
  ]);
  const vol30 = injAgg[0]?.volume || 0;
  const maxP30 = injAgg[0]?.maxP || 0;
  const risk = computeRiskScore({ monthVolume_tCO2: vol30, maxSurfacePressure_psi: maxP30, geologyTags: p.geologyTags });

  res.json({ project: p, wells, permits, pipes, kpi: { vol30_tCO2: vol30, maxP30_psi: maxP30, risk } });
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
