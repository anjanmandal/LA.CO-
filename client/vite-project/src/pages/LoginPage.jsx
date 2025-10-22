// src/pages/LoginPage.jsx
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
  Checkbox,
  useTheme,
  alpha,
} from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SecurityIcon from '@mui/icons-material/Security';
import InsightsIcon from '@mui/icons-material/Insights';
import MapIcon from '@mui/icons-material/Map';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import VerifiedIcon from '@mui/icons-material/Verified';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// 🔽 use your custom icon
import LouisianaMapIconGeo from '../components/icon/LAco2Icon';

function GlassCard({ children, sx }) {
  const theme = useTheme();
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        p: { xs: 3, sm: 4 },
        backdropFilter: 'blur(10px)',
        bgcolor:
          theme.palette.mode === 'dark'
            ? alpha('#0C1222', 0.75)
            : alpha('#ffffff', 0.9),
        border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 12px 36px rgba(0,0,0,0.45)'
            : '0 12px 36px rgba(20,40,90,0.12)',
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}

function Stat({ label, value }) {
  const theme = useTheme();
  return (
    <Stack spacing={0} sx={{ minWidth: 96 }}>
      <Typography variant="h6" fontWeight={900}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Box
        sx={{
          mt: 0.75,
          height: 3,
          width: 36,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.primary.main, 0.35),
        }}
      />
    </Stack>
  );
}

export default function LoginPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoggingIn, user, isLoading } = useAuth();

  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [error, setError] = useState(null);
  const [showPw, setShowPw] = useState(false);

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (!isLoading && user) navigate(from, { replace: true });
  }, [isLoading, user, from, navigate]);

  const isEmailValid = useMemo(
    () => !!form.email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email),
    [form.email]
  );
  const isPasswordValid = useMemo(
    () => (form.password || '').length >= 6,
    [form.password]
  );
  const canSubmit = isEmailValid && isPasswordValid && !isLoggingIn && !isLoading;

  const handleChange = (evt) => {
    const { name, value, type, checked } = evt.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    setError(null);
    if (!canSubmit) return;
    try {
      await login({
        email: form.email.trim(),
        password: form.password,
        remember: form.remember,
      });
    } catch (err) {
      setError(err?.message || 'Login failed');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        px: { xs: 2, md: 3 },
        // Brand-y gradient bloom (deep blue + cyan/teal hints)
        background: `
          radial-gradient(1200px 600px at 10% -10%, ${alpha(theme.palette.primary.main, 0.18)} 0%, transparent 60%),
          radial-gradient(1200px 600px at 110% 110%, ${alpha(theme.palette.success.main, 0.16)} 0%, transparent 60%),
          linear-gradient(${theme.palette.mode === 'dark' ? '#081020' : '#f6f9ff'}, ${theme.palette.background.default})
        `,
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 2, md: 3 }}
        sx={{ width: '100%', maxWidth: 1100 }}
      >
        {/* LEFT: Brand + value */}
        <GlassCard
          sx={{
            flex: 1.15,
            overflow: 'hidden',
            position: 'relative',
            p: { xs: 3, sm: 5 },
          }}
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Avatar
                variant="rounded"
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: theme.palette.primary.main,
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                }}
              >
                {/* Brand icon */}
                <LouisianaMapIconGeo sx={{ fontSize: 28 }} />
              </Avatar>
              <Stack spacing={0}>
                <Typography variant="overline" sx={{ letterSpacing: 1, opacity: 0.7 }}>
                  LA.CO₂
                </Typography>
                <Typography variant="h5" fontWeight={900}>
                  MRV & CCUS for Louisiana
                </Typography>
              </Stack>
            </Stack>

            <Typography color="text.secondary">
              <strong>LA.CO₂</strong> helps Louisiana measure, report, and verify greenhouse gases—
              and track CCUS projects across capture, transport, injection, and storage. Operators
              file accurately, regulators verify quickly, and residents get clarity.
            </Typography>

            {/* Feature bullets */}
            <Stack spacing={1.2} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={1.2} alignItems="center">
                <InsightsIcon fontSize="small" color="primary" />
                <Typography variant="body2">
                  <strong>Observed vs. reported</strong> comparisons, anomaly flags, clear reconciliation.
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.2} alignItems="center">
                <MapIcon fontSize="small" color="primary" />
                <Typography variant="body2">
                  <strong>CCUS tracking</strong>: wells, permits, pipelines, and storage totals—on the map.
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.2} alignItems="center">
                <SecurityIcon fontSize="small" color="primary" />
                <Typography variant="body2">
                  <strong>Compliance Copilot</strong>: guided filings, tasking, and cited answers.
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.2} alignItems="center">
                <CloudDoneIcon fontSize="small" color="primary" />
                <Typography variant="body2">
                  <strong>Public brief</strong>: read-only charts, CSVs, and plain-language captions.
                </Typography>
              </Stack>
            </Stack>

            {/* Roles */}
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
              <Chip label="Operator" size="small" variant="outlined" />
              <Chip label="Regulator" size="small" variant="outlined" />
              <Chip label="Public / Markets" size="small" variant="outlined" />
            </Stack>

            {/* Tiny stats */}
            <Stack direction="row" spacing={3} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
              <Stat label="Facilities" value="120+" />
              <Stat label="Class VI wells" value="30+" />
              <Stat label="Datasets" value="15+" />
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack direction="row" spacing={1} alignItems="center">
              <VerifiedIcon color="success" fontSize="small" />
              <Typography variant="caption" color="text.secondary">
                SOC-aware design • Role-based access • Audit trail
              </Typography>
            </Stack>
          </Stack>
        </GlassCard>

        {/* RIGHT: Login form (no SSO row per your preference) */}
        <GlassCard sx={{ flex: 1, p: { xs: 3, sm: 4 } }}>
          <Stack spacing={3}>
            <Stack spacing={0.5}>
              <Typography variant="h5" fontWeight={900}>
                Welcome back
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in with your work email to continue.
              </Typography>
            </Stack>

            {error && <Alert severity="error" role="alert">{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit} noValidate aria-label="Sign in form">
              <Stack spacing={2}>
                <TextField
                  name="email"
                  label="Work email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  fullWidth
                  required
                  autoFocus
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MailOutlineIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  error={!!form.email && !isEmailValid}
                  helperText={
                    !!form.email && !isEmailValid
                      ? 'Enter a valid email (e.g., name@company.com)'
                      : ' '
                  }
                />

                <TextField
                  name="password"
                  label="Password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPw ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPw((s) => !s)}
                          edge="end"
                          size="small"
                        >
                          {showPw ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  error={!!form.password && !isPasswordValid}
                  helperText={
                    !!form.password && !isPasswordValid ? 'Use at least 6 characters' : ' '
                  }
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      name="remember"
                      checked={form.remember}
                      onChange={handleChange}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">Keep me signed in</Typography>}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  disabled={!canSubmit}
                  sx={{ py: 1.2, fontWeight: 800, letterSpacing: 0.2 }}
                >
                  {isLoggingIn ? 'Signing in…' : 'Sign in'}
                </Button>
              </Stack>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              By continuing you agree to our{' '}
              <Link href="/terms" underline="hover">Terms</Link> &{' '}
              <Link href="/privacy" underline="hover">Privacy</Link>.
            </Typography>
          </Stack>
        </GlassCard>
      </Stack>
    </Box>
  );
}
