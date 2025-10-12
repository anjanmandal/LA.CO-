// Very simple signal: normalize volume/pressure + geology tags → 0..100
export function computeRiskScore({ monthVolume_tCO2, maxSurfacePressure_psi, geologyTags = [] }) {
  const v = Math.min(monthVolume_tCO2 / 200000, 1);     // 200k tCO2/mo ~ high
  const p = Math.min(maxSurfacePressure_psi / 2500, 1); // 2.5k psi ~ high
  let g = 0.4; // neutral
  const text = (geologyTags || []).join(' ').toLowerCase();
  if (text.includes('caprock:shale') || text.includes('caprock shale')) g -= 0.1;
  if (text.includes('fault') || text.includes('karst') || text.includes('thin caprock')) g += 0.2;
  g = Math.max(0, Math.min(g, 1));
  const raw = 100 * (0.45 * v + 0.45 * p + 0.10 * g);
  return Math.round(raw);
}
