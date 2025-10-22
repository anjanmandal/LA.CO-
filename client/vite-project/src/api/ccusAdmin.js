import { http } from './http';

export const fetchProjects = async () => {
  const { data } = await http.get('/ccus/projects');
  return data;
};

export const fetchProjectDetail = async (id) => {
  const { data } = await http.get(`/ccus/projects/${id}`);
  return data;
};

export const createProject = async (payload) => {
  const { data } = await http.post('/ccus/projects', payload);
  return data;
};

export const updateProject = async (id, payload) => {
  const { data } = await http.put(`/ccus/projects/${id}`, payload);
  return data;
};

export const deleteProject = async (id) => {
  const { data } = await http.delete(`/ccus/projects/${id}`);
  return data;
};

export const createWell = async (projectId, payload) => {
  const { data } = await http.post(`/ccus/projects/${projectId}/wells`, payload);
  return data;
};

export const updateWell = async (wellId, payload) => {
  const { data } = await http.put(`/ccus/wells/${wellId}`, payload);
  return data;
};

export const deleteWell = async (wellId) => {
  const { data } = await http.delete(`/ccus/wells/${wellId}`);
  return data;
};

export const createPermit = async (projectId, payload) => {
  const { data } = await http.post(`/ccus/projects/${projectId}/permits`, payload);
  return data;
};

export const updatePermit = async (permitId, payload) => {
  const { data } = await http.put(`/ccus/permits/${permitId}`, payload);
  return data;
};

export const deletePermit = async (permitId) => {
  const { data } = await http.delete(`/ccus/permits/${permitId}`);
  return data;
};

export const upsertReading = async (projectId, payload) => {
  const { data } = await http.post(`/ccus/projects/${projectId}/readings`, payload);
  return data;
};
