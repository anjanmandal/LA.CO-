import { Stack, Typography } from '@mui/material';
import SectorDeepDive from '../components/Metrics/SectorDeepDive';

export default function SectorDeepDivePage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={800}>
        Sector Deep Dive
      </Typography>
      <Typography variant="body2" color="text.secondary" maxWidth={760}>
        Review year-over-year changes by sector, then drill into subsector contributions to understand the drivers behind each move.
      </Typography>
      <SectorDeepDive allowedRoles={['regulator', 'admin']} />
    </Stack>
  );
}
