// src/utils/format.ts
export const fmtInt = (n) =>
  typeof n === 'number' ? Math.round(n).toLocaleString() : '—';
