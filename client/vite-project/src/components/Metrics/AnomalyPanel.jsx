// src/components/Metrics/AnomalyPanel.jsx
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, Stack, Typography, TextField, MenuItem, Alert } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { getAnomalies } from '../../api/metrics';
import { fmtInt } from '../../utils/format';

export default function AnomalyPanel({ facilityId, sectorCode }) {
  const [z, setZ] = useState(3.5);
  const [source, setSource] = useState('reported');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!facilityId && !sectorCode) return;
    getAnomalies({ facilityId, sector: sectorCode, z, source })
      .then(setData).catch(e=>setErr(e.message));
  }, [facilityId, sectorCode, z, source]);
console.log('ANOMALY DATA', {data});
  const rows = data?.points ?? [];
  const anomalies = data?.anomalies ?? [];

  const gridRows = anomalies.map((a, i) => ({
    id: i, year: a.year, value: a.value, z: a.score
  }));

  const columns = useMemo(() => ([
    { field: 'year', headerName: 'Year', width: 100, type: 'number' },
    { field: 'value', headerName: 'Value (tCO₂e)', flex: 1, valueFormatter: ({value}) => fmtInt(value) },
    { field: 'z', headerName: 'z-score', width: 120, valueFormatter: ({value}) => value?.toFixed(2) },
  ]), []);

  return (
    <Card>
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">Anomaly Detection</Typography>
            <TextField size="small" label="Z-score" type="number" value={z} onChange={e=>setZ(+e.target.value)} />
            <TextField size="small" select label="Source" value={source} onChange={e=>setSource(e.target.value)}>
              <MenuItem value="reported">reported</MenuItem>
              <MenuItem value="observed">observed</MenuItem>
            </TextField>
          </Stack>

          {err && <Typography color="error">{err}</Typography>}

          {/* Chart of full series with anomaly highlights */}
          {rows.length > 0 && (
            <BarChart
              height={390}
              xAxis={[{ data: rows.map(r=>r.year), scaleType: 'band', label: 'Year' }]}
              series={[{ data: rows.map(r=>r.value), label: 'tCO₂e' }]}
            />
          )}

          {/* Grid of anomalies */}
          {!data ? null :
            anomalies.length === 0 ? (
              <Alert severity="success">No anomalies (z ≥ {z}).</Alert>
            ) : (
              <div style={{ height: 360, width: '100%' }}>
                <DataGrid
                  rows={gridRows}
                  columns={columns}
                  density="compact"
                  disableRowSelectionOnClick
                  slots={{ toolbar: GridToolbar }}
                  slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: 'anomalies' } } }}
                  initialState={{
                    sorting: { sortModel: [{ field: 'z', sort: 'desc' }] },
                    pagination: { paginationModel: { pageSize: 10 } }
                  }}
                  pageSizeOptions={[10, 25, 50]}
                />
              </div>
            )
          }

          {data?.explanations && typeof data.explanations === 'string' && (
            <Typography variant="body2" sx={{ whiteSpace:'pre-wrap' }}>{data.explanations}</Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
