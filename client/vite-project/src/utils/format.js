// src/utils/format.ts
export const fmtInt = (n) =>
  typeof n === 'number' ? Math.round(n).toLocaleString() : '—';

export const fmtDateTime = (value) => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const fmtPercent = (value, digits = 1, { showSign = true } = {}) => {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return '—';
  const sign = value > 0 && showSign ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
};
