import EmissionsObservation from '../models/EmissionsObservation.js';
import Facility from '../models/Facility.js';
import CcusProject from '../models/CcusProject.js';      // if you already created one
// import InjectionEvent from '../models/InjectionEvent.js';// optional; used for KPIs
import { openai } from '../services/ai/openai.js';
import { jsonToCsv } from '../utils/csv.js';

// Convert query strings to numbers/dates safely
const toInt = (v, d) => (v == null ? d : Number.parseInt(v, 10));
const ymd = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export async function publicOverview(req, res) {
  // Filters: ?from=2015&to=2025
  const fromY = toInt(req.query.from, 2015);
  const toY   = toInt(req.query.to,   2025);

  // Only TRACE “sector aggregates” to keep the public baseline clean
  const traceAggFacIds = await Facility.find({ 'meta.kind':'trace_sector_aggregate' })
    .select('_id meta.sector meta.subsector name')
    .lean();

  const facIdSet = new Set(traceAggFacIds.map(f=>String(f._id)));

  const byYearSector = await EmissionsObservation.aggregate([
    { $match: { year: { $gte: fromY, $lte: toY }, source: 'observed' } },
    { $group: {
        _id: { facilityId:'$facilityId', year:'$year' },
        total: { $sum: '$co2eTonnes' }
    }},
  ]);

  // Join sector info and fold → [{year, sector, co2eTonnes}]
  const facMeta = Object.fromEntries(traceAggFacIds.map(f=>[String(f._id), f]));
  const rows = byYearSector
    .filter(r => facIdSet.has(String(r._id.facilityId)))
    .map(r => {
      const f = facMeta[String(r._id.facilityId)];
      return {
        year: r._id.year,
        sector: f?.meta?.sector || 'unknown',
        subsector: f?.meta?.subsector || null,
        facility: f?.name,
        co2eTonnes: r.total
      };
    });

  // Aggregate per sector/year for chart
  const grouped = {};
  for (const r of rows) {
    const k = `${r.year}|${r.sector}`;
    grouped[k] = (grouped[k] || 0) + r.co2eTonnes;
  }
  const chart = Object.entries(grouped).map(([k, v]) => {
    const [year, sector] = k.split('|');
    return { year: Number(year), sector, co2eTonnes: v };
  }).sort((a,b)=>a.year-b.year || a.sector.localeCompare(b.sector));

  res.json({
    years: { from: fromY, to: toY },
    sectors: [...new Set(chart.map(x=>x.sector))].sort(),
    chart,          // for stacked bars/lines
    table: rows,    // detailed table
    sources: [
      { name:'Climate TRACE', url:'https://climatetrace.org', dataset:'TRACE Sector aggregates' }
    ]
  });
}

export async function publicProjects(_req, res) {
  // Read-only public fields; NO InjectionEvent aggregation
  const projects = await CcusProject.find({})
    .select('_id name status location boundary meta') // meta may contain risk/kpi etc.
    .lean();

  // Normalize KPI shape from meta (optional), else 0s
  const normalized = projects.map(p => {
    // If you stored KPIs under meta.kpi.* use them; otherwise fallback to 0.
    const kpi = {
      vol30_tCO2: Number(p?.meta?.kpi?.vol30_tCO2 ?? 0),
      maxP30_psi: Number(p?.meta?.kpi?.maxP30_psi ?? 0),
      risk:       Number(p?.meta?.risk ?? p?.meta?.kpi?.risk ?? 0),
    };
    return { ...p, kpi };
  });

  res.json(normalized);
}

export async function publicDownloadCsv(req, res) {
  const kind = (req.query.kind || 'emissions').toLowerCase();
  const fromY = toInt(req.query.from, 2015);
  const toY   = toInt(req.query.to,   2025);

  if (kind === 'projects') {
    const data = await CcusProject.find({}).select('name status location meta').lean();
    const rows = data.map(d => ({
      id: String(d._id),
      name: d.name,
      status: d.status,
      lng: d.location?.coordinates?.[0] ?? '',
      lat: d.location?.coordinates?.[1] ?? '',
      risk: d?.meta?.risk ?? ''
    }));
    const csv = jsonToCsv(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="projects.csv"');
    return res.send(csv);
  }

  // emissions (TRACE aggregates only)
  const facIds = await Facility.find({ 'meta.kind': 'trace_sector_aggregate' }).select('_id meta.sector name').lean();
  const facIndex = Object.fromEntries(facIds.map(f=>[String(f._id), f]));
  const obs = await EmissionsObservation.find({
    facilityId: { $in: facIds.map(f=>f._id) },
    year: { $gte: fromY, $lte: toY },
    source: 'observed'
  }).lean();

  const rows = obs.map(o => ({
    year: o.year,
    sector: facIndex[String(o.facilityId)]?.meta?.sector || 'unknown',
    facility: facIndex[String(o.facilityId)]?.name || '',
    co2e_tonnes: o.co2eTonnes,
    dataset_version: o.datasetVersion || ''
  }));

  const csv = jsonToCsv(rows);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="emissions_${fromY}-${toY}.csv"`);
  res.send(csv);
}

export async function publicExplainChart(req, res) {
  // { chartType, series, filters, sources }
  const { chartType='stackedBar', series=[], filters={}, sources=[] } = req.body || {};
  const system = [
    'You write short, plain-language chart captions for the public.',
    'Explain what changed, who/what drives it, and cite sources succinctly.',
    'Tone: neutral; Audience: general public.'
  ].join('\n');
  const user = JSON.stringify({ chartType, series: series.slice(0, 500), filters, sources });

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    temperature: 0.3,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  });

  const text = completion.choices[0]?.message?.content?.trim() || 'No caption.';
  res.json({ caption: text });
}
