// src/pages/SubmitPage.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';

import UploadIcon from '@mui/icons-material/CloudUploadRounded';
import DeleteIcon from '@mui/icons-material/CloseRounded';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import WarningIcon from '@mui/icons-material/WarningAmberRounded';
import BusinessIcon from '@mui/icons-material/BusinessRounded';
import RestartAltIcon from '@mui/icons-material/RestartAltRounded';
import ClearIcon from '@mui/icons-material/ClearRounded';
import DescriptionIcon from '@mui/icons-material/DescriptionRounded';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmberRounded';

import { getTemplates, getTemplate, submitFiling } from '../api/copilot';
import { http } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { fmtDateTime } from '../utils/format';

function normalizeIssues(messages = []) {
  const issues = [];
  let verdict = null;

  messages.forEach((msgRaw) => {
    if (!msgRaw) return;
    const msg = String(msgRaw).trim();

    if (msg.startsWith('Missing:')) {
      const missingItems = msg.replace('Missing:', '').split(',').map(x => x.trim()).filter(Boolean);
      issues.push(...missingItems.map(item => `Missing ${item}`));
      return;
    }

    const lines = msg.split('\n').map(line => line.trim()).filter(Boolean);
    lines.forEach((line) => {
      if (/^verdict[:]/i.test(line)) {
        verdict = line.split(':')[1]?.trim().toUpperCase() || verdict;
      } else if (line.startsWith('-')) {
        issues.push(line.replace(/^-+\s*/, ''));
      } else {
        issues.push(line);
      }
    });
  });

  return {
    issues: issues.filter(Boolean),
    verdict,
  };
}

function IssuesList({ messages }) {
  const { issues, verdict } = normalizeIssues(messages);

  if (!issues.length && verdict) {
    return <Typography variant="body2">{verdict}</Typography>;
  }

  if (!issues.length) {
    return <Typography variant="body2">No additional guidance returned.</Typography>;
  }

  return (
    <List dense sx={{ py: 0 }}>
      {issues.map((issue, idx) => (
        <ListItem key={`${issue}-${idx}`} sx={{ py: 0.5, px: 0 }}>
          <ListItemIcon sx={{ minWidth: 28 }}>
            <WarningAmberIcon fontSize="small" color="warning" />
          </ListItemIcon>
          <ListItemText
            primary={issue}
            primaryTypographyProps={{ variant: 'body2' }}
          />
        </ListItem>
      ))}
      {verdict && (
        <ListItem sx={{ py: 0.5, px: 0 }}>
          <ListItemIcon sx={{ minWidth: 28 }}>
            <CheckCircleOutlineIcon fontSize="small" color={verdict === 'OK' ? 'success' : 'warning'} />
          </ListItemIcon>
          <ListItemText
            primary={`Verdict: ${verdict}`}
            primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
          />
        </ListItem>
      )}
    </List>
  );
}

