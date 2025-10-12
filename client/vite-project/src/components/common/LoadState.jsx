// src/components/common/LoadState.jsx
import { Alert, Skeleton, Stack } from '@mui/material';

export function PanelError({ message }) {
  if (!message) return null;
  return <Alert severity="error" sx={{ mb: 1 }}>{message}</Alert>;
}

export function ChartSkeleton({ rows=6 }) {
  return (
    <Stack spacing={1} sx={{ mb: 1 }}>
      <Skeleton variant="rectangular" height={300} />
      <Skeleton variant="rectangular" height={24} width="60%" />
    </Stack>
  );
}
