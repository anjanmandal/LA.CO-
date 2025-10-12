// Returns { slug, confidence, original }
const CANONICAL = [
  'agriculture',
  'buildings',
  'fluorinated_gases',
  'forestry_and_land_use',
  'fossil_fuel_operations',
  'manufacturing',
  'mineral_extraction',
  'power',
  'transport',
  'waste'
];

const ALIASES = {
  'fluorinated gases': 'fluorinated_gases',
  'fluorinated-gases': 'fluorinated_gases',
  'f-gases': 'fluorinated_gases',

  'forestry and land use': 'forestry_and_land_use',
  'forestry&landuse': 'forestry_and_land_use',
  'forestry land use': 'forestry_and_land_use',

  'oil and gas': 'fossil_fuel_operations',
  'oil & gas': 'fossil_fuel_operations',
  'fossil fuel operations': 'fossil_fuel_operations',
  'fossil_fuel_operations': 'fossil_fuel_operations',

  'mineral extraction': 'mineral_extraction',
  'mineral-extraction': 'mineral_extraction',
  'mineral extractiong': 'mineral_extraction',

  'transportation': 'transport',
  'transportatn': 'transport',
  'transportn': 'transport'
};

function normKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[_\-]+/g, ' ')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lev(a, b) {
  a = a || ''; b = b || '';
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

export function normalizeSector(input) {
  const original = String(input || '');
  const key = normKey(original);

  if (ALIASES[key]) return { slug: ALIASES[key], confidence: 1.0, original };

  const underscored = key.replace(/ /g, '_');
  if (CANONICAL.includes(underscored)) {
    return { slug: underscored, confidence: 1.0, original };
  }

  let best = { slug: null, dist: Infinity };
  for (const c of CANONICAL) {
    const d = lev(underscored, c);
    if (d < best.dist) best = { slug: c, dist: d };
  }
  const maxLen = Math.max(underscored.length, best.slug?.length || 0) || 1;
  const threshold = Math.min(3, Math.ceil(maxLen * 0.25));
  if (best.dist <= threshold) {
    const confidence = Math.max(0.6, 1 - best.dist / maxLen);
    return { slug: best.slug, confidence, original };
  }

  return { slug: null, confidence: 0, original };
}
