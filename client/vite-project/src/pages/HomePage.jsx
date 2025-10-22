// src/pages/HomePage.jsx
import { useEffect, useState } from 'react';
import {
  Box,
  Chip,
  Grid,
  Stack,
  Typography,
  Button,
  TextField,
  MenuItem,
  Alert,
  alpha,
  useTheme,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import PersonIcon from '@mui/icons-material/PersonRounded';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CaptureStoragePanel from '../components/Metrics/CaptureStoragePanel';
import IntensityPanel from '../components/Metrics/IntensityPanel';
import OverviewBySector from '../components/Metrics/OverviewBySector';
import StateTotalsChart from '../components/Metrics/StateTotalsChart';
import ReconciliationView from '../components/Metrics/ReconciliationView';
import MethodTimeline from '../components/Metrics/MethodTimeline';
import { getOrgFacilities } from '../api/metrics';

// Friendly copy + primary CTA by role
function rolePreset(role) {
  switch (role) {
    case 'operator':
      return {
        title: 'Operational overview',
        blurb:
          'Upload datasets, reconcile MRV, and prepare compliance drafts.',
        cta: '/copilot',
        ctaLabel: 'Copilot',
        badgeColor: 'primary',
      };
    case 'regulator':
      return {
        title: 'Regulatory workspace',
        blurb:
          'Monitor MRV analytics, review CCUS projects, and manage tasks.',
        cta: '/mrv',
        ctaLabel: 'MRV Analytics',
        badgeColor: 'info',
      };
    case 'admin':
      return {
        title: 'Admin control center',
        blurb:
          'Configure data ingress, review analytics, and manage submissions.',
        cta: '/mrv',
        ctaLabel: 'MRV Analytics',
        badgeColor: 'secondary',
      };
    case 'public':
      return {
        title: 'Public transparency',
        blurb:
          'Explore the public-facing brief, maps, and emissions overview.',
        cta: '/public',
        ctaLabel: 'Public Brief',
        badgeColor: 'success',
      };
    default:
      return {
        title: 'Welcome to BayouCarbon',
        blurb:
          'Your role determines what you can do. Contact an admin if you need additional access.',
        cta: '/public',
        ctaLabel: 'Public Brief',
        badgeColor: 'default',
      };
  }
}

export default function HomePage() {
  const theme = useTheme();
  const { user } = useAuth();
  const role = user?.role ?? 'guest';
  const { title, blurb, badgeColor, cta, ctaLabel } = rolePreset(role);
  const isOperator = role === 'operator';
  const [facilities, setFacilities] = useState([]);
  const [facilityId, setFacilityId] = useState('');
  const [facilityErr, setFacilityErr] = useState('');
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const hasFacilities = facilities.length > 0;
  const activeFacilityId = hasFacilities ? facilityId : '';

  useEffect(() => {
    let cancelled = false;
    if (!isOperator) {
      setFacilities([]);
      setFacilityId('');
      setFacilityErr('');
      setLoadingFacilities(false);
      return () => { cancelled = true; };
    }

    if (!user?.orgId) {
      setFacilities([]);
      setFacilityId('');
      setFacilityErr('');
      setLoadingFacilities(false);
      return () => { cancelled = true; };
    }

    setLoadingFacilities(true);
    setFacilityErr('');
    getOrgFacilities()
      .then(({ facilities: nextFacilities = [] }) => {
        if (cancelled) return;
        setFacilities(nextFacilities);
        setFacilityId((prev) => {
          if (prev && nextFacilities.some((f) => f.id === prev)) return prev;
          return nextFacilities[0]?.id ?? '';
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setFacilityErr(err.message || 'Failed to load facilities');
        setFacilities([]);
        setFacilityId('');
      })
      .finally(() => {
        if (!cancelled) setLoadingFacilities(false);
      });

    return () => { cancelled = true; };
  }, [isOperator, user?.orgId]);

  // Subtle gradient hero background
  const heroBg = `
    radial-gradient(900px 420px at 0% -10%, ${alpha(theme.palette.primary.main, 0.12)} 0%, transparent 60%),
    radial-gradient(900px 420px at 120% 120%, ${alpha(theme.palette.secondary.main, 0.10)} 0%, transparent 60%)
  `;

  return (
    <Box sx={{ px: { xs: 1.5, md: 0 }, py: { xs: 2, md: 3 } }}>
      {/* Hero */}
      <Stack
        spacing={1.25}
        sx={{
          mb: 3,
          p: { xs: 2, md: 3 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          background: heroBg,
          backdropFilter: 'blur(4px)',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          flexWrap="wrap"
          sx={{ mb: 0.5 }}
        >
          <Typography variant="h4" fontWeight={800}>
            {title}{user?.name ? `, ${user.name}` : ''}
          </Typography>
          <Chip
            size="small"
            color={badgeColor}
            variant={badgeColor === 'default' ? 'outlined' : 'filled'}
            label={role === 'guest' ? 'no role' : role}
            icon={
              role === 'admin' ? <AdminPanelSettingsIcon /> : <PersonIcon />
            }
            sx={{ ml: 0.5, textTransform: 'capitalize' }}
          />
        </Stack>
        <Typography variant="body1" color="text.secondary" maxWidth={780}>
          {blurb}
        </Typography>

        <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
          <Button
            component={RouterLink}
            to={cta}
            variant="contained"
            endIcon={<ArrowForwardIcon />}
          >
            Open {ctaLabel}
          </Button>
          <Button
            component={RouterLink}
            to="/public"
            variant="outlined"
          >
            View Public Brief
          </Button>
        </Stack>
      </Stack>

      {/* Quick actions removed per request */}

      {isOperator && (
        <Stack spacing={2} sx={{ mt: 4 }}>
          <Typography variant="h5" fontWeight={700}>
            Operations snapshot
          </Typography>
          <Typography variant="body2" color="text.secondary" maxWidth={760}>
            Track your organization’s facility data at a glance. Reconciliation and method lineage panels reflect the facility selected below.
          </Typography>

          {!loadingFacilities && facilityErr && (
            <Alert severity="error">{facilityErr}</Alert>
          )}
          {!loadingFacilities && !facilityErr && !hasFacilities && (
            <Alert severity="info">
              No facilities found for your organization yet. Upload capture data to get started.
            </Alert>
          )}
          {hasFacilities && (
            <TextField
              select
              size="small"
              label="Facility"
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              disabled={loadingFacilities}
              sx={{ maxWidth: 320 }}
              helperText="Applies to the reconciliation and method panels"
            >
              {facilities.map((facility) => (
                <MenuItem key={facility.id} value={facility.id}>
                  {facility.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <OverviewBySector />
            </Grid>
            <Grid item xs={12} md={6}>
              <ReconciliationView
                facilityId={activeFacilityId}
                hasFacilities={hasFacilities}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <StateTotalsChart />
            </Grid>
            <Grid item xs={12}>
              <IntensityPanel />
            </Grid>
            <Grid item xs={12}>
              <MethodTimeline
                facilityId={activeFacilityId}
                hasFacilities={hasFacilities}
              />
            </Grid>
          </Grid>
        </Stack>
      )}

      {['regulator', 'admin'].includes(role) && (
        <Stack spacing={2} sx={{ mt: 4 }}>
          <Typography variant="h5" fontWeight={700}>
            Regulatory snapshot
          </Typography>
          <Typography variant="body2" color="text.secondary" maxWidth={760}>
            A quick look at statewide capture vs. storage trends, facility intensity distribution, and a
            sample reconciliation table. Navigate to MRV Analytics for full exploration.
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <OverviewBySector />
            </Grid>
            <Grid item xs={12} md={6}>
              <CaptureStoragePanel />
            </Grid>
            <Grid item xs={12} md={6}>
              <StateTotalsChart />
            </Grid>
            <Grid item xs={12}>
              <IntensityPanel />
            </Grid>
            {/* Regulators can jump to MRV for full breakdowns */}
          </Grid>
        </Stack>
      )}
    </Box>
  );
}
