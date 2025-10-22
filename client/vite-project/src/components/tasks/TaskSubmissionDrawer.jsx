import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/CloseRounded';
import DescriptionIcon from '@mui/icons-material/DescriptionOutlined';
import UploadIcon from '@mui/icons-material/CloudUploadRounded';
import DeleteIcon from '@mui/icons-material/CloseRounded';
import WarningIcon from '@mui/icons-material/WarningAmberRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';

import { getTemplates, getTemplate, submitFiling } from '../../api/copilot';
import { useAuth } from '../../context/AuthContext';

const normalizeIssues = (messages = []) => {
  const issues = [];
  let verdict = null;

  messages.forEach((msgRaw) => {
    if (!msgRaw) return;
    const msg = String(msgRaw).trim();

    if (msg.startsWith('Missing:')) {
      const missingItems = msg.replace('Missing:', '')
        .split(',')
        .map(x => x.trim())
        .filter(Boolean);
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
};

const IssuesList = ({ messages }) => {
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
            <WarningIcon fontSize="small" color="warning" />
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
            <CheckCircleIcon fontSize="small" color={verdict === 'OK' ? 'success' : 'warning'} />
          </ListItemIcon>
          <ListItemText
            primary={`Verdict: ${verdict}`}
            primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
          />
        </ListItem>
      )}
    </List>
  );
};

const AttachmentPicker = ({ attachment, currentFile, onChange }) => (
  <Stack spacing={1}>
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="subtitle2">{attachment.label}</Typography>
      {attachment.required && <Chip size="small" color="warning" label="required" />}
      {currentFile && <Chip size="small" color="success" label="attached" />}
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
          accept={attachment.accept || undefined}
          onChange={(e) => e.target.files?.[0] && onChange(attachment.key, e.target.files[0])}
        />
      </Button>
      {currentFile && (
        <IconButton size="small" onClick={() => onChange(attachment.key, null)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      )}
    </Stack>

    <Typography variant="body2" color="text.secondary">
      {currentFile ? currentFile.name : 'No file selected'}
    </Typography>
  </Stack>
);

export default function TaskSubmissionDrawer({
  open,
  task,
  onClose,
  onSubmitted,
}) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [template, setTemplate] = useState(null);
  const [values, setValues] = useState({});
  const [files, setFiles] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const resetState = useCallback(() => {
    setTemplateId('');
    setTemplate(null);
    setValues({});
    setFiles([]);
    setResult(null);
    setError('');
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }
    (async () => {
      try {
        setLoadingTemplates(true);
        setTemplates(await getTemplates());
      } catch (e) {
        setError(e?.message || 'Failed to load templates');
      } finally {
        setLoadingTemplates(false);
      }
    })();
  }, [open, resetState]);

  useEffect(() => {
    if (templates.length === 1 && !templateId) {
      setTemplateId(templates[0]._id);
    }
  }, [templates, templateId]);

  useEffect(() => {
    if (!templateId) {
      setTemplate(null);
      setValues({});
      setFiles([]);
      return;
    }
    (async () => {
      try {
        setLoadingTemplate(true);
        const tpl = await getTemplate(templateId);
        setTemplate(tpl);
        const initial = {};
        (tpl.fields || []).forEach(f => { initial[f.key] = f.default ?? ''; });
        setValues(initial);
        setFiles([]);
        setResult(null);
        setError('');
      } catch (e) {
        setError(e?.message || 'Failed to load template');
      } finally {
        setLoadingTemplate(false);
      }
    })();
  }, [templateId]);

  useEffect(() => {
    if (!task) return;
    if (task.templateId && !templateId) {
      setTemplateId(task.templateId);
    }
    if (task.orgId) {
      setValues(prev => ({ ...prev, orgId: task.orgId }));
    }
  }, [task, templateId]);

  const setValue = (key, value) => setValues(prev => ({ ...prev, [key]: value }));
  const setFile = (key, file) => {
    setFiles(prev => {
      const others = prev.filter(x => x.key !== key);
      return file ? [...others, { key, file }] : others;
    });
  };

  const handleClose = () => {
    if (submitting) return;
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!template || !task) return;
    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const res = await submitFiling({
        orgId: task.orgId || user?.orgId || null,
        taskId: task._id,
        templateId: template._id,
        values,
        files,
      });
      setResult(res);
      onSubmitted?.(res);
    } catch (e) {
      setError(e?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fallbackMethodOptions = ['Measured', 'Calculated', 'Estimated'];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480, md: 520 } } }}
    >
      <Toolbar sx={{ px: 2, justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={700}>
          {task?.title || 'Submit filing'}
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </Toolbar>

      <Divider />

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {task && (
          <Stack spacing={1}>
            <Chip label={`Status: ${task.status}`} size="small" />
            {task.dueAt && (
              <Typography variant="body2" color="text.secondary">
                Due {new Date(task.dueAt).toLocaleString()}
              </Typography>
            )}
          </Stack>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          select
          label="Template"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          fullWidth
          disabled={loadingTemplates}
          helperText="Choose the filing template to complete"
        >
          {templates.map(tpl => (
            <MenuItem key={tpl._id} value={tpl._id}>
              {tpl.name}
            </MenuItem>
          ))}
        </TextField>

        {template && (
          <Stack spacing={2}>
            {(template.fields || []).map((f) => {
              const options = Array.isArray(f.options) && f.options.length > 0
                ? f.options
                : (f.key === 'method' ? fallbackMethodOptions : []);

              if (f.type === 'select' || options.length > 0) {
                return (
                  <TextField
                    key={f.key}
                    select
                    label={f.label || f.key}
                    value={values[f.key] ?? ''}
                    onChange={(e) => setValue(f.key, e.target.value)}
                    helperText={f.help || ''}
                    required={!!f.required}
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
                  label={f.label || f.key}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValue(f.key, e.target.value)}
                  helperText={f.help || (f.pattern ? `Format: ${f.pattern}` : '')}
                  required={!!f.required}
                  type={f.type === 'number' ? 'number' : 'text'}
                />
              );
            })}

            {(template.attachments || []).length > 0 && (
              <Stack spacing={2}>
                <Divider />
                <Typography variant="subtitle2">Attachments</Typography>
                {(template.attachments || []).map((attachment) => {
                  const current = files.find(x => x.key === attachment.key)?.file || null;
                  return (
                    <AttachmentPicker
                      key={attachment.key}
                      attachment={attachment}
                      currentFile={current}
                      onChange={setFile}
                    />
                  );
                })}
              </Stack>
            )}

            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting || loadingTemplate}
            >
              {submitting ? 'Submitting…' : 'Submit filing'}
            </Button>
          </Stack>
        )}

        {result && (
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              {result.validation?.ok ? (
                <CheckCircleIcon color="success" />
              ) : (
                <WarningIcon color="warning" />
              )}
              <Typography variant="subtitle1" fontWeight={600}>
                {result.validation?.ok ? 'Submission ready' : 'Submission needs attention'}
              </Typography>
              <Chip
                label={result.status === 'submitted' ? 'Submitted' : 'Draft'}
                color={result.validation?.ok ? 'success' : 'warning'}
                size="small"
              />
            </Stack>

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
        )}
      </Box>
    </Drawer>
  );
}
