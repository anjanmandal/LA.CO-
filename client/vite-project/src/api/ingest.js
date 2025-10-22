// src/api/ingest.js
import { http } from './http';

export async function previewFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await http.post('/ingest/preview', fd); // axios sets headers for FormData automatically
  
  return data;
}

export async function commitFile({ file, datasetVersion='v4.7.0', datasetName, duplicatePolicy='replace_if_newer' }) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('datasetVersion', datasetVersion);
  if (datasetName) fd.append('datasetName', datasetName);
  fd.append('duplicatePolicy', duplicatePolicy);
  const { data } = await http.post('/ingest/commit', fd);
  return data;
}
