import crypto from 'crypto';
import { parse } from 'csv-parse';
import Dataset from '../models/Dataset.js';
import ImportJob from '../models/ImportJob.js';
import { detectAdapter } from '../ingest/adapters/index.js';
import { toTonnes as traceToTonnes, makeKey as traceMakeKey } from '../ingest/adapters/traceSectorAdapter.js';

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

async function parseCsv(buffer, maxRows = 1000) {
  const parser = parse(buffer, { columns: true, skip_empty_lines: true, trim: true });
  const rows = [];
  for await (const record of parser) {
    rows.push(record);
    if (rows.length >= maxRows) break;
  }
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

// POST /api/ingest/preview
export const preview = async (req, res) => {
  if (!req.file?.buffer?.length) return res.status(400).json({ error: 'CSV file is required' });

  const { headers, rows } = await parseCsv(req.file.buffer, 200);
  if (!rows.length) return res.status(400).json({ error: 'Empty CSV' });

  const adapter = detectAdapter(headers);
  const problems = [];
  let ok = 0;
  const sampleNormalized = [];

  for (let i = 0; i < Math.min(rows.length, 50); i++) {
    const r = rows[i];
    const v = adapter.validate(r);
    if (!v.ok) problems.push({ row: i+1, reason: v.reason, meta: v.meta || undefined });
    else { ok++; sampleNormalized.push({ input: r, normalized: v }); }
  }

  res.json({
    adapter: adapter.key,
    headers,
    sampleNormalized,
    previewStats: { checked: Math.min(rows.length, 50), ok, problems }
  });
};

// POST /api/ingest/commit
export const commit = async (req, res) => {
  if (!req.file?.buffer?.length) return res.status(400).json({ error: 'CSV file is required' });
  const datasetVersion = req.body.datasetVersion || 'v4.7.0';
  const duplicatePolicy = req.body.duplicatePolicy || 'replace_if_newer';

  const { headers, rows } = await parseCsv(req.file.buffer, Number.MAX_SAFE_INTEGER);
  if (!rows.length) return res.status(400).json({ error: 'Empty CSV' });

  const adapter = detectAdapter(headers);

  // lineage
  const dsName = req.body.datasetName || (adapter.key === 'trace_sector' ? 'Climate TRACE Sector' : 'Operator Upload');
  const source = adapter.key === 'trace_sector' ? 'climate_trace' : (req.body.source || 'operator');

  let dataset = await Dataset.findOne({ name: dsName, source, versionTag: datasetVersion });
  if (!dataset) dataset = await Dataset.create({ name: dsName, source, versionTag: datasetVersion });

  const job = await ImportJob.create({
    datasetId: dataset._id,
    filename: req.file.originalname,
    checksumSha256: sha256(req.file.buffer),
    status: 'pending'
  });

  let rowsTotal = 0, inserted = 0, replaced = 0, duplicates = 0, invalid = 0, skipped = 0;
  const errors = [];
  const valids = []; // keep validated rows (and their normalized values)

  // -------- Pass 1: Validate everything --------
  for (const r of rows) {
    rowsTotal++;
    try {
      const v = adapter.validate(r);
      if (!v.ok) { invalid++; errors.push({ row: rowsTotal, reason: v.reason, meta: v.meta || undefined }); continue; }
      valids.push({ row: r, v });
    } catch (e) {
      invalid++; errors.push({ row: rowsTotal, reason: 'exception', details: String(e.message || e) });
    }
  }

  // -------- Pass 2: Insert / Replace --------
  if (adapter.key === 'trace_sector') {
    // Pre-aggregate across countries: sum to tonnes per (sectorSlug, subsector, year)
    const buckets = new Map();
    for (const { row, v } of valids) {
      const units = row.emissions_quantity_units || 'tonnes_co2e';
      const qtyTonnes = traceToTonnes(v.qty, units);
      const key = traceMakeKey(v.sectorSlug, v.subsector, v.year);
      const b = buckets.get(key) || { sum: 0, row, v };  // keep a representative row for meta
      b.sum += qtyTonnes;
      buckets.set(key, b);
    }

    for (const { sum, row, v } of buckets.values()) {
      const result = await adapter.upsert({
        row,
        ...v,
        qtyTonnesOverride: sum,      // <-- aggregated value
        datasetVersion,
        duplicatePolicy
      });
      if (result.action === 'inserted') inserted++;
      else if (result.action === 'replaced') replaced++;
      else if (result.action === 'duplicate') duplicates++;
      else if (result.action === 'skip_unknown_facility') skipped++;
    }

  } else {
    // Non-TRACE path: per-row upsert
    for (const { row, v } of valids) {
      const result = await adapter.upsert({
        row,
        ...v,
        datasetVersion,
        duplicatePolicy
      });
      if (result.action === 'inserted') inserted++;
      else if (result.action === 'replaced') replaced++;
      else if (result.action === 'duplicate') duplicates++;
      else if (result.action === 'skip_unknown_facility') skipped++;
    }
  }

  // finalize job (unchanged)
  job.status = 'completed';
  job.stats = { rowsTotal, rowsImported: inserted + replaced, rowsSkipped: skipped, duplicates, invalid };
  job.errors = errors.slice(0, 500);
  await job.save();

  res.json({
    datasetId: dataset._id,
    importJobId: job._id,
    adapter: adapter.key,
    duplicatePolicy,
    rowsTotal,
    inserted,
    replaced,
    duplicates,
    skipped,
    invalid,
    errors: job.errors
  });
};
