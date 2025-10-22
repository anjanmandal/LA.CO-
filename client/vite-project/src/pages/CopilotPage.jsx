// src/pages/CopilotPage.jsx
import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';

import SendRoundedIcon from '@mui/icons-material/SendRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';

import { askCopilot } from '../api/copilot';

const QUICK_ASKS = [
  'What do we owe this year and when?',
  'List federal reporting due in the next 60 days.',
  'Which filings depend on Scope 2 data?',
  'Draft a checklist for EPA GHG reporting.',
];

const SECTORS = [
  { value: '', label: '(All sectors)' },
  { value: 'energy', label: 'Energy' },
  { value: 'power', label: 'Power' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'buildings', label: 'Buildings' },
  { value: 'transport', label: 'Transport' },
  { value: 'waste', label: 'Waste' },
];

export default function CopilotPage() {
  const theme = useTheme();

  const [q, setQ] = useState('What do we owe this year and when?');
  const [sector, setSector] = useState('');
  const [answer, setAnswer] = useState(null); // { text, refs: [{n, citation, url?}] }
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const canAsk = q.trim().length > 2 && !loading;

  const headerBg = useMemo(
    () =>
      `radial-gradient(1200px 480px at -10% -20%, ${alpha(
        theme.palette.primary.main,
        0.14
      )}, transparent 60%),
       radial-gradient(900px 420px at 120% 120%, ${alpha(
         theme.palette.secondary.main,
         0.10
       )}, transparent 60%)`,
    [theme]
  );

  const ask = async (overrideQ) => {
    const question = overrideQ ?? q;
    if (!question.trim() || loading) return;
    setLoading(true);
    setErr('');
    try {
      const res = await askCopilot({ question, sector: sector || undefined });
      setAnswer(res);
    } catch (e) {
      setErr(e.message || 'Failed to get an answer.');
    } finally {
      setLoading(false);
    }
  };

  const copyAnswer = () => {
    if (!answer?.text) return;
    navigator.clipboard?.writeText?.(answer.text);
  };

  const exportAnswer = () => {
    if (!answer?.text) return;
    const blob = new Blob([answer.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dt = new Date().toISOString().slice(0, 10);
    a.download = `copilot_answer_${dt}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack spacing={2}>
      {/* Hero */}
      <Card sx={{ p: 2.5, borderRadius: 3, background: headerBg, borderColor: 'divider' }} variant="outlined">
        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h5" fontWeight={800}>Compliance Copilot</Typography>
            <Tooltip title="Ask natural language questions about filings, due dates, and procedures.">
              <HelpOutlineRoundedIcon fontSize="small" />
            </Tooltip>
          </Stack>
          <Typography color="text.secondary">
            Ask questions, get cited answers. Add a sector filter to tailor guidance.
          </Typography>
        </Stack>
      </Card>

      {err && (
        <Alert severity="error" variant="outlined">
          {err}
        </Alert>
      )}

      {/* Prompt row */}
      <Card sx={{ borderRadius: 3 }} variant="outlined">
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ md: 'center' }}>
            <TextField
              fullWidth
              label="Ask a question"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') ask(); }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <RefreshRoundedIcon fontSize="small" sx={{ opacity: 0.5 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Ask">
                      <span>
                        <IconButton color="primary" onClick={() => ask()} disabled={!canAsk}>
                          <SendRoundedIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              select
              label="Sector (optional)"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              sx={{ minWidth: 220 }}
            >
              {SECTORS.map((s) => (
                <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
              ))}
            </TextField>

            <Button
              variant="contained"
              onClick={() => ask()}
              disabled={!canAsk}
              startIcon={<SendRoundedIcon />}
              sx={{ minWidth: 140 }}
            >
              {loading ? 'Thinking…' : 'Ask'}
            </Button>
          </Stack>

          {/* Quick prompts */}
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.25 }}>
            {QUICK_ASKS.map((p) => (
              <Chip
                key={p}
                label={p}
                size="small"
                variant="outlined"
                onClick={() => {
                  setQ(p);
                  ask(p);
                }}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Loading skeleton */}
      {loading && (
        <Card sx={{ borderRadius: 3 }} variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>Answer</Typography>
            <Stack spacing={1}>
              <Skeleton variant="rounded" height={18} />
              <Skeleton variant="rounded" height={18} width="92%" />
              <Skeleton variant="rounded" height={18} width="85%" />
              <Skeleton variant="rounded" height={18} width="72%" />
              <Divider sx={{ my: 1.25 }} />
              <Skeleton variant="rounded" height={18} width="40%" />
              <Skeleton variant="rounded" height={28} width="60%" />
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Answer */}
      {answer && !loading && (
        <Card
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            borderColor: 'divider',
          }}
          variant="outlined"
        >
          <CardContent sx={{ pb: 2 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ sm: 'center' }}
              justifyContent="space-between"
              spacing={1}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle1" fontWeight={700}>Answer</Typography>
                <Chip
                  size="small"
                  label="Guidance — not legal advice"
                  variant="outlined"
                  sx={{ borderStyle: 'dashed' }}
                />
              </Stack>

              <Stack direction="row" spacing={0.5}>
                <Tooltip title="Copy answer">
                  <IconButton size="small" onClick={copyAnswer}>
                    <ContentCopyRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Export .txt">
                  <IconButton size="small" onClick={exportAnswer}>
                    <FileDownloadRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Ask again">
                  <IconButton size="small" onClick={() => ask()}>
                    <ReplayRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>

            {/* Body */}
            <Box
              sx={{
                mt: 1.25,
                p: 1.25,
                borderRadius: 2,
                bgcolor:
                  theme.palette.mode === 'dark'
                    ? alpha(theme.palette.primary.main, 0.06)
                    : alpha(theme.palette.primary.main, 0.04),
                border: '1px solid',
                borderColor: alpha(theme.palette.primary.main, 0.18),
                // preserve lists and breaks
                '&, & *': { whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
              }}
            >
              <Typography variant="body1">{answer.text}</Typography>
            </Box>

            {/* Refs */}
            <Divider sx={{ my: 1.25 }} />

            <Typography variant="subtitle2" gutterBottom>
              References
            </Typography>

            {(!answer.refs || answer.refs.length === 0) ? (
              <Typography variant="body2" color="text.secondary">
                No references returned.
              </Typography>
            ) : (
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {answer.refs.map((r) => {
                  const label = `[${r.n}] ${r.citation}`;
                  return r.url ? (
                    <Chip
                      key={r.n}
                      component="a"
                      clickable
                      target="_blank"
                      rel="noopener noreferrer"
                      href={r.url}
                      label={label}
                      variant="outlined"
                      sx={{
                        maxWidth: '100%',
                        '& .MuiChip-label': { whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' },
                      }}
                    />
                  ) : (
                    <Chip
                      key={r.n}
                      label={label}
                      variant="outlined"
                      sx={{
                        maxWidth: '100%',
                        '& .MuiChip-label': { whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' },
                      }}
                    />
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty hint */}
      {!answer && !loading && !err && (
        <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">
            Tip: Ask “What’s due in the next 30 days for {sector || 'my organization'}?”
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
