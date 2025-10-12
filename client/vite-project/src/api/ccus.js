import { http } from './http';

export const listProjects = async () => (await http.get('/ccus/projects')).data;
export const getProject = async (id) => (await http.get(`/ccus/projects/${id}`)).data;
export const getInjectionSeries = async (id, params={}) =>
  (await http.get(`/ccus/projects/${id}/injection`, { params })).data;
export const postInjection = async (payload) => (await http.post('/ccus/injection', payload)).data;
export const runGeoAlerts = async (id) => (await http.post(`/ccus/projects/${id}/geo-alerts`)).data;
export const listAlerts = async (id) => (await http.get(`/ccus/projects/${id}/alerts`)).data;
