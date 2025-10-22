import { useEffect, useMemo, useState } from 'react';
import { alpha, Box, Stack, Typography, useTheme } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import SectionCard from '../../components/common/SectionCard';
import { PanelError, ChartSkeleton } from '../../components/common/LoadState';
import { getStateEmissionTotals } from '../../api/public';

export default function StateTotalsLine({ from = 2015, to = new Date().getFullYear(), limit = null }) {
  const theme = useTheme();
  const [data, setData] = useState({ years: [], states: [] });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr('');
    const params = { from, to };
    if (limit != null) params.limit = limit;
    getStateEmissionTotals(params)
      .then((payload) => {
        if (!alive) return;
        setData({
          years: Array.isArray(payload?.years) ? payload.years : [],
          states: Array.isArray(payload?.states) ? payload.states : [],
        });
      })
      .catch((error) => {
        if (alive) setErr(error?.message || 'Failed to load state totals');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [from, to, limit]);

  const years = data.years;
  const getPalette = useMemo(() => {
    const base = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.info.main,
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.error.main,
    ];
    return (index) => {
      const baseColor = base[index % base.length];
      const tier = Math.floor(index / base.length);
      if (tier === 0) return baseColor;
      const factor = 0.15 * tier;
      return theme.palette.mode === 'dark'
        ? alpha(baseColor, Math.max(0.25, 1 - factor))
        : alpha(baseColor, Math.max(0.35, 1 - factor));
    };
  }, [theme.palette]);

  const series = useMemo(() => (
    data.states.map((entry, idx) => ({
      id: entry.state,
      label: entry.state,
      data: years.map((year) => entry.totals.find((pt) => pt.year === year)?.total ?? 0),
      color: getPalette(idx),
      showMark: false,
      curve: 'linear',
      valueFormatter: (value) => (typeof value === 'number' ? value.toLocaleString() : value),
    }))
  ), [data.states, years, getPalette]);

  const latestYear = years.length ? years[years.length - 1] : null;

  return (
    <SectionCard
      title="State CO₂ Totals"
      subtitle={
        <Stack spacing={0.25}>
          <Typography variant="caption" color="text.secondary">
            Rolling totals by state · {from} – {to}
          </Typography>
          {latestYear && (
            <Typography variant="caption" color="text.secondary">
              Latest year: {latestYear}
            </Typography>
          )}
        </Stack>
      }
    >
      <PanelError message={err} />
      {loading ? (
        <ChartSkeleton />
      ) : years.length === 0 || series.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          State totals not available yet.
        </Typography>
      ) : (
        <Box sx={{ height: 380 }}>
          <LineChart
            height={380}
            xAxis={[{
              data: years,
              label: 'Year',
              scaleType: 'linear',
              valueFormatter: (value) => String(value),
              tickLabelStyle: { fontSize: 12 },
              min: Math.min(...years),
              max: Math.max(...years),
              height: 36,
            }]}
            yAxis={[{ label: 'Total CO₂ (t)' }]}
            series={series}
            grid={{ horizontal: true }}
            margin={{ left: 60, right: 24, top: 16, bottom: 40 }}
          />
        </Box>
      )}
    </SectionCard>
  );
}
