import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';
import WarningIcon from '@mui/icons-material/WarningAmberRounded';
import DescriptionIcon from '@mui/icons-material/DescriptionOutlined';
import UploadIcon from '@mui/icons-material/UploadFileRounded';
import RefreshIcon from '@mui/icons-material/RefreshRounded';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';

import { getTemplate, submitFiling } from '../api/copilot';
import { useAuth } from '../context/AuthContext';
import { http } from '../api/http';
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

function AttachmentInput({ attachment, onChange, currentFile }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        border: `1px dashed ${alpha(theme.palette.primary.main, 0.4)}`,
        borderRadius: 2,
        p: 2,
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <DescriptionIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2">
            {attachment.label}
            {attachment.required && (
              <Chip
                label="Required"
                color="error"
                size="small"
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {attachment.help || 'Upload a PDF or spreadsheet.'}
        </Typography>
        <Button
          component="label"
          variant="outlined"
          size="small"
        >
          {currentFile ? 'Replace file' : 'Select file'}
          <input
            type="file"
            hidden
            onChange={onChange}
          />
        </Button>
        {currentFile && (
          <Typography variant="caption" color="text.secondary">
            {currentFile.name} • {(currentFile.size / 1024).toFixed(1)} KB
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

export default function SubmissionWizard() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tmpl, setTmpl] = useState(null);
  const [values, setValues] = useState({});
  const [files, setFiles] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');

  useEffect(()=>{ (async()=> {
    try {
      setTmpl(await getTemplate(templateId));
    } catch (err) {
      setError(err?.message || 'Failed to load template');
    }
  })() }, [templateId]);

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
      setTasksError(e?.message || 'Failed to load tasks');
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const setVal = (k, v) => setValues(x=>({ ...x, [k]: v }));

  const onSubmit = async () => {
    if (!tmpl) return;
    const fileList = Object.entries(files)
      .filter(([, file]) => file)
      .map(([field, file]) => ({ field, file }));
    setError(null);
    try {
      const res = await submitFiling({
        orgId: user?.orgId || null,
        taskId: selectedTaskId || null,
        templateId,
        values,
        files: fileList,
      });
      setResult(res);
      if (selectedTaskId) {
        await loadTasks();
        setSelectedTaskId('');
      }
    } catch (err) {
      setError(err?.message || 'Submission failed');
    }
  };

  const availableTasks = useMemo(() => {
    const excluded = new Set(['submitted', 'accepted', 'closed']);
    return tasks.filter(t => !excluded.has(t.status));
  }, [tasks]);

  const linkedTask = useMemo(() => {
    if (!result?.taskId) return null;
    return tasks.find(t => t._id === result.taskId) || null;
  }, [tasks, result]);

  useEffect(() => {
    if (!selectedTaskId && availableTasks.length === 1) {
      setSelectedTaskId(availableTasks[0]._id);
    }
  }, [availableTasks, selectedTaskId]);

  if (!tmpl) return null;
  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={800}>{tmpl.name}</Typography>
      <Card>
        <CardContent>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          {tmpl.fields.map(f=>{
            const fallbackMethodOptions = ['Measured', 'Calculated', 'Estimated'];
            const options = Array.isArray(f.options) && f.options.length > 0
              ? f.options
              : (f.key === 'method' ? fallbackMethodOptions : []);

            if (f.type === 'select' || (f.key === 'method' && options.length > 0)) {
              return (
                <TextField
                  key={f.key}
                  select
                  label={f.label}
                  required={f.required}
                  value={values[f.key] ?? ''}
                  onChange={e => setVal(f.key, e.target.value)}
                  helperText={f.help || ''}
                >
                  {options.map(op => (
                    <MenuItem key={typeof op === 'string' ? op : op.value} value={typeof op === 'string' ? op : op.value}>
                      {typeof op === 'string' ? op : (op.label ?? op.value)}
                    </MenuItem>
                  ))}
                </TextField>
              );
            }
            if (f.type === 'multiline') return (
              <TextField key={f.key} label={f.label} multiline minRows={3}
                value={values[f.key] ?? ''} onChange={e=>setVal(f.key, e.target.value)} helperText={f.help||''} />
            );
            return (
              <TextField key={f.key} label={f.label} type={f.type==='number'?'number':'text'} required={f.required}
                value={values[f.key] ?? ''} onChange={e=>setVal(f.key, e.target.value)} helperText={f.help||''} />
            );
          })}
          {tmpl.attachments?.length>0 && (
            <Box>
              <Typography variant="subtitle2">Attachments</Typography>
              <Stack spacing={1} mt={1}>
                {tmpl.attachments.map(a=>(
                  <AttachmentInput
                    key={a.key}
                    attachment={a}
                    currentFile={files[a.key]}
                    onChange={e => setFiles(s => ({ ...s, [a.key]: e.target.files?.[0] }))}
                  />
                ))}
              </Stack>
            </Box>
          )}
          <Divider sx={{ my: 1 }} />

          <TextField
            select
            label="Link to task"
            value={selectedTaskId}
            onChange={e => setSelectedTaskId(e.target.value)}
            helperText={tasksError ? tasksError : 'Optional: connect this submission to an open compliance task'}
            disabled={tasksLoading || (!!tasksError && availableTasks.length === 0)}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {availableTasks.map(task => (
              <MenuItem key={task._id} value={task._id}>
                {task.title || 'Untitled task'} — due {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : 'N/A'}
              </MenuItem>
            ))}
          </TextField>

          <Button variant="contained" onClick={onSubmit} sx={{ alignSelf: 'flex-start' }}>
            Submit for review
          </Button>
        </Stack>
        </CardContent>
      </Card>

      {result && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                {result.validation?.ok ? (
                  <CheckCircleIcon color="success" />
                ) : (
                  <WarningIcon color="warning" />
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
                Template: {tmpl.name} • Submitted at {new Date(result.createdAt).toLocaleString()}
              </Typography>

              {linkedTask && (
                <Chip
                  label={`Linked task: ${linkedTask.title || 'Task'}`}
                  color={result.validation?.ok ? 'success' : 'warning'}
                  size="small"
                  sx={{ alignSelf: 'flex-start' }}
                />
              )}

              {result.taskId && (
                <Chip
                  label="Linked task updated"
                  color={result.validation?.ok ? 'success' : 'warning'}
                  size="small"
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
}
