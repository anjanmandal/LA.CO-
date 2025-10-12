import { http } from './http';

// RAG Q&A
export async function askCopilot({ question, sector, orgContext }) {
    try{
  const { data } = await http.post('/copilot/ask', { question, sector, orgContext });
  return data; // { text, refs[] }
}catch (error) {
    console.error("Error in askCopilot:", error);
    throw error;
  }
}

// Plan tasks
export async function planCompliance({ orgId, sector, owner, months }) {
  const { data } = await http.post('/copilot/plan', { orgId, sector, owner, months });
  return data;
}



export async function getTemplates() {
  const { data } = await http.get('/copilot/templates');
  return data; // [{_id, slug, name, fields, attachments, ...}]
}

export async function getTemplate(id) {
  const { data } = await http.get(`/copilot/templates/${id}`);
  return data;
}

export async function submitFiling({ orgId='demo-org', taskId, templateId, values, files }) {
  const fd = new FormData();
  fd.append('orgId', orgId);
  if (taskId) fd.append('taskId', taskId);
  fd.append('templateId', templateId);
  fd.append('values', JSON.stringify(values));
  // IMPORTANT: backend expects field name 'files' (array)
  // We also need to preserve "key" for each attachment -> send as the form field name
  // Trick: server stores `fieldname` coming from input name. So set input name = attachment.key
  // and append with that name. But multer in your controller is `upload.array('files', 10)`,
  // so if you keep that, just append under 'files' and also include a parallel list of keys.
  // Easiest: keep your controller as-is and append objects as 'files' but add header `X-File-Keys`.
  // Since your controller reads req.files[i].fieldname, let’s instead name each as `files` but set filename to `${key}::${file.name}` and parse on server.
  // Simpler: change input name to 'files' and include a `fileKey` map:
  if (files && files.length) {
    files.forEach(({ key, file }) => fd.append('files', file, `${key}__${file.name}`));
  }
  const { data } = await http.post('/copilot/submit', fd);
  return data; // Submission document
}
