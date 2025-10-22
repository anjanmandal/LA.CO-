import { http } from './http';

export async function listMySubmissions(params) {
  const { data } = await http.get('/submissions/mine', { params });
  return data;
}

export async function listSubmissions(params) {
  const { data } = await http.get('/submissions', { params });
  return data;
}

export async function updateSubmissionStatus(id, status) {
  const { data } = await http.patch(`/submissions/${id}/status`, { status });
  return data;
}
