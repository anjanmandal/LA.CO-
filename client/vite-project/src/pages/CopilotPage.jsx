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
  const [answer, setAnswer] = useState(null);  // { text, refs: [{n, citation, url?}] }
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const canAsk = q.trim().length > 2 && !loading;

  const ask = async () => {
    if (!canAsk) return;
    setLoading(true);
    setErr('');
    try {
      const res = await askCopilot({ question: q, sector: sector || undefined });
      setAnswer(res);
    } catch (e) {
      setErr(e.message || 'Failed to get an answer.');
    } finally {
      setLoading(false);
    }
  };

  const headerBg = useMemo(
    () =>
      `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)}, ${alpha(
        theme.palette.secondary.main,
        0.08
      )})`,
    [theme]
  );

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Card sx={{ p: 2, borderRadius: 3, background: headerBg }}>
        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h5" fontWeight={800}>Compliance Copilot</Typography>
            <Tooltip title="Ask natural language questions about filings, due dates, and procedures.">
              <HelpOutlineRoundedIcon fontSize="small" />
            </Tooltip>
          </Stack>
          <Typography color="text.secondary">
            Ask questions, get cited answers. Use a sector filter to tailor guidance.
          </Typography>
        </Stack>
      </Card>

      {err && <Alert severity="error">{err}</Alert>}

      {/* Prompt row */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
            <TextField
              fullWidth
              label="Ask a question"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') ask(); }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <RefreshRoundedIcon
                      fontSize="small"
                      sx={{ opacity: 0.5 }}
                    />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Ask">
                      <span>
                        <IconButton color="primary" onClick={ask} disabled={!canAsk}>
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
              {SECTORS.map(s => (
                <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
              ))}
            </TextField>

            <Button
              variant="contained"
              onClick={ask}
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
                onClick={() => setQ(p)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Answer card */}
      {loading && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Answer</Typography>
            <Stack spacing={1}>
              <Skeleton variant="rounded" height={18} />
              <Skeleton variant="rounded" height={18} width="92%" />
              <Skeleton variant="rounded" height={18} width="85%" />
              <Skeleton variant="rounded" height={18} width="70%" />
            </Stack>
          </CardContent>
        </Card>
      )}

      {answer && !loading && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">Answer</Typography>
              <Tooltip title="Copy answer">
                <IconButton
                  onClick={() => navigator.clipboard?.writeText?.(answer.text || '')}
                  size="small"
                >
                  <ContentCopyRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>

            <Typography sx={{ whiteSpace: 'pre-wrap', my: 1.25 }}>
              {answer.text}
            </Typography>

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
                    />
                  ) : (
                    <Chip key={r.n} label={label} variant="outlined" />
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tactile hint */}
      {!answer && !loading && (
        <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">
            Tip: Ask “What’s due in the next 30 days for {sector || 'my organization'}?”
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
