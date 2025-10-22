import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFileRounded';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFileRounded';
import { uploadStateEmissions, getStateEmissionMeta } from '../api/public';

export default function StateEmissionsUploadPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);
  const [meta, setMeta] = useState(null);

  const handleFileChange = (event) => {
    const next = event.target.files?.[0];
    setFile(next || null);
    setResult(null);
    setErr('');
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setErr('');
    setResult(null);
    try {
      const resp = await uploadStateEmissions(file);
      setResult(resp);
      let overview = null;
      try {
        overview = await getStateEmissionMeta();
      } catch (metaErr) {
        console.warn('Failed to load state metadata', metaErr);
      }
      if (overview) setMeta(overview);
    } catch (e) {
      setErr(e.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="h4" fontWeight={800}>State emissions data upload</Typography>
        <Typography variant="body2" color="text.secondary" maxWidth={760}>
          Upload the GHGRP state-level spreadsheet (one row per facility) to refresh the public state emissions view.
          Only administrators can run this import. Existing rows will be updated; new facilities are added.
        </Typography>
      </Stack>

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Stack spacing={2}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileIcon />}
              sx={{ alignSelf: 'flex-start' }}
            >
              Choose CSV…
              <input type="file" hidden accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFileChange} />
            </Button>

            {file && (
              <Stack direction="row" spacing={1} alignItems="center">
                <InsertDriveFileIcon color="primary" />
                <Typography variant="body2">{file.name}</Typography>
              </Stack>
            )}

            <Box>
              <Typography variant="subtitle2">Expected columns</Typography>
              <Typography variant="body2" color="text.secondary">
                REPORTING YEAR, FACILITY NAME, GHGRP ID, REPORTED ADDRESS, LATITUDE, LONGITUDE, CITY NAME,
                COUNTY NAME, STATE, ZIP CODE, PARENT COMPANIES, GHG QUANTITY (METRIC TONS CO2e), SUBPARTS
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                disabled={!file || loading}
                onClick={handleUpload}
              >
                Upload data
              </Button>
            </Stack>

            {loading && <LinearProgress />}
            {err && <Alert severity="error">{err}</Alert>}
            {result && (
              <Alert severity="success">
                Added {result.upserted ?? 0} and updated {result.modified ?? 0} facilities.&nbsp;
                {meta?.states?.length
                  ? `States available: ${meta.states.map((s) => s.state).join(', ')}`
                  : null}
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
