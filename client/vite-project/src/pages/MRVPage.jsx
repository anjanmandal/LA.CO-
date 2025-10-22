// web/src/pages/MRVPage.jsx
import { useEffect, useState } from 'react';
import { Grid, Stack, Typography, Card, CardContent, TextField, MenuItem, Alert, alpha, useTheme } from '@mui/material';
import OverviewBySector from '../components/Metrics/OverviewBySector';
import ReconciliationView from '../components/Metrics/ReconciliationView';
import AnomalyPanel from '../components/Metrics/AnomalyPanel';
import MethodTimeline from '../components/Metrics/MethodTimeline';
import CaptureStoragePanel from '../components/Metrics/CaptureStoragePanel';
import IntensityPanel from '../components/Metrics/IntensityPanel';
import { useAuth } from '../context/AuthContext';
import { getOrgFacilities } from '../api/metrics';

export default function MRVPage() {
  const theme = useTheme();
  const { user } = useAuth();
  const [facilities, setFacilities] = useState([]);
  const [facilityId, setFacilityId] = useState('');
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [facilityErr, setFacilityErr] = useState('');
  const headerBg = `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.14)}, ${alpha(theme.palette.secondary.main, 0.06)})`;
  const isRegulator = user?.role === 'regulator';
  const hasFacilities = facilities.length > 0;
  const effectiveFacilityId = facilityId === 'all' ? '' : facilityId;

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setFacilities([]);
      setFacilityId('');
      return;
    }
    setLoadingFacilities(true);
    setFacilityErr('');
    const params = isRegulator ? { scope: 'all' } : undefined;
    if (!isRegulator && !user.orgId) {
      setFacilities([]);
      setFacilityId('');
      setLoadingFacilities(false);
      return;
    }
    getOrgFacilities(params)
      .then(({ facilities: nextFacilities = [] }) => {
        if (cancelled) return;
        const list = isRegulator
          ? [{ id: 'all', name: 'All facilities' }, ...nextFacilities]
          : nextFacilities;
        setFacilities(list);
        setFacilityId((prev) => {
          if (prev && list.some((f) => f.id === prev)) return prev;
          return list[0]?.id ?? '';
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
  }, [user, isRegulator]);

  return (
    <Stack spacing={2}>
      <Card sx={{ p: 2, borderRadius: 3, background: headerBg, backdropFilter: 'blur(6px)' }}>
        <CardContent sx={{ p: 0 }}>
          <Typography variant="h4" fontWeight={800}>MRV Analytics &amp; Reconciliation</Typography>
          <Typography variant="body2" color="text.secondary">
            Explore observed totals, intensity distributions, storage utilization, method lineage, and deltas.
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <OverviewBySector />
        </Grid>
        <Grid item xs={12}>
          <CaptureStoragePanel />
        </Grid>
        <Grid item xs={12}>
          <IntensityPanel />
        </Grid>
        {isRegulator && (
          <Grid item xs={12} md={6}>
            <Stack spacing={1.5}>
              {(facilityErr || !hasFacilities) && (
                <Alert severity={facilityErr ? 'error' : 'info'}>
                  {facilityErr || 'Facilities not found.'}
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
                >
                  {facilities.map((facility) => (
                    <MenuItem key={facility.id} value={facility.id}>
                      {facility.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <ReconciliationView facilityId={facilityId} hasFacilities={hasFacilities} />
            </Stack>
          </Grid>
        )}
        <Grid item xs={12} md={6}>
          <AnomalyPanel facilityId={effectiveFacilityId} hasFacilities={hasFacilities} />
        </Grid>
        <Grid item xs={12}>
          <MethodTimeline facilityId={effectiveFacilityId} hasFacilities={hasFacilities} />
        </Grid>
      </Grid>
    </Stack>
  );
}
