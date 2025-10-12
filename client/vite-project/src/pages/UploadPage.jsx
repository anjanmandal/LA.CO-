import { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, Divider, Grid, Stack, TextField, Typography,
  LinearProgress, Snackbar, IconButton, Tooltip, alpha, useTheme
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import DatasetOutlinedIcon from '@mui/icons-material/DatasetOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { DataGrid } from '@mui/x-data-grid';

import FileDropZone from '../components/FileDropZone';
import ResultPanel from '../components/ResultPanel';
import PreviewPanel from '../components/PreviewPanel';
import ImportControls from '../components/ImportControls';
import HeaderMappingTable from '../components/HeaderMappingTable'; // optional if you want mapping UX

import { parseCsvHeadersAndSample } from '../utils/csv';
import { previewFile as apiPreview, commitFile as apiCommit } from '../api/ingest';

export default function UploadPage() {
  const theme = useTheme();

  // File + preview/result state
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [sampleRows, setSampleRows] = useState([]);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);

  // Optional header mapping state (if you want to collect mapping)
  const [mapping, setMapping] = useState(null);

  // Controls
  const [datasetVersion, setDatasetVersion] = useState('v4.7.0');
  const [datasetName, setDatasetName] = useState('Operator Upload');
  const [duplicatePolicy, setDuplicatePolicy] = useState('replace_if_newer');

  // UI state
  const [error, setError] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [snack, setSnack] = useState('');

  const canImport = !!preview && (preview.previewStats?.ok ?? 0) > 0 && !committing;

  const handleFiles = async (files) => {
    const f = files?.[0];
    if (!f) return;

    if (!f.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a .csv file.');
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError('Max file size is 50 MB for this uploader.');
      return;
    }

    setError('');
    setFile(f);
    setResult(null);
    setPreview(null);
    setMapping(null);

    // Client-side sample
    try {
      const parsed = await parseCsvHeadersAndSample(f, 30);
      setHeaders(parsed.headers || []);
      setSampleRows(parsed.rows || []);
    } catch (e) {
      setHeaders([]);
      setSampleRows([]);
      setError(`Failed to parse CSV sample: ${e.message}`);
    }

    // Server preview
    try {
      setLoadingPreview(true);
      const p = await apiPreview(f);
      setPreview(p);
      if (p.adapter === 'trace_sector') setDatasetName('Climate TRACE Sector');
      setSnack('Preview completed');
    } catch (e) {
      setError(e.message || 'Preview failed');
    } finally {
      setLoadingPreview(false);
    }
  };

  const onImport = async () => {
    if (!file) { setError('Choose a CSV file first'); return; }
    if (!preview) { setError('Preview the file first'); return; }
    if ((preview.previewStats?.problems?.length || 0) > 100) {
      setError('Too many preview problems — please review or fix the file.');
      return;
    }

    setError('');
    setCommitting(true);
    try {
      const res = await apiCommit({
        file,
        datasetVersion,
        datasetName: preview.adapter === 'trace_sector' ? 'Climate TRACE Sector' : datasetName,
        duplicatePolicy,
        // mapping, // ← if your backend accepts field mapping, send it here
      });
      setResult(res);
      setSnack('Import committed successfully');
    } catch (e) {
      setError(e.message || 'Commit failed');
    } finally {
      setCommitting(false);
    }
  };

  // Dynamic sample grid
  const sampleColumns = useMemo(
    () =>
      (headers || []).map((h) => ({
        field: h,
        headerName: h,
        flex: 1,
        minWidth: 140,
        valueGetter: (p) => p?.row?.[h],
      })),
    [headers]
  );

  const sampleRowsGrid = useMemo(
    () => (sampleRows || []).slice(0, 10).map((r, i) => ({ id: i + 1, ...r })),
    [sampleRows]
  );

  const okCount = preview?.previewStats?.ok ?? 0;
  const problemCount = preview?.previewStats?.problems?.length ?? 0;
  const adapter = preview?.adapter ?? '—';

  const headerBg = `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.14)}, ${alpha(theme.palette.secondary.main, 0.06)})`;

  return (
    <Stack spacing={2}>
      {/* Page header */}
      <Card sx={{ p: 2.5, borderRadius: 3, background: headerBg, backdropFilter: 'blur(6px)' }}>
        <CardContent sx={{ p: 0 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <Inventory2OutlinedIcon />
              <Typography variant="h4" fontWeight={800}>Data Upload</Typography>
            </Stack>
            <Typography color="text.secondary">
              Preview → Commit flow with Climate TRACE auto-detect.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}
      {loadingPreview && <LinearProgress />}

      <Grid container spacing={2}>
        {/* LEFT: File selection + sample + preview & controls */}
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack spacing={2}>
                <FileDropZone onFiles={handleFiles} />

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    aria-label="Choose CSV file"
                  >
                    Choose file
                    <input hidden type="file" accept=".csv" onChange={(e)=>e.target.files && handleFiles(e.target.files)} />
                  </Button>
                  {file && <Chip sx={{ ml: 1 }} label={file.name} />}
                  {file?.size != null && (
                    <Chip size="small" variant="outlined" label={`${(file.size/1024/1024).toFixed(2)} MB`} />
                  )}
                  {preview && (
                    <>
                      <Chip icon={<DatasetOutlinedIcon />} variant="outlined" label={`Adapter: ${adapter}`} />
                      <Chip color="success" label={`Valid: ${okCount}`} />
                      <Chip color={problemCount ? 'warning' : 'default'} label={`Issues: ${problemCount}`} />
                      {preview?.adapter === 'trace_sector'
                        ? <Chip icon={<ShieldOutlinedIcon />} color="info" variant="outlined" label="TRACE" />
                        : <Chip variant="outlined" label="Operator" />}
                    </>
                  )}
                  <Tooltip title="Ensure UTF-8 CSV with a header row.">
                    <IconButton size="small"><InfoOutlinedIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </Stack>

                <Divider />

                {/* Sample grid */}
                {!!headers.length && (
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">Sample (first 10 rows)</Typography>
                    <div style={{ height: 280, width: '100%' }}>
                      <DataGrid
                        rows={sampleRowsGrid}
                        columns={sampleColumns}
                        disableRowSelectionOnClick
                        density="compact"
                        hideFooterSelectedRowCount
                        initialState={{
                          pagination: { paginationModel: { pageSize: 10, page: 0 } }
                        }}
                        pageSizeOptions={[10, 25, 50]}
                      />
                    </div>
                  </Stack>
                )}

                {/* Optional header mapping (keep if your backend supports mapping) */}
                {!!headers.length && (
                  <>
                    <Divider />
                    <HeaderMappingTable headers={headers} mapping={mapping} onChange={setMapping} />
                  </>
                )}

                <PreviewPanel preview={preview} />

                {preview && (preview.previewStats?.ok ?? 0) === 0 && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Preview found no valid rows (e.g., non-numeric <code>emissions_quantity</code>).
                    Please upload a numeric Climate TRACE emissions CSV.
                  </Alert>
                )}

                <ImportControls
                  disabled={!canImport}
                  onImport={onImport}
                  datasetVersion={datasetVersion}
                  setDatasetVersion={setDatasetVersion}
                  datasetName={datasetName}
                  setDatasetName={setDatasetName}
                  duplicatePolicy={duplicatePolicy}
                  setDuplicatePolicy={setDuplicatePolicy}
                  showDatasetName={preview?.adapter !== 'trace_sector'}
                  committing={committing}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* RIGHT: Results */}
        <Grid item xs={12} md={5}>
          <ResultPanel result={result} />
        </Grid>
      </Grid>

      {/* Snack feedback */}
      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack('')}
        message={snack}
        action={
          <IconButton onClick={() => setSnack('')} size="small" color="inherit">
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        }
      />
    </Stack>
  );
}
