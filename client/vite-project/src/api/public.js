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
