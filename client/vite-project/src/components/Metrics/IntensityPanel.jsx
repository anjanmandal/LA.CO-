// src/components/Metrics/IntensityPanel.jsx
import { useEffect, useMemo, useState } from 'react';
import { Stack, TextField, MenuItem, Chip, Typography, useTheme } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import SectionCard from '../common/SectionCard';
import YearRange from '../common/YearRange';
import { PanelError, ChartSkeleton } from '../common/LoadState';
import { getIntensity } from '../../api/metrics';

const UNITS = [
  { value: 'kWh', label: 'kWh' },
  { value: 'bbl', label: 'barrels' },
  { value: 't',  label: 'tons' },
];

export default function IntensityPanel({ sectorCode = '' }) {
  const theme = useTheme();

  const [from, setFrom] = useState(2018);
  const [to, setTo] = useState(new Date().getFullYear());
  const [unit, setUnit] = useState('kWh');
  const [data, setData] = useState({ years: [], sector: [], p10: [], p50: [], p90: [], facilities: [], rows: [] });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr('');
    getIntensity({ from, to, sector: sectorCode, unit })
      .then((d) => {
        if (!alive) return;
        setData(d || { years: [], p10: [], p50: [], p90: [], facilities: [], rows: [] });
      })
      .catch((e) => { if (alive) setErr(e?.message || 'Failed to load'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [from, to, sectorCode, unit]);

  const years = data.years ?? [];
  const p10 = data.p10 ?? [];
  const p50 = data.p50 ?? [];
  const p90 = data.p90 ?? [];

  const lastIdx = years.length ? years.length - 1 : null;
  const prevIdx = lastIdx > 0 ? lastIdx - 1 : null;
  const latestMedian = lastIdx != null ? (Number(p50[lastIdx]) || 0) : 0;
  const prevMedian = prevIdx != null ? (Number(p50[prevIdx]) || 0) : null;
  const deltaPct = prevMedian && prevMedian !== 0 ? ((latestMedian - prevMedian) / prevMedian) * 100 : null;

  const colors = [
    (theme.vars || theme).palette.primary.dark,
    (theme.vars || theme).palette.primary.main,
    (theme.vars || theme).palette.primary.light,
  ];

  const actions = (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
      <YearRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
      <TextField
        size="small"
        select
        label="Unit"
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        sx={{ minWidth: 160 }}
      >
        {UNITS.map(u => <MenuItem key={u.value} value={u.value}>{u.label}</MenuItem>)}
      </TextField>
    </Stack>
  );

  const rows = useMemo(() => {
    if (Array.isArray(data?.rows) && data.rows.length) return data.rows;
    if (Array.isArray(data?.facilities)) {
      const flat = data.facilities.flat();
      return flat.map((r, i) => ({ id: r?.id ?? i, ...r }));
    }
    return [];
  }, [data]);

  const columns = useMemo(() => ([
    { field: 'facility', headerName: 'Facility', flex: 1, minWidth: 220 },

    {
      field: 'year',
      headerName: 'Year',
      width: 100,
      type: 'number',
      valueGetter: (value) => value ?? null,
      valueFormatter: (value) => (value ?? '—'),
    },

    {
      field: 'intensity',
      headerName: `kg CO₂e / ${unit}`,
      flex: 1,
      type: 'number',
      valueGetter: (value) => value ?? null,
      valueFormatter: (value) =>
        value == null || value === '' ? '—' : Number(value).toFixed(3),
    },

    {
      field: 'production',
      headerName: `Production (${unit})`,
      flex: 1,
      type: 'number',
      valueGetter: (value) => value ?? null,
      valueFormatter: (value) =>
        value == null || value === '' ? '—' : Number(value).toLocaleString(),
    },
  ]), [unit]);

  return (
    <SectionCard
      title={`Intensity (kg CO₂e / ${unit})`}
      subtitle={
        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="h5" component="p">
              {latestMedian.toLocaleString()} <Typography variant="body2" component="span" color="text.secondary">median</Typography>
            </Typography>
            {deltaPct != null && (
              <Chip
                size="small"
                color={deltaPct >= 0 ? 'error' : 'success'}
                label={`${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%`}
              />
            )}
          </Stack>
          {lastIdx != null && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Year: {years[lastIdx]}
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
        <BarChart
          borderRadius={8}
          colors={colors}
          xAxis={[{
            scaleType: 'band',
            categoryGapRatio: 0.45,
            data: years,
            height: 26,
          }]}
          yAxis={[{ width: 60 }]}
          series={[
            { id: 'p10', label: 'P10',   data: p10 },
            { id: 'p50', label: 'Median', data: p50 },
            { id: 'p90', label: 'P90',   data: p90 },
          ]}
          height={200}
          margin={{ left: 6, right: 6, top: 16, bottom: 4 }}
          grid={{ horizontal: true }}
          hideLegend
        />
      )}

      <div style={{ height: 200, width: '100%', marginTop: 8 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 300 } } }}
          initialState={{
            sorting: { sortModel: [{ field: 'year', sort: 'desc' }] },
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          pageSizeOptions={[10, 25, 50]}
          density="compact"
          disableRowSelectionOnClick
        />
      </div>
    </SectionCard>
  );
}
