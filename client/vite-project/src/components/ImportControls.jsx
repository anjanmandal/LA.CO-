import { Card, CardContent, Grid, TextField, MenuItem, Button, Stack } from '@mui/material';

export default function ImportControls({
  disabled,
  onImport,
  datasetVersion, setDatasetVersion,
  datasetName, setDatasetName,
  duplicatePolicy, setDuplicatePolicy,
  showDatasetName = false,
  committing = false, // optional: show spinner state
}) {
  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Grid container spacing={2}>
          {showDatasetName && (
            <Grid item xs={12} md={6}>
              <TextField
                label="Dataset Name"
                fullWidth
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
              />
            </Grid>
          )}
          <Grid item xs={12} md={showDatasetName ? 3 : 6}>
            <TextField
              label="Dataset Version"
              fullWidth
              value={datasetVersion}
              onChange={(e) => setDatasetVersion(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={showDatasetName ? 3 : 6}>
            <TextField
              select
              label="Duplicate Policy"
              fullWidth
              value={duplicatePolicy}
              onChange={(e) => setDuplicatePolicy(e.target.value)}
            >
              <MenuItem value="replace_if_newer">Replace if newer</MenuItem>
              <MenuItem value="skip">Skip if exists</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                disabled={disabled || committing}
                onClick={onImport}
              >
                {committing ? 'Importing…' : 'Import'}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
