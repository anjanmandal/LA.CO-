import multer from 'multer';
import Submission from '../models/Submission.js';
import FilingTemplate from '../models/FilingTemplate.js';
import ComplianceTask from '../models/ComplianceTask.js';
import RegRequirement from '../models/RegRequirement.js';
import { answerWithCitations } from '../services/ai/rag.js';
import { generateTasks } from '../services/tasks/plan.js';
import { openai } from '../services/ai/openai.js';

const upload = multer({ dest: 'uploads/' });

export const copilotAsk = async (req, res) => {
    console.log("copilotAsk called with body:", req.body);
  const { question, sector, orgContext } = req.body;
  if (!question) return res.status(400).json({ error:'question required' });
  const ans = await answerWithCitations({ question, sector, orgContext });

  res.json(ans);
};

export const planTasks = async (req, res) => {
  const { orgId, sector, owner, months = 12 } = req.body;
  const start = new Date();
  const end = new Date(); end.setMonth(end.getMonth()+months);
  console.log('>>> planTasks', { orgId, sector, owner, months, start, end });
  const out = await generateTasks({ orgId, sector, windowStart: start, windowEnd: end, owner });
  res.json(out);
};

export const getTemplates = async (_req, res) => {
  const t = await FilingTemplate.find().lean();
  res.json(t);
};

export const getTemplate = async (req, res) => {
  const t = await FilingTemplate.findById(req.params.id).lean();
  if (!t) return res.status(404).json({ error: 'not found' });
  res.json(t);
};

export const uploadFields = upload.array('files', 10);

// create/update submission + validate with AI
export const submitFiling = async (req, res) => {
  const { orgId, taskId, templateId, values } = req.body;
  const files = (req.files || []).map(f => ({ key: f.fieldname, filename: f.originalname, path: f.path, size: f.size, mimetype: f.mimetype }));

  const template = await FilingTemplate.findById(templateId).lean();
  if (!template) return res.status(400).json({ error:'Invalid templateId' });

  // basic required checks
  const missing = [];
  for (const f of template.fields) {
    if (f.required && (values?.[f.key] == null || values?.[f.key] === '')) missing.push(f.label || f.key);
    if (f.pattern && values?.[f.key]) {
      const re = new RegExp(f.pattern);
      if (!re.test(values[f.key])) missing.push(`${f.label} (format)`);
    }
  }
  for (const a of (template.attachments||[])) {
    if (a.required && !files.find(x => x.key === a.key)) missing.push(`Attachment: ${a.label}`);
  }

  // AI reasonableness/consistency check (optional, not blocking)
  const prompt = [
    'You are validating a compliance submission.',
    'Check for missing fields, inconsistent numeric units, and impossible values.',
    'Reply with a short bullet list of concerns and a final verdict: OK or FIX.',
    'Template:', JSON.stringify({ name: template.name, fields: template.fields }),
    'Values:', JSON.stringify(values)
  ].join('\n');

  const ai = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    messages: [{ role:'system', content:'Compliance validator' }, { role:'user', content: prompt }]
  });

  const aiText = ai.choices[0].message.content || '';
  const ok = missing.length === 0 && /(^|\b)OK\b/i.test(aiText);

  const sub = await Submission.create({
    orgId, templateId, taskId, values, files,
    validation: { ok, messages: [ ...(missing.length? [`Missing: ${missing.join(', ')}`] : []), aiText ], model: 'gpt-4o-mini' },
    status: ok ? 'submitted' : 'draft'
  });

  if (taskId) {
    const t = await ComplianceTask.findById(taskId);
    if (t) {
      t.submissionId = sub._id;
      t.status = ok ? 'submitted' : 'in_progress';
      t.audit.push({ action: 'submitted', actor: req.user?.email || 'user', meta: { ok } });
      await t.save();
    }
  }

  res.json(sub);
};
