// server/src/controllers/metrics.controller.js
import EmissionsObservation from '../models/EmissionsObservation.js';
import Facility from '../models/Facility.js';
import Sector from '../models/Sector.js';
import mongoose from 'mongoose';
import CcusReading from '../models/CcusReading.js';
import IntensityStat from '../models/IntensityStat.js';
import OpenAI from 'openai';

const oid = (s) => new mongoose.Types.ObjectId(s);

export async function overviewBySector(req, res) {
  // optional filters: ?from=2015&to=2025
  const from = Number(req.query.from) || 2015;
  const to   = Number(req.query.to) || 2025;

  const pipeline = [
    { $match: { year: { $gte: from, $lte: to }, source: 'observed' } },
    { $lookup: { from: 'facilities', localField: 'facilityId', foreignField: '_id', as: 'fac' } },
    { $unwind: '$fac' },
    { $lookup: { from: 'sectors', localField: 'fac.sectorId', foreignField: '_id', as: 'sec' } },
    { $unwind: { path: '$sec', preserveNullAndEmptyArrays: true } },
    { $addFields: { sectorCode: { $ifNull: ['$sec.code', '$fac.meta.sector'] } } }, // fallback for synthetic TRACE
    { $group: {
        _id: { sector: '$sectorCode', year: '$year' },
        co2eTonnes: { $sum: '$co2eTonnes' }
    }},
    { $project: { _id: 0, sector: '$_id.sector', year: '$_id.year', co2eTonnes: 1 } },
    { $sort: { sector: 1, year: 1 } }
  ];

  const rows = await EmissionsObservation.aggregate(pipeline);
  // return as { series: { sector: [{year, co2eTonnes}] }, years: [..] }
  const series = {};
  const yearsSet = new Set();
  for (const r of rows) {
    yearsSet.add(r.year);
    if (!series[r.sector]) series[r.sector] = [];
    series[r.sector].push({ year: r.year, value: r.co2eTonnes });
  }
  res.json({ from, to, series, years: [...yearsSet].sort() });
}

export async function facilityTrend(req, res) {
  const id = req.params.id;
  const rows = await EmissionsObservation.find({ facilityId: id }).lean().sort({ year: 1, month: 1, source: 1 });
  // fold monthly to annual for display convenience
  const by = new Map(); // key: year|source
  for (const r of rows) {
    const k = `${r.year}|${r.source}`;
    by.set(k, (by.get(k) || 0) + r.co2eTonnes);
  }
  const out = [...by.entries()].map(([k, v]) => {
    const [year, source] = k.split('|');
    return { year: Number(year), source, co2eTonnes: v };
  }).sort((a,b)=>a.year-b.year || a.source.localeCompare(b.source));
  res.json({ facilityId: id, rows: out });
}

export async function methodTimeline(req, res) {
  // optional: ?facilityId=...&from=2015&to=2025
  const q = {};
  if (req.query.facilityId) q.facilityId = oid(req.query.facilityId);
  if (req.query.from || req.query.to) {
    q.year = {};
    if (req.query.from) q.year.$gte = Number(req.query.from);
    if (req.query.to) q.year.$lte = Number(req.query.to);
  }
  const rows = await EmissionsObservation.find(q, { year:1, month:1, method:1, source:1, datasetVersion:1 })
    .lean().sort({ year:1, month:1, source:1 });
  res.json({ rows });
}

export async function reconciliation(req, res) {
  // Compare reported vs observed per year for a facility
  const facilityId = oid(req.params.facilityId);
  const rows = await EmissionsObservation.aggregate([
    { $match: { facilityId } },
    { $group: {
        _id: { year: '$year', source: '$source' },
        co2eTonnes: { $sum: '$co2eTonnes' },
        latestVersion: { $max: '$datasetVersion' }
    }},
    { $group: {
        _id: '$_id.year',
        observed: { $sum: { $cond: [{ $eq: ['$_id.source','observed'] }, '$co2eTonnes', 0] } },
        reported: { $sum: { $cond: [{ $eq: ['$_id.source','reported'] }, '$co2eTonnes', 0] } }
    }},
    { $project: {
        _id: 0,
        year: '$_id',
        observed: 1,
        reported: 1,
        delta: { $subtract: ['$reported', '$observed'] },
        pct: {
          $cond: [{ $gt: ['$observed', 0] },
            { $multiply: [{ $divide: [{ $subtract: ['$reported','$observed'] }, '$observed'] }, 100] },
            null
          ]
        }
    }},
    { $sort: { year: 1 } }
  ]);
  console.log('RECONCILIATION', { facilityId, rows });
  res.json({ facilityId, rows });
}


