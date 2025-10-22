import EmissionsObservation from '../models/EmissionsObservation.js';
import Facility from '../models/Facility.js';
import CcusProject from '../models/CcusProject.js';      // if you already created one
// import InjectionEvent from '../models/InjectionEvent.js';// optional; used for KPIs
import StateEmission from '../models/StateEmission.js';
import CcusWell from '../models/CcusWell.js';
import CcusInjection from '../models/CcusInjection.js';
import { computeRiskScore } from '../services/ccus/riskScore.js';
import { openai } from '../services/ai/openai.js';
import { jsonToCsv } from '../utils/csv.js';
import { parse as parseCsv } from 'csv-parse/sync';
import xlsx from 'xlsx';

// Convert query strings to numbers/dates safely
const toInt = (v, d) => (v == null ? d : Number.parseInt(v, 10));
const ymd = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

const subpartLabels = Object.freeze({
  C: 'Stationary Fuel Combustion',
  P: 'Hydrogen Production',
  W: 'Petroleum & Natural Gas Systems',
  PP: 'CO₂ Suppliers',
  PP_MANDATORY: 'CO₂ Suppliers',
  AA: 'Pulp & Paper',
  BB: 'Glass Production',
  CC: 'Ammonia Production',
  DD: 'Adipic Acid Production',
  EE: 'Nitric Acid Production',
  FF: 'Petrochemical Production',
  HH: 'Cement Production',
  II: 'Lime Manufacturing',
  JJ: 'Iron & Steel',
  KK: 'Aluminum Production',
  LL: 'Fluorinated GHG Production',
  MM: 'Phosphoric Acid Production',
  NN: 'Silicon Carbide Production',
  OO: 'Soda Ash Manufacturing',
});

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
  const projects = await CcusProject.find({})
    .select('_id name status location boundary meta geologyTags')
    .lean();

  const projectIds = projects.map((p) => p._id);
  const wellAgg = await CcusWell.aggregate([
    { $match: { projectId: { $in: projectIds } } },
    {
      $group: {
        _id: '$projectId',
        maxPressure: { $max: '$maxAllowablePressure_psi' },
      },
    },
  ]);
  const wellPressure = new Map(wellAgg.map((row) => [String(row._id), Number(row.maxPressure ?? 0)]));

  const latestAgg = await CcusInjection.aggregate([
    { $match: { projectId: { $in: projectIds } } },
    { $sort: { projectId: 1, date: -1 } },
    {
      $group: {
        _id: '$projectId',
        latestDate: { $first: '$date' },
      },
    },
  ]);
  const latestByProject = new Map(latestAgg.map((row) => [String(row._id), row.latestDate]));

  const rolling = await CcusInjection.aggregate([
    { $match: { projectId: { $in: projectIds } } },
    {
      $project: {
        projectId: 1,
        date: 1,
        volume_tCO2: 1,
        maxSurfacePressure_psi: 1,
      },
    },
  ]);

  const volumeMap = new Map();
  const pressureMap = new Map();

  rolling.forEach((row) => {
    const key = String(row.projectId);
    const latest = latestByProject.get(key);
    if (!latest) return;
    const windowStart = new Date(latest.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (row.date < windowStart || row.date > latest) return;

    const volAccum = volumeMap.get(key) || 0;
    volumeMap.set(key, volAccum + Number(row.volume_tCO2 || 0));

    const currentPressure = pressureMap.get(key) || 0;
    const rowPressure = Number(row.maxSurfacePressure_psi || 0);
    if (rowPressure > currentPressure) pressureMap.set(key, rowPressure);
  });

  const normalized = projects.map((p) => {
    const key = String(p._id);
    const vol30 = Number(p?.meta?.kpi?.vol30_tCO2 ?? volumeMap.get(key) ?? 0);
    const maxPressure = Number(
      p?.meta?.kpi?.maxP30_psi ??
      pressureMap.get(key) ??
      wellPressure.get(key) ??
      0
    );
    const risk = Number(
      p?.meta?.risk ??
      p?.meta?.kpi?.risk ??
      computeRiskScore({ monthVolume_tCO2: vol30, maxSurfacePressure_psi: maxPressure, geologyTags: p.geologyTags }) ??
      0
    );

    const kpi = {
      vol30_tCO2: vol30,
      maxP30_psi: maxPressure,
      risk,
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

/* ========= helpers ========= */



/* ========== utilities ========== */

function normalizeKey(k = '') {
  const s = String(k).replace(/\s+/g, ' ').trim().toUpperCase();
  if (!s) return s;

  // Robust aliases to handle truncated FLIGHT headers
  if (s.startsWith('REPORTIN')) return 'REPORTING YEAR';
  if (s === 'YEAR') return 'REPORTING YEAR';

  if (s === 'FACILITY N' || s.startsWith('FACILITY')) return 'FACILITY NAME';
  if (s.startsWith('GHGRP')) return 'GHGRP ID';
  if (s.startsWith('REPORTED')) return 'REPORTED ADDRESS';
  if (s === 'ADDRESS') return 'REPORTED ADDRESS';
  if (s.startsWith('LATITUDE')) return 'LATITUDE';
  if (s.startsWith('LONGITUDE')) return 'LONGITUDE';
  if (s.startsWith('CITY')) return 'CITY NAME';
  if (s.startsWith('COUNTY')) return 'COUNTY NAME';
  if (s === 'STATE') return 'STATE';
  if (s.startsWith('ZIP')) return 'ZIP CODE';
  if (s.startsWith('PARENT')) return 'PARENT COMPANIES';
  if (s.startsWith('SUBPART')) return 'SUBPARTS';
  if (s === 'GHG QUAN' || s.includes('GHG QUANTITY')) {
    return 'GHG QUANTITY (METRIC TONS CO2E)';
  }
  if (s.includes('TOTAL EMISSIONS')) return 'TOTAL EMISSIONS (METRIC TONS CO2E)';
  return s;
}

function toNum(v) {
  if (v === null || v === undefined) return NaN;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Turn a worksheet into rows of plain objects, even when the real headers
 * are not in row 1. We detect the header row heuristically.
 */
function sheetToObjectsSmart(ws) {
  // Get a 2D array (each row is an array of cell values)
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!rows.length) return [];

  // Heuristic: pick the row that looks like headers
  // Score each row by presence of expected keywords.
  const want = ['REPORT', 'FACILITY', 'STATE', 'GHG', 'SUBPART', 'CITY', 'COUNTY'];
  let headerIdx = -1;
  let bestScore = -1;

  rows.forEach((row, idx) => {
    const upperCells = row.map((c) => String(c).toUpperCase());
    const score = want.reduce(
      (acc, kw) => acc + (upperCells.some((s) => s.includes(kw)) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      headerIdx = idx;
    }
  });

  if (headerIdx < 0) return [];

  // Build normalized headers
  const rawHeaders = rows[headerIdx].map((h) => normalizeKey(h));
  const headers = rawHeaders.map((h, i) => h || `COL_${i}`);

  // All subsequent rows are data
  const dataRows = rows.slice(headerIdx + 1);

  // Convert to objects
  const out = [];
  for (const r of dataRows) {
    // stop at blank rows
    const allBlank = r.every((v) => String(v).trim() === '');
    if (allBlank) continue;

    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = r[i];
    });
    out.push(obj);
  }
  return out;
}

/* ========== mapping ========== */

function mapRowToDoc(row) {
  // Normalize keys again in case the sheet headers were imperfect
  const upper = {};
  for (const [k, v] of Object.entries(row)) upper[normalizeKey(k)] = v;

  const year =
    toNum(upper['REPORTING YEAR']) ||
    toNum(upper['YEAR']);

  const ghgQuantity =
    toNum(upper['GHG QUANTITY (METRIC TONS CO2E)']) ||
    toNum(upper['GHG QUANTITY']) ||
    toNum(upper['TOTAL EMISSIONS (METRIC TONS CO2E)']);

  const state = String(upper['STATE'] || '').toUpperCase();

  if (!year || !state || !Number.isFinite(ghgQuantity)) return null;

  const subpartsRaw = upper['SUBPARTS'] || upper['SUBPART'] || '';
  const subparts = String(subpartsRaw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    year,
    facilityName: upper['FACILITY NAME'] || upper['FACILITY'] || '',
    ghgrpId: upper['GHGRP ID'] || upper['GHGRPID'] || upper['FACILITY ID'] || '',
    address: upper['REPORTED ADDRESS'] || upper['ADDRESS'] || '',
    latitude: toNum(upper['LATITUDE']),
    longitude: toNum(upper['LONGITUDE']),
    city: upper['CITY NAME'] || upper['CITY'] || '',
    county: upper['COUNTY NAME'] || upper['COUNTY'] || '',
    state,
    zipCode: upper['ZIP CODE'] || upper['ZIP'] || '',
    parentCompanies: upper['PARENT COMPANIES'] || upper['PARENT COMPANY'] || '',
    ghgQuantity,
    subparts,
  };
}

/* ========== IO layer ========== */

function loadRecordsFromRequest(req) {
  const filePath = (req.body?.filePath || req.query?.filePath || '').trim();

  // Path-based read (good for /mnt/data/louisiana1.xls)
  if (filePath) {
    const lower = filePath.toLowerCase();
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      const wb = xlsx.readFile(filePath);
      const first = wb.SheetNames?.[0];
      if (!first) throw new Error('Excel workbook has no sheets');
      return sheetToObjectsSmart(wb.Sheets[first]);
    }

    if (lower.endsWith('.csv')) {
      const csvText = fs.readFileSync(filePath, 'utf8');
      // Try direct CSV first
      const records = parseCsv(csvText, { columns: true, skip_empty_lines: true, trim: true });
      if (records?.length) return records;
      // Fallback: parse as 2D, then detect header
      const wb = xlsx.read(csvText, { type: 'string' });
      const first = wb.SheetNames?.[0];
      return sheetToObjectsSmart(wb.Sheets[first]);
    }

    throw new Error('Unsupported file extension. Use .xls, .xlsx, or .csv');
  }

  // Multipart upload
  if (!req.file) throw new Error('No file provided. Use multipart upload or pass filePath param.');
  const name = (req.file.originalname || '').toLowerCase();

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
    const first = wb.SheetNames?.[0];
    if (!first) throw new Error('Excel workbook has no sheets');
    return sheetToObjectsSmart(wb.Sheets[first]);
  }

  // CSV upload
  const text = req.file.buffer.toString('utf-8');
  const records = parseCsv(text, { columns: true, skip_empty_lines: true, trim: true });
  if (records?.length) return records;
  const wb = xlsx.read(text, { type: 'string' });
  const first = wb.SheetNames?.[0];
  return sheetToObjectsSmart(wb.Sheets[first]);
}

/* ========== controllers ========== */

export async function importStateEmissions(req, res) {
  try {
    const rawRows = loadRecordsFromRequest(req);
    if (!rawRows || !rawRows.length) {
      return res.status(400).json({ error: 'Provided file has no rows' });
    }

    const docs = [];
    for (const row of rawRows) {
      const doc = mapRowToDoc(row);
      if (doc) docs.push(doc);
    }

    if (!docs.length) {
      return res
        .status(400)
        .json({ error: 'No usable rows found (missing year/state/quantity)' });
    }

    const operations = docs.map((doc) => ({
      updateOne: {
        filter: {
          state: doc.state,
          year: doc.year,
          ghgrpId: doc.ghgrpId || null,
          facilityName: doc.facilityName,
        },
        update: { $set: doc },
        upsert: true,
      },
    }));

    const writeResult = await StateEmission.bulkWrite(operations, { ordered: false });
    return res.json({
      ok: true,
        upserted: writeResult.upsertedCount ?? 0,
        modified: writeResult.modifiedCount ?? 0,
    });
  } catch (err) {
    console.error('State emission import failed', err);
    return res.status(500).json({ error: err.message || 'Import failed' });
  }
}

export async function stateEmissionMeta(_req, res) {
  const agg = await StateEmission.aggregate([
    { $group: { _id: '$state', years: { $addToSet: '$year' } } },
    { $project: { _id: 0, state: '$_id', years: '$years' } },
    { $sort: { state: 1 } },
  ]);
  const states = agg.map((e) => ({
    state: e.state,
    years: (e.years || []).sort((a, b) => a - b),
  }));
  res.json({ states });
}

export async function stateEmissionSummary(req, res) {
  const state = (req.query.state || '').toUpperCase().trim();
  if (!state) return res.status(400).json({ error: 'state query parameter is required' });
  const year = req.query.year ? Number(req.query.year) : null;

  const match = { state };
  if (year) match.year = year;

  const docs = await StateEmission.find(match).lean().sort({ ghgQuantity: -1 });
  if (!docs.length) return res.json({ state, year, sectors: [], facilities: [], total: 0 });

  let total = 0;
  const sectorTotals = new Map();

  for (const doc of docs) {
    total += doc.ghgQuantity || 0;
    const parts = (doc.subparts && doc.subparts.length) ? doc.subparts : ['Other'];
    const share = (doc.ghgQuantity || 0) / parts.length;
    for (const part of parts) {
      const key = part || 'Other';
      sectorTotals.set(key, (sectorTotals.get(key) || 0) + share);
    }
  }

  const sectors = [...sectorTotals.entries()]
    .map(([sector, ghgQuantity]) => ({
      sector,
      sectorLabel: subpartLabels[sector] || sector,
      ghgQuantity,
    }))
    .sort((a, b) => b.ghgQuantity - a.ghgQuantity);

  res.json({ state, year, total, sectors, facilities: docs });
}

export async function stateEmissionTotals(req, res) {
  const fromQ = req.query.from ? Number(req.query.from) : null;
  const toQ = req.query.to ? Number(req.query.to) : null;
  const limit = req.query.limit != null ? Number(req.query.limit) : null;

  const agg = await StateEmission.aggregate([
    {
      $group: {
        _id: { state: '$state', year: '$year' },
        total: { $sum: '$ghgQuantity' },
      },
    },
    { $sort: { '_id.year': 1 } },
  ]);

  if (!agg.length) {
    return res.json({ from: fromQ, to: toQ, years: [], states: [] });
  }

  const maxYear = agg.reduce((max, row) => Math.max(max, row._id.year), -Infinity);
  const minYear = agg.reduce((min, row) => Math.min(min, row._id.year), Infinity);

  const from = Number.isFinite(fromQ) ? fromQ : Math.max(maxYear - 4, minYear);
  const to = Number.isFinite(toQ) ? toQ : maxYear;

  const filtered = agg.filter(
    (row) => row._id.year >= from && row._id.year <= to
  );

  const stateSeries = new Map();
  filtered.forEach((row) => {
    const state = row._id.state;
    if (!stateSeries.has(state)) stateSeries.set(state, []);
    stateSeries.get(state).push({ year: row._id.year, total: row.total });
  });

  stateSeries.forEach((arr) => arr.sort((a, b) => a.year - b.year));

  const ranking = [];
  stateSeries.forEach((series, state) => {
    const latestPoint =
      series.find((pt) => pt.year === to) ?? series[series.length - 1];
    ranking.push({ state, value: latestPoint?.total ?? 0 });
  });
  ranking.sort((a, b) => b.value - a.value);

  const sliceCount = limit && limit > 0 ? limit : ranking.length;
  const selectedStates = ranking
    .slice(0, sliceCount)
    .map((entry) => entry.state);

  const yearSet = new Set();
  selectedStates.forEach((state) => {
    stateSeries.get(state)?.forEach((pt) => yearSet.add(pt.year));
  });
  const years = [...yearSet].sort((a, b) => a - b);

  const states = selectedStates.map((state) => ({
    state,
    totals: stateSeries.get(state) ?? [],
  }));

  res.json({
    from,
    to,
    years,
    states,
  });
}
