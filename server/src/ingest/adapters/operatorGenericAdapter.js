import Facility from '../../models/Facility.js';
import EmissionsObservation from '../../models/EmissionsObservation.js';

export const operatorGenericAdapter = {
  key: 'operator_generic',

  detect(headers) {
    const h = new Set(headers.map(x => x.toLowerCase()));
    return h.has('facility_name') && h.has('year') && (h.has('co2e_tonnes') || h.has('co2e'));
  },

  validate(row) {
    const name = (row.facility_name || '').trim();
    const year = Number(row.year);
    const month = row.month != null && row.month !== '' ? Number(row.month) : undefined;
    const tonnes = Number(row.co2e_tonnes ?? row.co2e);
    const source = (row.source || 'reported').toLowerCase();

    if (!name) return { ok:false, reason:'missing_facility_name' };
    if (!Number.isFinite(year)) return { ok:false, reason:'bad_year' };
    if (month != null && (!Number.isInteger(month) || month < 1 || month > 12)) return { ok:false, reason:'bad_month' };
    if (!Number.isFinite(tonnes)) return { ok:false, reason:'bad_tonnes' };
    if (!['observed','reported','projected'].includes(source)) return { ok:false, reason:'bad_source' };

    return { ok:true, name, year, month, tonnes, source };
  },

  async upsert({ row, name, year, month, tonnes, source, datasetVersion, duplicatePolicy }) {
    const fac = await Facility.findOne({ name });
    if (!fac) return { action: 'skip_unknown_facility' };

    const q = { facilityId: fac._id, year, source };
    if (month != null) q.month = month;

    const existing = await EmissionsObservation.findOne(q);
    if (existing) {
      if (duplicatePolicy === 'replace_if_newer') {
        const oldV = existing.datasetVersion || '';
        if (String(datasetVersion) > String(oldV)) {
          existing.co2eTonnes = tonnes;
          existing.datasetVersion = datasetVersion;
          existing.method = row.method || existing.method;
          existing.scope = row.scope != null ? Number(row.scope) : existing.scope;
          await existing.save();
          return { action: 'replaced' };
        }
      }
      return { action: 'duplicate' };
    }

    await EmissionsObservation.create({
      facilityId: fac._id,
      year,
      month,
      co2eTonnes: tonnes,
      scope: row.scope != null ? Number(row.scope) : 1,
      source,
      method: row.method || undefined,
      datasetVersion
    });
    return { action: 'inserted' };
  }
};
