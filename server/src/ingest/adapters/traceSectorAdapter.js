// TRACE sector adapter → TRACE CSV rows → synthetic facilities + observed yearly rows
import Sector from '../../models/Sector.js';
import Facility from '../../models/Facility.js';
import EmissionsObservation from '../../models/EmissionsObservation.js';
import { normalizeSector } from '../normalizeSector.js';

const toYear = (s) => { const m = String(s || '').match(/^(\d{4})/); return m ? Number(m[1]) : null; };

const normalizeUnitsToTonnes = (qty, units) => {
  const u = (units || '').toLowerCase();
  if (!u || u==='tco2e' || u==='tonnes_co2e' || u==='tonnes') return qty;
  if (u==='ktco2e') return qty * 1_000;
  if (u==='mtco2e') return qty * 1_000_000;
  throw new Error(`Unsupported unit: ${units}`);
};
export const toTonnes = (qty, units) => normalizeUnitsToTonnes(qty, units);
export const makeKey = (sectorSlug, subsector, year) =>
  `${sectorSlug}|${subsector || ''}|${year}`;

const synthFacilityName = ({ sector, subsector }) =>
  `${sector}${subsector ? ` ${subsector}` : ''} (TRACE aggregate)`;

export const traceSectorAdapter = {
  key: 'trace_sector',

  detect(headers) {
    const h = new Set(headers.map(x => x.toLowerCase()));
    return h.has('iso3_country') && h.has('start_time') && h.has('emissions_quantity');
  },

validate(row) {
  const { slug: sectorSlug, confidence } = normalizeSector(row.sector);
  if (!sectorSlug || confidence < 0.7) {
    return { ok:false, reason:'unrecognized_sector', meta:{ rawSector: row.sector, confidence } };
  }

  const subsector = ((row.subsector || '') || null)?.toString().trim() || null;
  const year = toYear(row.start_time || row.start || row.year);
  if (year == null) return { ok:false, reason:'bad_year' };

  // ---- granularity normalization
  const rawGran = (row.temporal_granularity || 'annual').toString().trim().toLowerCase();
  const granMap = {
    'annual':'annual','year':'annual','yr':'annual','y':'annual',
    'monthly':'monthly','month':'monthly','mo':'monthly','m':'monthly'
  };
  const gran = granMap[rawGran];
  if (!gran) return { ok:false, reason:'unsupported_granularity', meta:{ gran: rawGran } };

  // quantity checks
  const qtyRaw = row.emissions_quantity;
  if (qtyRaw == null || qtyRaw === '') return { ok:false, reason:'missing_quantity' };
  const qty = Number(qtyRaw);
  if (!Number.isFinite(qty)) return { ok:false, reason:'non_numeric_quantity' };

  // if monthly, extract month 1..12 from start_time
  let month = undefined;
  if (gran === 'monthly') {
    const m = String(row.start_time || '').match(/^\d{4}-(\d{2})/);
    month = m ? Number(m[1]) : undefined;
    if (!month || month < 1 || month > 12) return { ok:false, reason:'bad_month' };
  }

  return {
    ok:true,
    sectorSlug, subsector, year, month, gran, qty,
    _meta: { original_sector: row.sector, sector_confidence: confidence }
  };
}

,

  async upsert({
    row,
    sectorSlug,
    subsector,
    year,
    qty,
    qtyTonnesOverride,   // <--- important
    datasetVersion,
    duplicatePolicy,
    _meta
  }) {
    const units = row.emissions_quantity_units || 'tonnes_co2e';
    const tonnes = (qtyTonnesOverride != null)
      ? qtyTonnesOverride
      : normalizeUnitsToTonnes(qty, units);

    // Ensure Sector doc exists (optional but keeps FK clean)
    const sectorDoc = await Sector.findOneAndUpdate(
      { code: sectorSlug },
      { $setOnInsert: { code: sectorSlug, name: sectorSlug.replace(/_/g, ' ') } },
      { upsert: true, new: true }
    ).lean();

    // One synthetic facility per (sector, subsector)
    const name = synthFacilityName({ sector: sectorSlug, subsector });
    let fac = await Facility.findOne({ name }).lean();
    if (!fac) {
      fac = await Facility.create({
        name,
        sectorId: sectorDoc?._id || undefined,
        meta: {
          kind: 'trace_sector_aggregate',
          sector: sectorSlug,
          subsector,
          trace_origin: {
            original_sector: _meta?.original_sector ?? null,
            sector_confidence: _meta?.sector_confidence ?? null,
            example_iso3: row.iso3_country || null
          },
          units_seen: units
        }
      });
    }

    // Duplicate policy
    const existing = await EmissionsObservation.findOne({ facilityId: fac._id, year, source: 'observed' });
    if (existing) {
      if (duplicatePolicy === 'replace_if_newer') {
        const oldV = existing.datasetVersion || '';
        if (String(datasetVersion) > String(oldV)) {
          existing.co2eTonnes = tonnes;
          existing.method = 'climate_trace_sector';
          existing.datasetVersion = datasetVersion;
          await existing.save();
          return { action: 'replaced' };
        }
      }
      return { action: 'duplicate' };
    }

    await EmissionsObservation.create({
      facilityId: fac._id,
      year,
      co2eTonnes: tonnes,
      scope: 1,
      source: 'observed',
      method: 'climate_trace_sector',
      datasetVersion
    });

    return { action: 'inserted' };
  }
};