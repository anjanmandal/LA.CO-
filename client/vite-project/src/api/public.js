import { http } from './http';

export async function getOverview(params = {}) {
  const { data } = await http.get('/public/overview', { params });
  return data;
}

export async function getPublicProjects() {
  const { data } = await http.get('/public/projects');
  return data;
}

export function downloadEmissionsCsv({ from, to }) {
  const url = new URL(`${http.defaults.baseURL}/public/download`);
  url.searchParams.set('kind', 'emissions');
  if (from) url.searchParams.set('from', from);
  if (to) url.searchParams.set('to', to);
  window.open(url.toString(), '_blank');
}

export function downloadProjectsCsv() {
  const url = new URL(`${http.defaults.baseURL}/public/download`);
  url.searchParams.set('kind', 'projects');
  window.open(url.toString(), '_blank');
}

export async function explainChart(payload) {
  const { data } = await http.post('/public/explain', payload);
  return data; // { caption }
}

export async function getStateEmissionMeta() {
  const { data } = await http.get('/public/state-emissions/meta');
  return data; // { states:[{state, years:[]}] }
}

export async function getStateEmissionSummary(params) {
  const { data } = await http.get('/public/state-emissions', { params });
  return data; // { state, year, total, sectors:[], facilities:[] }
}

export async function getStateEmissionTotals(params) {
  const { data } = await http.get('/public/state-emissions/totals', { params });
  return data; // { states:[{state,total,topSector,year}] }
}

export async function uploadStateEmissions(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await http.post('/public/state-emissions/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
