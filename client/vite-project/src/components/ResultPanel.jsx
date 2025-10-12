import { Card, CardContent, Grid, Chip, Stack, Typography, Divider } from '@mui/material';

export default function ResultPanel({ result }) {
  if (!result) return null;

  // Support both payload styles
  const rowsImported = result.rowsImported ?? ((result.inserted ?? 0) + (result.replaced ?? 0));
  const rowsSkipped  = result.rowsSkipped ?? (result.skipped ?? 0);
  const { rowsTotal = 0, duplicates = 0, invalid = 0, importJobId } = result;

  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack spacing={1.25}>
          <Typography variant="h6">Import Results</Typography>
          <Grid container spacing={1}>
            <Grid item><Chip label={`Total: ${rowsTotal}`} /></Grid>
            <Grid item><Chip color="success" label={`Imported: ${rowsImported}`} /></Grid>
            <Grid item><Chip color="warning" label={`Skipped: ${rowsSkipped}`} /></Grid>
            <Grid item><Chip color="warning" label={`Duplicates: ${duplicates}`} /></Grid>
            <Grid item><Chip color="error" label={`Invalid: ${invalid}`} /></Grid>
          </Grid>

          {importJobId && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" color="text.secondary">Import Job ID: {importJobId}</Typography>
            </>
          )}

          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2">Raw Response</Typography>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </Stack>
      </CardContent>
    </Card>
  );
}
