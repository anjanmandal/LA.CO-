// src/components/Metrics/CaptureStoragePanel.jsx
import { useEffect, useMemo, useState } from 'react';
import { Stack, TextField, MenuItem, Chip, Typography, useTheme } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import SectionCard from '../common/SectionCard';
import YearRange from '../common/YearRange';
import { PanelError, ChartSkeleton } from '../common/LoadState';
import { getCaptureStorage } from '../../api/metrics';

// Gradient defs (like your Sessions chart)
function AreaGradient({ color, id }) {
  return (
    <defs>
      <linearGradient id={id} x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stopColor={color} stopOpacity={0.5} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

export default function CaptureStoragePanel({ sectorCode = '' }) {
  const theme = useTheme();

  const [from, setFrom] = useState(2023);
  const [to, setTo] = useState(new Date().getFullYear());
  const [data, setData] = useState({ years: [], captured: [], stored: [] });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  // fetch
  useEffect(() => {
    let alive = true;
    setLoading(true);
    getCaptureStorage({ from, to, sector: sectorCode })
      .then((d) => { if (alive) setData(d || { years: [], captured: [], stored: [] }); })
      .catch((e) => { if (alive) setErr(e.message); })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [from, to, sectorCode]);

  const years = data.years ?? [];
  const captured = data.captured ?? [];
  const stored = data.stored ?? [];
  const gap = useMemo(
    () => years.map((_, i) => Math.max(0, (captured[i] ?? 0) - (stored[i] ?? 0))),
    [years, captured, stored]
  );
  const util = useMemo(
    () => years.map((_, i) => {
      const c = captured[i] ?? 0, s = stored[i] ?? 0;
      return c > 0 ? (100 * s / c) : null;
    }),
    [years, captured, stored]
  );

  // Headline totals + delta vs previous year
  const latestIdx = years.length ? years.length - 1 : null;
  const prevIdx = latestIdx != null && latestIdx > 0 ? latestIdx - 1 : null;

  const latestCaptured = latestIdx != null ? (captured[latestIdx] ?? 0) : 0;
  const latestStored   = latestIdx != null ? (stored[latestIdx] ?? 0)   : 0;
  const latestUtilPct  = latestCaptured > 0 ? (100 * latestStored / latestCaptured) : null;

  const prevCaptured = prevIdx != null ? (captured[prevIdx] ?? 0) : null;
  const prevStored   = prevIdx != null ? (stored[prevIdx] ?? 0)   : null;
  const prevUtilPct  = (prevCaptured && prevCaptured > 0) ? (100 * prevStored / prevCaptured) : null;

  const utilDelta = (latestUtilPct != null && prevUtilPct != null)
    ? (latestUtilPct - prevUtilPct)
    : null;

  const actions = (
    <Stack direction="row" spacing={1} alignItems="center">
      <YearRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
      {!!sectorCode && (
        <TextField size="small" select label="Sector" value={sectorCode} disabled sx={{ minWidth: 200 }}>
          <MenuItem value={sectorCode}>{sectorCode}</MenuItem>
        </TextField>
      )}
    </Stack>
  );

  // Grid rows
  const rows = years.map((y, i) => ({
    id: y, year: y,
    captured: captured[i] ?? 0,
    stored: stored[i] ?? 0,
    gap: gap[i] ?? 0,
    utilization: util[i],
  }));

  // Theme palette + gradient mapping
  const colors = {
    captured: theme.palette.primary.dark,
    stored: theme.palette.primary.main,
    gap: theme.palette.primary.light,
  };
  const gradientRules = {
    '& .MuiAreaElement-series-captured': { fill: "url('#grad-captured')" },
    '& .MuiAreaElement-series-stored':   { fill: "url('#grad-stored')" },
    '& .MuiAreaElement-series-gap':      { fill: "url('#grad-gap')" },
  };

  return (
    <SectionCard
      title="Capture vs Storage"
      subtitle={
        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="h5" component="p">
              {latestStored.toLocaleString()} <Typography variant="body2" component="span" color="text.secondary">tCO₂ stored</Typography>
            </Typography>
            {latestUtilPct != null && (
              <Chip
                size="small"
                color={(utilDelta ?? 0) >= 0 ? 'success' : 'error'}
                label={
                  utilDelta == null
                    ? `${latestUtilPct.toFixed(1)}% util`
                    : `${latestUtilPct.toFixed(1)}% util (${utilDelta >= 0 ? '+' : ''}${utilDelta.toFixed(1)}pp)`
                }
              />
            )}
          </Stack>
          {latestIdx != null && (
            <Typography variant="caption" color="text.secondary">
              Year: {years[latestIdx]}
            </Typography>
          )}
        </Stack>
      }
      actions={actions}
    >
      <PanelError message={err} />

      {loading ? (
        <ChartSkeleton />
      ) : (
        <LineChart
          height={200}
          xAxis={[{
            data: years,
            label: 'Year',
            scaleType: 'point',
            tickLabelStyle: { fontSize: 12 },
            height: 45,
          }]}
          yAxis={[{ width: 60 }]}
          series={[
            {
              id: 'captured',
              label: 'Captured (tCO₂)',
              data: captured,
              showMark: false,
              curve: 'linear',
              stack: 'total',
              area: true,
              stackOrder: 'ascending',
            },
            {
              id: 'stored',
              label: 'Stored/Injected (tCO₂)',
              data: stored,
              showMark: false,
              curve: 'linear',
              stack: 'total',
              area: true,
              stackOrder: 'ascending',
            },
            {
              id: 'gap',
              label: 'Gap (captured − stored)',
              data: gap,
              showMark: false,
              curve: 'linear',
              stack: 'total',
              area: true,
              stackOrder: 'ascending',
            },
          ]}
          grid={{ horizontal: true }}
          hideLegend
          margin={{ left: 6, right: 18, top: 16, bottom: 36 }}
          sx={{ ...gradientRules }}
        >
          <AreaGradient id="grad-captured" color={colors.captured} />
          <AreaGradient id="grad-stored" color={colors.stored} />
          <AreaGradient id="grad-gap" color={colors.gap} />
        </LineChart>
      )}

      <div style={{ height: 200, width: '100%', marginTop: 8 }}>
        <DataGrid
          rows={rows}
          columns={[
            { field: 'year', headerName: 'Year', width: 100 },
            { field: 'captured', headerName: 'Captured (tCO₂)', flex: 1, valueFormatter: p => (p ?? 0).toLocaleString() },
            { field: 'stored', headerName: 'Stored (tCO₂)', flex: 1, valueFormatter: p => (p ?? 0).toLocaleString() },
            { field: 'gap', headerName: 'Gap (tCO₂)', flex: 1, valueFormatter: p => (p ?? 0).toLocaleString() },
            { field: 'utilization', headerName: 'Utilization %', width: 140, valueFormatter: p => p == null ? '—' : `${p.toFixed(1)}%` },
          ]}
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 300 } } }}
          initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
          pageSizeOptions={[10, 25, 50]}
          density="compact"
          disableRowSelectionOnClick
        />
      </div>
    </SectionCard>
  );
}
