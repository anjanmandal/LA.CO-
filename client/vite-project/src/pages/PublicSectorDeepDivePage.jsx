import { Stack, Typography } from '@mui/material';
import SectorDeepDive from '../components/Metrics/SectorDeepDive';

export default function PublicSectorDeepDivePage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={800}>
        Public Sector Trends
      </Typography>
      <Typography variant="body2" color="text.secondary" maxWidth={760}>
        Explore observed emissions trends by sector and see which subsectors contributed most to the latest change.
      </Typography>
      <SectorDeepDive allowedRoles={['public']} />
    </Stack>
  );
}
