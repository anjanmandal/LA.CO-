// web/src/pages/MRVPage.jsx
import { Grid, Stack, Typography, Card, CardContent, alpha, useTheme } from '@mui/material';
import OverviewBySector from '../components/Metrics/OverviewBySector';
import ReconciliationView from '../components/Metrics/ReconciliationView';
import AnomalyPanel from '../components/Metrics/AnomalyPanel';
import MethodTimeline from '../components/Metrics/MethodTimeline';
import CaptureStoragePanel from '../components/Metrics/CaptureStoragePanel';
import IntensityPanel from '../components/Metrics/IntensityPanel';

const DEMO_FACILITY_ID = import.meta.env.VITE_DEMO_FACILITY_ID || '';

export default function MRVPage() {
  const theme = useTheme();
  const headerBg = `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.14)}, ${alpha(theme.palette.secondary.main, 0.06)})`;

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

     
        <Grid item xs={12} md={6}>
          <AnomalyPanel facilityId={DEMO_FACILITY_ID} />
        </Grid>

     

        <Grid item xs={12}>
          <CaptureStoragePanel />
        </Grid>

          <Grid item xs={12}>
          <IntensityPanel />
        </Grid>
           <Grid item xs={12} md={6}>
          <ReconciliationView facilityId={DEMO_FACILITY_ID} />
        </Grid>

      
           <Grid item xs={12}>
          <MethodTimeline facilityId={DEMO_FACILITY_ID} />
        </Grid>
      </Grid>
    </Stack>
  );
}
