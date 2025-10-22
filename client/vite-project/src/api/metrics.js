// web/src/api/metrics.js
const BASE = import.meta.env.VITE_API_BASE_URL || '/api';
import {http} from './http'; // axios instance

export async function getOverview({ from=2015, to=2025 } = {}) {
  const r = await fetch(`${BASE}/metrics/overview?from=${from}&to=${to}`, { credentials: 'include' });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'overview failed');
  return d; // { from, to, series: {sector:[{year,value}]}, years: [...] }
}

export async function getFacilityTrend(id) {
  const r = await fetch(`${BASE}/metrics/facility/${id}/trend`, { credentials: 'include' });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'trend failed');
  return d; // { facilityId, rows:[{year,source,co2eTonnes}] }
}

export async function getMethods(qs) {
  const r = await fetch(`${BASE}/metrics/methods${qs?`?${qs}`:''}`, { credentials: 'include' });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'methods failed');
  return d; // { rows:[{year,month,method,source,datasetVersion}] }
}

export async function getReconciliation(facilityId) {
  const r = await fetch(`${BASE}/metrics/reconciliation/${facilityId}`, { credentials: 'include' });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'recon failed');
  return d; // { facilityId, rows:[{year, observed, reported, delta, pct}] }
}

export async function getOrgFacilities(params) {
  const qs = params ? `?${new URLSearchParams(params)}` : '';
  const r = await fetch(`${BASE}/metrics/facilities${qs}`, { credentials: 'include' });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'facilities failed');
  return d; // { facilities: [{ id, name }] }
}
// web/src/api/metrics.js
export async function getReconciliationExplain(facilityId, year) {
  const params = new URLSearchParams();
  if (year) params.set('year', String(year));
  const r = await fetch(`${BASE}/metrics/recon/explain/${facilityId}?${params.toString()}`, { credentials: 'include' });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'recon explain failed');
  return d; // { year, breakdown, meta, explanation }
}


export async function getAnomalies({ facilityId, sector, z=3.5, source='reported' }) {
  const params = new URLSearchParams({ z: String(z), source });
  if (facilityId) params.set('facilityId', facilityId);
  if (sector) params.set('sector', sector);
  const r = await fetch(`${BASE}/analytics/anomalies?${params.toString()}`, { credentials: 'include' });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'anomalies failed');
  return d; // { points, anomalies, explanations }
}
// ---- NEW: Capture vs Storage
export async function getCaptureStorage(params) {
  // params: { from, to, sector? }
  const { data } = await http.get('/metrics/capture-storage', { params });
  return data; // { years:[], captured:[], stored:[] }
}

// ---- NEW: Intensity metrics
export async function getIntensity(params) {
  // params: { from, to, sector?, unit }
  const { data } = await http.get('/metrics/intensity', { params });
  return data; // { years:[], p10:[], p50:[], p90:[], facilities:[] }
}

export async function getSectorDeepDive(params) {
  const { data } = await http.get('/metrics/sector-deep-dive', { params });
  return data; // { sectors: [...] }
}