export async function reconciliationExplain(req, res) {
  const facilityId = new mongoose.Types.ObjectId(req.params.facilityId);
  const yearQ = req.query.year ? Number(req.query.year) : null;

  const rows = await EmissionsObservation.find({ facilityId }).lean();
  if (!rows.length) return res.json({ ok: true, breakdown: [], meta: { note: 'no data' } });

  // pick explicit year or latest with data
  const year =
    yearQ ||
    rows.reduce((max, r) => Math.max(max, r.year || 0), 0) ||
    new Date().getUTCFullYear();

  const forYear = rows.filter(r => r.year === year);
  const sum = (arr, p) => arr.reduce((a, x) => a + (Number(x?.[p]) || 0), 0);

  const observed = sum(forYear.filter(r => r.source === 'observed'), 'co2eTonnes');
  const reported = sum(forYear.filter(r => r.source === 'reported'), 'co2eTonnes');

  // Heuristic buckets from method/notes flags
  const defs = [
    { key:'measuredAdj',  label:'Measured vs Calculated', test:/measure/i,           sign:+1 },
    { key:'calcAdj',      label:'Calculated/Model factors', test:/calc|model|factor/i, sign:-1 },
    { key:'estAdj',       label:'Estimation & gaps',       test:/estimate|assum|gap/i, sign:-1 },
    { key:'biogenicAdj',  label:'Biogenic carve-out',      test:/biogenic/i,          sign:-1 },
    { key:'ventingAdj',   label:'Venting & flaring',       test:/vent|flare/i,        sign:+1 },
    { key:'scopeAdj',     label:'Scope/boundary',          test:/scope\s*[23]|boundary/i, sign:+1 },
  ];
  const toText = (r) => [r.method, r.notes, r.meta?.notes, r.meta?.flag, r.meta?.methodNote]
                        .filter(Boolean).join(' ');
  const buckets = Object.fromEntries(defs.map(d => [d.key, 0]));

  for (const r of forYear) {
    if (r.source !== 'reported') continue;
    const txt = toText(r);
    for (const d of defs) if (d.test.test(txt)) buckets[d.key] += (r.co2eTonnes || 0) * d.sign * 0.15;
  }
  for (const k of Object.keys(buckets)) if (Math.abs(buckets[k]) < 1) buckets[k] = 0;

  const adjustmentsSum = Object.values(buckets).reduce((a, x) => a + x, 0);
  const residual = (reported - observed) - adjustmentsSum;

  const breakdown = [
    { key:'observed', label:'Observed', value: observed, type:'base' },
    ...defs.map(d => ({ key:d.key, label:d.label, value:buckets[d.key], type:'adjustment' })),
    { key:'residual', label:'Residual', value: residual, type:'residual' },
    { key:'reported', label:'Reported', value: reported, type:'final' },
  ];

  const obsLow  = sum(forYear.filter(r => r.source === 'observed'), 'uncertaintyLow');
  const obsHigh = sum(forYear.filter(r => r.source === 'observed'), 'uncertaintyHigh');

  // Optional LLM explanation
  let explanation = '';
  try {
    if (process.env.OPENAI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const bullets = [
        `Observed=${Math.round(observed).toLocaleString()} t, Reported=${Math.round(reported).toLocaleString()} t`,
        ...defs.filter(d => buckets[d.key] !== 0).map(d => `${d.label}: ${Math.round(buckets[d.key]).toLocaleString()} t`),
        `Residual: ${Math.round(residual).toLocaleString()} t`
      ].join('\n');
      const chat = await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        temperature: 0.2,
        max_tokens: 220,
        messages: [{ role:'user', content:
          `Explain the gap between Observed and Reported for ${year}:\n${bullets}\nIn 3 bullets, likely reasons + what to check next.` }]
      });
      explanation = chat.choices?.[0]?.message?.content ?? '';
    }
  } catch (e) { explanation = `AI explain unavailable: ${e.message || e}`; }

  res.json({
    ok: true,
    facilityId: String(facilityId),
    year,
    breakdown,
    meta: {
      observed, reported, delta: reported - observed,
      obsUncertainty: (obsLow || obsHigh) ? { low: obsLow || null, high: obsHigh || null } : null
    },
    explanation
  });
}
  

