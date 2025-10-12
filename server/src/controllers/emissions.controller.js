import crypto from 'crypto';
import { parse } from 'csv-parse';
import { z } from 'zod';

import EmissionsObservation from '../models/EmissionsObservation.js';
import Facility from '../models/Facility.js';
import Sector from '../models/Sector.js';
import Dataset from '../models/Dataset.js';
import ImportJob from '../models/ImportJob.js';
import { validateRow } from '../utils/validate.js';
import { chatJSON } from '../lib/openai.js';

const RowSchema = z.object({
  facility_name: z.string(),
  year: z.coerce.number().int(),
  month: z.coerce.number().int().nullable().optional(),
  co2e_tonnes: z.coerce.number(),
  scope: z.coerce.number().int().nullable().optional(),
  source: z.enum(['observed','reported','projected']),
  method: z.string().nullable().optional(),
  dataset_version: z.string().nullable().optional()
});

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const mapRecord = (rec, mapping) => {
  const out = {};
  for (const [raw, key] of Object.entries(mapping || {})) {
    if (!key) continue;
    out[key] = rec[raw];
  }
  return out;
};

const inferHeaderMap = async (headers) => {
  const sys =
    "You map messy CSV column names to schema keys: facility_name, year, month, co2e_tonnes, scope, source, method, dataset_version. Return JSON {mapping:{inputHeader:schemaKey|null}, notes}";
  const out = await chatJSON(sys, `Headers:\n${JSON.stringify(headers)}`);
  return out.mapping || {};
};

const findFacilityByName = (name) => (name ? Facility.findOne({ name }) : null);

export const uploadFull = async (req, res) => {
  const { datasetName, source, versionTag } = req.body;

  if (!datasetName || !source) {
    return res.status(400).json({ error: 'datasetName and source are required' });
  }
  if (!req.file?.buffer?.length) {
    return res.status(400).json({ error: 'CSV file is required' });
  }

  // 1) dataset + import job (lineage)
  let dataset = await Dataset.findOne({ name: datasetName, source, versionTag: versionTag || null });
  if (!dataset) dataset = await Dataset.create({ name: datasetName, source, versionTag: versionTag || null });

  const job = await ImportJob.create({
    datasetId: dataset._id,
    filename: req.file.originalname,
    checksumSha256: sha256(req.file.buffer),
    status: 'pending'
  });

  // 2) parse CSV (rows in memory; for big files, stream insert)
  const parser = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true });
  const rawRows = [];
  for await (const record of parser) rawRows.push(record);
  if (rawRows.length === 0) {
    job.status = 'failed';
    job.errors.push({ row: 0, reason: 'empty file' });
    await job.save();
    return res.status(400).json({ error: 'Empty CSV' });
  }

  // 3) header map (from client or AI)
  let headerMap = null;
  if (req.body.headerMap) {
    try { headerMap = JSON.parse(req.body.headerMap); } catch {}
  }
  if (!headerMap) {
    const headers = Object.keys(rawRows[0]);
    headerMap = await inferHeaderMap(headers);
    job.headerMap = headerMap;
    await job.save();
  }

  // 4) import loop
  let rowsTotal = 0, rowsImported = 0, rowsSkipped = 0, duplicates = 0, invalid = 0;
  const errors = [];
  const defaultSector = await Sector.findOne({ code: 'energy' });

  for (const rec of rawRows) {
    rowsTotal++;

    // map + coerce
    const mapped = mapRecord(rec, headerMap);
    if (mapped.year != null) mapped.year = Number(mapped.year);
    if (mapped.month != null && mapped.month !== '') mapped.month = Number(mapped.month); else mapped.month = undefined;
    if (mapped.co2e_tonnes != null) mapped.co2e_tonnes = Number(mapped.co2e_tonnes);
    if (mapped.scope != null && mapped.scope !== '') mapped.scope = Number(mapped.scope);
    mapped.source = mapped.source || (source === 'climate_trace' ? 'observed' : 'reported');

    // zod + business validation
    const zres = RowSchema.safeParse(mapped);
    if (!zres.success) {
      invalid++;
      errors.push({ row: rowsTotal, reason: 'schema', details: zres.error.errors });
      continue;
    }
    const row = zres.data;
    const vErrors = validateRow(row);
    if (vErrors.length) {
      invalid++;
      errors.push({ row: rowsTotal, reason: 'validation', details: vErrors });
      continue;
    }

    // facility (MVP: skip unknowns; toggle to auto-create if desired)
    let facility = await findFacilityByName(row.facility_name);
    if (!facility) {
      // Uncomment to auto-create:
      // facility = await Facility.create({ name: row.facility_name, sectorId: defaultSector?._id });
      rowsSkipped++;
      errors.push({ row: rowsTotal, reason: 'facility_not_found', details: row.facility_name });
      continue;
    }

    // duplicates (facility+year(+month)+source)
    const dupQ = { facilityId: facility._id, year: row.year, source: row.source };
    if (row.month != null) dupQ.month = row.month;
    const existing = await EmissionsObservation.findOne(dupQ).lean();
    if (existing) {
      duplicates++;
      errors.push({ row: rowsTotal, reason: 'duplicate', details: dupQ });
      continue;
    }

    // insert
    await EmissionsObservation.create({
      facilityId: facility._id,
      year: row.year,
      month: row.month ?? undefined,
      co2eTonnes: row.co2e_tonnes,
      scope: row.scope ?? 1,
      source: row.source,
      method: row.method || (source === 'climate_trace' ? 'climate_trace' : undefined),
      datasetVersion: row.dataset_version || (versionTag || null)
    });

    rowsImported++;
  }

  // 5) finalize import job
  job.stats = { rowsTotal, rowsImported, rowsSkipped, duplicates, invalid };
  job.status = 'completed';
  job.errors = errors.slice(0, 500);
  await job.save();

  return res.json({ datasetId: dataset._id, importJobId: job._id, ...job.stats, errors: job.errors });
};