export default function SubmitPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [template, setTemplate] = useState(null);

  const [orgId, setOrgId] = useState('');
  const [values, setValues] = useState({});
  const [files, setFiles] = useState([]); // [{key, file}]
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const canEditOrg = user?.role === 'admin';

  // --- Load template list
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setTemplates(await getTemplates());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // --- When a template is chosen, fetch it & prime defaults
  useEffect(() => {
    if (!templateId) { setTemplate(null); setValues({}); setFiles([]); return; }
    (async () => {
      try {
        setLoading(true);
        const t = await getTemplate(templateId);
        setTemplate(t);
        const nxt = {};
        (t.fields || []).forEach(f => { nxt[f.key] = f.default ?? ''; });
        setValues(nxt);
        setFiles([]);
        setResult(null);
        setError('');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [templateId]);

  // --- Helpers
  const setValue = (k, v) => setValues(prev => ({ ...prev, [k]: v }));
  const setFile = (key, file) => {
    setFiles(prev => {
      const others = prev.filter(x => x.key !== key);
      return file ? [...others, { key, file }] : others;
    });
  };

  // --- Live checks (required + pattern + min/max)
  const checks = useMemo(() => {
    if (!template) return { missing: [], issues: [], ok: false };
    const missing = [];
    const issues = [];

    for (const f of (template.fields || [])) {
      const v = values[f.key];
      if (f.required && (v == null || v === '')) missing.push(`Field: ${f.label || f.key}`);
      if (f.pattern && v) {
        try {
          const re = new RegExp(f.pattern);
          if (!re.test(String(v))) issues.push(`Format: ${f.label || f.key} must match ${f.pattern}`);
        } catch { /* ignore bad patterns */ }
      }
      if (f.type === 'number' && v !== '' && v != null) {
        const num = Number(v);
        if (!Number.isFinite(num)) issues.push(`Number: ${f.label || f.key} must be numeric`);
        if (f.min != null && num < Number(f.min)) issues.push(`${f.label || f.key} must be ≥ ${f.min}`);
        if (f.max != null && num > Number(f.max)) issues.push(`${f.label || f.key} must be ≤ ${f.max}`);
      }
    }
    for (const a of (template.attachments || [])) {
      const has = files.find(x => x.key === a.key);
      if (a.required && !has) missing.push(`Attachment: ${a.label}`);
    }
    return { missing, issues, ok: missing.length === 0 && issues.length === 0 };
  }, [template, values, files]);

  const onSubmit = async () => {
    if (!template) return;
    setSubmitting(true); setError(''); setResult(null);
    try {
      const res = await submitFiling({
        orgId: orgId || user?.orgId || null,
        taskId: selectedTaskId || null,
        templateId: template._id,
        values,
        files, // API wrapper should send multipart FormData
      });
      setResult(res);
      if (selectedTaskId) {
        await loadTasks();
        setSelectedTaskId('');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const loadTasks = useCallback(async () => {
    if (!user) return;
    setTasksLoading(true);
    setTasksError('');
    try {
      const params = new URLSearchParams();
      params.set('status', ['open', 'in_progress', 'overdue'].join(','));
      const { data } = await http.get(`/tasks?${params.toString()}`);
      setTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      setTasks([]);
      setTasksError(e?.message || 'Failed to load tasks');
    } finally {
      setTasksLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (user?.orgId) {
      if (!orgId || orgId === 'demo-org') {
        setOrgId(String(user.orgId));
      }
    } else if (!orgId) {
      setOrgId('demo-org');
    }
  }, [user?.orgId, orgId]);

  const availableTasks = useMemo(() => {
    const excluded = new Set(['submitted', 'accepted', 'closed']);
    return tasks.filter(t => !excluded.has(t.status));
  }, [tasks]);

  useEffect(() => {
    if (!selectedTaskId && availableTasks.length === 1) {
      setSelectedTaskId(availableTasks[0]._id);
    }
  }, [availableTasks, selectedTaskId]);

  const linkedTask = useMemo(() => {
    if (!result?.taskId) return null;
    return tasks.find(t => t._id === result.taskId) || null;
  }, [tasks, result]);

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Stack direction="row" alignItems="baseline" justifyContent="space-between">
        <Box>
          <Typography variant="h4" fontWeight={800}>Guided Submission</Typography>
          <Typography color="text.secondary">
            Pick a template, fill fields, attach files, and submit with live checks.
          </Typography>
        </Box>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {loading && <LinearProgress />}

      {/* Context Bar */}
      <Paper
        variant="outlined"
        sx={(t)=>({
          p: 1.5,
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          background: t.palette.background.paper,
        })}
      >
        <Avatar
          sx={(t)=>({
            width: 36, height: 36,
            bgcolor: t.palette.primary.main,
            color: t.palette.getContrastText(t.palette.primary.main)
          })}
        >
          <BusinessIcon fontSize="small" />
        </Avatar>

        <TextField
          size="small"
          label="Organization ID"
          value={orgId}
          onChange={(e)=>setOrgId(e.target.value)}
          placeholder="e.g. demo-org"
          sx={{ minWidth: 260, maxWidth: 360 }}
          disabled={!canEditOrg}
          helperText={canEditOrg ? 'Target organization for this filing' : 'Using your organization'}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <BusinessIcon fontSize="small" sx={{ opacity: 0.6 }} />
              </InputAdornment>
            ),
            endAdornment: canEditOrg ? (
              <InputAdornment position="end">
                {orgId && (
                  <IconButton size="small" onClick={()=>setOrgId('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                )}
              </InputAdornment>
            ) : null,
          }}
        />

        <Box sx={{ flex: 1 }} />

        <Chip
          size="small"
          icon={<DescriptionIcon />}
          label={`${templates?.length ?? 0} templates`}
          variant="outlined"
          sx={{ mr: 0.5 }}
        />
        {canEditOrg && (
          <Tooltip title="Use demo-org">
            <IconButton size="small" onClick={()=>setOrgId('demo-org')}>
              <RestartAltIcon />
            </IconButton>
          </Tooltip>
        )}
      </Paper>

      {/* Main Card */}
      <Card>
        <CardContent>
          <Grid container spacing={2}>
            {/* Template Picker */}
            <Grid item xs={12} md={5}>
              <TextField
                size="small"
                select
                fullWidth
                label="Template"
                value={templateId}
                onChange={(e)=>setTemplateId(e.target.value)}
                helperText="Choose a submission template"
              >
                {templates.map(t => (
                  <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {template && (
              <>
                <Grid item xs={12} mt={1}>
                  <Divider />
                </Grid>

                {/* Left: form */}
                <Grid item xs={12} md={8}>
                  <Stack spacing={2}>
                    <Typography variant="h6" fontWeight={700}>{template.name}</Typography>
                    {template.description && (
                      <Typography variant="body2" color="text.secondary">{template.description}</Typography>
                    )}

                    {(template.fields || []).map((f) => {
                      const fallbackMethodOptions = ['Measured', 'Calculated', 'Estimated'];
                      const options = Array.isArray(f.options) && f.options.length > 0
                        ? f.options
                        : (f.key === 'method' ? fallbackMethodOptions : []);

                      if (f.type === 'select' || options.length > 0) {
                        return (
                          <TextField
                            key={f.key}
                            fullWidth
                            size="small"
                            select
                            label={f.label || f.key}
                            required={!!f.required}
                            value={values[f.key] ?? ''}
                            onChange={(e)=>setValue(f.key, e.target.value)}
                            helperText={f.help || (f.pattern ? `Format: ${f.pattern}` : '')}
                          >
                            {options.map(op => (
                              <MenuItem
                                key={typeof op === 'string' ? op : op.value}
                                value={typeof op === 'string' ? op : op.value}
                              >
                                {typeof op === 'string' ? op : (op.label ?? op.value)}
                              </MenuItem>
                            ))}
                          </TextField>
                        );
                      }

                      return (
                        <TextField
                          key={f.key}
                          fullWidth
                          size="small"
                          label={f.label || f.key}
                          required={!!f.required}
                          type={
                            f.type === 'number' ? 'number'
                              : f.type === 'date' ? 'date'
                              : 'text'
                          }
                          value={values[f.key] ?? ''}
                          onChange={(e)=>setValue(f.key, e.target.value)}
                          multiline={f.type === 'textarea'}
                          minRows={f.type === 'textarea' ? 3 : undefined}
                          InputLabelProps={f.type === 'date' ? { shrink: true } : undefined}
                          helperText={f.help || (f.pattern ? `Format: ${f.pattern}` : '')}
                          inputProps={{
                            ...(f.pattern ? { pattern: f.pattern } : {}),
                            ...(f.min != null ? { min: f.min } : {}),
                            ...(f.max != null ? { max: f.max } : {}),
                          }}
                        />
                      );
                    })}

                    {(template.attachments || []).length > 0 && (
                      <>
                        <Divider />
                        <Typography variant="subtitle1">Attachments</Typography>
                        <Grid container spacing={2}>
                          {(template.attachments || []).map((a) => {
                            const current = files.find(x => x.key === a.key)?.file;
                            return (
                              <Grid item xs={12} md={6} key={a.key}>
                                <Stack spacing={1}>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="subtitle2">{a.label}</Typography>
                                    {a.required && <Chip size="small" color="warning" label="required" />}
                                    {current && <Chip size="small" color="success" label="attached" icon={<CheckCircleIcon />} />}
                                  </Stack>

                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      startIcon={<UploadIcon />}
                                      component="label"
                                    >
                                      Choose file
                                      <input
                                        hidden
                                        type="file"
                                        accept={a.accept || undefined}
                                        onChange={(e)=>e.target.files?.[0] && setFile(a.key, e.target.files[0])}
                                      />
                                    </Button>

                                    {current && (
                                      <Tooltip title="Remove file">
                                        <IconButton size="small" onClick={()=>setFile(a.key, null)}>
                                          <DeleteIcon />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                  </Stack>

                                  <Typography variant="body2" color="text.secondary">
                                    {current ? current.name : 'No file selected'}
                                  </Typography>
                                </Stack>
                              </Grid>
                            );
                          })}
                        </Grid>
                      </>
                    )}

                    <TextField
                      select
                      size="small"
                      label="Link to task"
                      value={selectedTaskId}
                      onChange={(e)=>setSelectedTaskId(e.target.value)}
                      helperText={tasksError ? tasksError : 'Optional: connect this submission to an open compliance task'}
                      disabled={tasksLoading || (!!tasksError && availableTasks.length === 0)}
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
            {availableTasks.map(task => (
              <MenuItem key={task._id} value={task._id}>
                {task.title || 'Untitled task'} — due {task.dueAt ? fmtDateTime(task.dueAt) : 'N/A'}
              </MenuItem>
            ))}
                    </TextField>

                    <Stack direction="row" spacing={1}>
                      {!checks.ok && (
                        <Chip
                          color="warning"
                          icon={<WarningIcon />}
                          label="Fix required items before submitting"
                          variant="outlined"
                        />
                      )}
                      <Box sx={{ flex: 1 }} />
                      <Button
                        variant="contained"
                        onClick={onSubmit}
                        disabled={submitting || !checks.ok}
                      >
                        {submitting ? 'Submitting…' : 'Submit'}
                      </Button>
                    </Stack>
                  </Stack>
                </Grid>

                {/* Right: review panel */}
                <Grid item xs={12} md={4}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Stack spacing={1.5}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Review
                          <Tooltip title="Client checks for required fields, formats, and attachments. Server runs deeper validations & AI checks.">
                            <IconButton size="small" sx={{ ml: 0.5 }}><InfoIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        </Typography>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            size="small"
                            color={checks.ok ? 'success' : 'warning'}
                            label={checks.ok ? 'Ready to submit' : 'Needs attention'}
                          />
                        </Stack>

                        {(checks.missing.length > 0 || checks.issues.length > 0) && (
                          <Alert severity="warning" variant="outlined">
                            <Stack spacing={0.5}>
                              {checks.missing.length > 0 && (
                                <>
                                  <Typography variant="subtitle2">Missing</Typography>
                                  <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                                    {checks.missing.map((m, i) => <li key={i}><Typography variant="body2">{m}</Typography></li>)}
                                  </ul>
                                </>
                              )}
                              {checks.issues.length > 0 && (
                                <>
                                  <Typography variant="subtitle2" sx={{ mt: 1 }}>Format / range</Typography>
                                  <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                                    {checks.issues.map((m, i) => <li key={i}><Typography variant="body2">{m}</Typography></li>)}
                                  </ul>
                                </>
                              )}
                            </Stack>
                          </Alert>
                        )}

                        {/* Template metadata */}
                        {template && (
                          <>
                            <Divider />
                            <Typography variant="subtitle2">Template</Typography>
                            <Typography variant="body2" color="text.secondary">{template.name}</Typography>
                            {template.versionTag && (
                              <Chip size="small" label={`v${template.versionTag}`} sx={{ width: 'fit-content' }} />
                            )}
                            <Typography variant="caption" color="text.secondary">
                              {`${(template.fields || []).length} fields • ${(template.attachments || []).length} attachments`}
                            </Typography>
                          </>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Server result */}
      {result && (
        <Card>
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                {result.validation?.ok ? (
                  <CheckCircleOutlineIcon color="success" />
                ) : (
                  <WarningAmberIcon color="warning" />
                )}
                <Typography variant="h6" fontWeight={600}>
                  {result.validation?.ok ? 'Submission ready' : 'Submission needs attention'}
                </Typography>
                <Chip
                  label={result.status === 'submitted' ? 'Submitted' : 'Draft'}
                  color={result.validation?.ok ? 'success' : 'warning'}
                  size="small"
                />
              </Stack>

              <Typography variant="body2" color="text.secondary">
                Template: {template?.name || 'Template'} • Submitted at {fmtDateTime(result.createdAt)}
              </Typography>

              {linkedTask && (
                <Chip
                  label={`Linked task: ${linkedTask.title || 'Task'}`}
                  color={result.validation?.ok ? 'success' : 'warning'}
                  size="small"
                  sx={{ width: 'fit-content' }}
                />
              )}

              {!result.validation?.ok && (
                <Alert severity="warning" variant="outlined">
                  <AlertTitle>What to fix</AlertTitle>
                  <IssuesList messages={result.validation?.messages} />
                </Alert>
              )}

              {result.validation?.ok && (
                <Alert severity="success" variant="outlined">
                  All checks passed. Regulators can now review this submission.
                </Alert>
              )}

              <Divider />
              <Typography variant="subtitle2">Files uploaded</Typography>
              <List dense disablePadding>
                {(result.files || []).map(file => (
                  <ListItem key={file._id || file.path} disableGutters>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <DescriptionIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={file.filename}
                      secondary={`${file.key} • ${(file.size / 1024).toFixed(1)} KB`}
                    />
                  </ListItem>
                ))}
              </List>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
