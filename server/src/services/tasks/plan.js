// Import rrule from CJS in an ESM project
import pkg from 'rrule';
const { RRule } = pkg;

import RegRequirement from '../../models/RegRequirement.js';
import ComplianceTask from '../../models/ComplianceTask.js';
import { resolveOrgId } from './orgResolver.js';

// --------- America/Chicago DST helpers (no extra libs) ---------
function nthSundayOfMonth(year, monthIndex /* 0-11 */, n /* 1..5 */) {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const day = first.getUTCDay();               // 0=Sun
  const offset = (7 - day) % 7;                // days to first Sunday
  const date = 1 + offset + (n - 1) * 7;
  return new Date(Date.UTC(year, monthIndex, date)); // 00:00 UTC
}
function isChicagoDST(y, m /*1-12*/, d) {
  const dstStart = nthSundayOfMonth(y, 2, 2);  // 2nd Sunday in March
  const dstEnd   = nthSundayOfMonth(y, 10, 1); // 1st Sunday in November
  const target = new Date(Date.UTC(y, m - 1, d));
  return target >= dstStart && target < dstEnd;
}
function chicagoLocalToUTC(y, m /*1-12*/, d, hh, mm) {
  const offsetHours = isChicagoDST(y, m, d) ? 5 : 6; // CDT=UTC-5, CST=UTC-6
  return new Date(Date.UTC(y, m - 1, d, hh + offsetHours, mm, 0, 0));
}
// ---------------------------------------------------------------

export async function generateTasks({ orgId: orgRef, sector, windowStart, windowEnd, owner }) {
  // convert "demo-org" (or name/_id) → ObjectId
  const orgId = await resolveOrgId(orgRef);

  const reqs = await RegRequirement.find({
    $or: [{ sector }, { sector: null }, { sector: undefined }]
  }).lean();

  let created = 0, skipped = 0;
  for (const r of reqs) {
    const rule = RRule.fromString(r.rrule);
    const occurrences = rule.between(windowStart, windowEnd, true); // inclusive

    for (const occ of occurrences) {
      const [hh, mm] = String(r.dueTimeLocal || '17:00').split(':').map(Number);
      const y = occ.getUTCFullYear();
      const m = occ.getUTCMonth() + 1;
      const d = occ.getUTCDate();
      const dueAt = chicagoLocalToUTC(y, m, d, hh, mm);

      const exists = await ComplianceTask.findOne({ orgId, requirementId: r._id, dueAt });
      if (exists) { skipped++; continue; }

      await ComplianceTask.create({
        orgId,
        requirementId: r._id,
        title: r.title,
        owner: owner || null,
        dueAt,
        status: 'open',
        generatedBy: 'engine',
        audit: [{ action: 'created', actor: 'engine', meta: { requirement: r.code } }]
      });
      created++;
    }
  }

  return { created, skipped };
}