export async function captureVsStorage(req, res) {
  const from = Number(req.query.from) || 2019;
  const to   = Number(req.query.to) || new Date().getUTCFullYear();
  const projectId = req.query.projectId;

  const match = { date: { $gte: new Date(`${from}-01-01`), $lte: new Date(`${to}-12-31`) } };
  if (projectId) match.projectId = new mongoose.Types.ObjectId(projectId);

  const rows = await CcusReading.aggregate([
    { $match: match },
    { $addFields: { year: { $year: '$date' } } },
    { $group: {
        _id: '$year',
        captured: { $sum: '$captured_tCO2' },
        stored:   { $sum: '$stored_tCO2' }
    }},
    { $project: { _id: 0, year: '$_id', captured: 1, stored: 1 } },
    { $sort: { year: 1 } }
  ]);

  const years = [];
  for (let y = from; y <= to; y++) years.push(y);
  const byYear = new Map(rows.map(r => [r.year, r]));
  const captured = years.map(y => byYear.get(y)?.captured ?? 0);
  const stored   = years.map(y => byYear.get(y)?.stored ?? 0);

  res.json({ years, captured, stored });
}

// GET /metrics/intensity?from=2019&to=2025&sector=power&unit=kWh
export async function intensityMetrics(req, res) {
  const from   = Number(req.query.from)  || 2019;
  const to     = Number(req.query.to)    || new Date().getUTCFullYear();
  const sector = (req.query.sector || '').trim();       // optional
  const unit   = (req.query.unit || 'kWh').trim();      // default kWh

  // pull per-facility annual stats from IntensityStat (seeded in your dummy script)
  const q = { year: { $gte: from, $lte: to }, unit };
  if (sector) q.sectorCode = sector;

  const docs = await IntensityStat.find(q, {
    facilityId: 1, sectorCode: 1, year: 1, unit: 1,
    outputQuantity: 1, co2eTonnes: 1,
  }).lean();

  // lookup facility names once
  const facIds = [...new Set(docs.map(d => String(d.facilityId)))];
  const facs   = await Facility.find(
    { _id: { $in: facIds } },
    { name: 1 }
  ).lean();
  const facName = new Map(facs.map(f => [String(f._id), f.name]));

  // build flat rows for the table + year buckets for percentiles
  const rows = [];
  const perYear = new Map(); // year -> [intensities]

  for (const d of docs) {
    const prod = Number(d.outputQuantity) || 0;
    const tCO2 = Number(d.co2eTonnes)     || 0;
    if (prod <= 0) continue; // skip bad rows

    const intensityKgPerUnit = (tCO2 * 1000) / prod;

    rows.push({
      id: `${d.facilityId}-${d.year}`,
      facilityId: String(d.facilityId),
      facility: facName.get(String(d.facilityId)) || 'Facility',
      sector: d.sectorCode || null,
      year: d.year,
      unit: d.unit,
      intensity: intensityKgPerUnit,              // kg CO2e / unit
      production: prod,                           // unit count (e.g., kWh)
      co2eTonnes: tCO2,
    });

    if (!perYear.has(d.year)) perYear.set(d.year, []);
    perYear.get(d.year).push(intensityKgPerUnit);
  }

  // build year axis and percentiles
  const years = [];
  const p10 = [], p50 = [], p90 = [];
  for (let y = from; y <= to; y++) {
    years.push(y);
    const arr = (perYear.get(y) || []).sort((a, b) => a - b);
    if (!arr.length) { p10.push(null); p50.push(null); p90.push(null); continue; }
    const qtile = (p) => {
      const idx = (p / 100) * (arr.length - 1);
      const lo = Math.floor(idx), hi = Math.ceil(idx);
      return lo === hi ? arr[lo] : (arr[lo] * (hi - idx) + arr[hi] * (idx - lo));
    };
    p10.push(qtile(10));
    p50.push(qtile(50));
    p90.push(qtile(90));
  }

  // optional: sample facility ids at median per year (kept for chart tooltips if you use it)
  const facilities = years.map(() => []); // or fill with ids you want to surface

  res.json({ unit, years, p10, p50, p90, facilities, rows });
}

