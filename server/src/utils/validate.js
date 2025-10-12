export function validateRow(r) {
  const errors = [];
  if (!r.facility_name || !r.facility_name.trim()) errors.push('facility_name required');
  if (!Number.isFinite(r.year)) errors.push('year must be a number');
  if (!Number.isFinite(r.co2e_tonnes)) errors.push('co2e_tonnes must be a number');

  if (r.year < 2000 || r.year > 2100) errors.push('year out of range (2000–2100)');
  if (r.month != null) {
    if (!Number.isInteger(r.month) || r.month < 1 || r.month > 12) errors.push('month must be 1–12');
  }
  if (r.co2e_tonnes < 0) errors.push('co2e_tonnes cannot be negative');
  if (r.scope != null && ![1,2,3].includes(Number(r.scope))) errors.push('scope must be 1,2,3');

  return errors;
}
