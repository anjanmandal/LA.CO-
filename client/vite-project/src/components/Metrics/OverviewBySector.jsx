// src/components/Metrics/OverviewBySector.jsx
import { useEffect, useMemo, useState } from 'react';
import { Chip, Stack, Typography, useTheme } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import SectionCard from '../common/SectionCard';
import YearRange from '../common/YearRange';
import { PanelError, ChartSkeleton } from '../common/LoadState';
import { getOverview } from '../../api/metrics';

// Reuse the gradient pattern like your Sessions chart
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

const slug = (s) => (s || 'unknown').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export default function OverviewBySector() {
  const theme = useTheme();
  const [from, setFrom] = useState(2020);
  const [to, setTo] = useState(2025);
  const [data, setData] = useState({ series: {}, years: [] });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  // fetch
  useEffect(() => {
    let alive = true;
    setLoading(true);
    getOverview({ from, to })
      .then((d) => { if (alive) setData(d || { series: {}, years: [] }); })
      .catch((e) => { if (alive) setErr(e.message); })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [from, to]);

  const years = data?.years || [];
  const sectors = useMemo(() => Object.keys(data?.series || {}), [data]);

  // theme-driven palette (cycle as needed)
  const palette = [
    theme.palette.primary.dark,
    theme.palette.primary.main,
    theme.palette.primary.light,
    theme.palette.secondary.main,
    theme.palette.info.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
  ];

  // Series → stacked areas with unique gradient per sector
  const lines = useMemo(() => {
    return sectors.map((sec, idx) => {
      const points = years.map((y) => data.series[sec]?.find?.((p) => p.year === y)?.value ?? 0);
      return {
        id: slug(sec),            // used for CSS selector + gradient hook
        label: sec || 'unknown',  // visible label
        data: points,
        showMark: false,
        curve: 'linear',
        stack: 'total',
        area: true,
        stackOrder: 'ascending',
        _color: palette[idx % palette.length], // internal: used for gradient fill
      };
    });
  }, [sectors, years, data, palette]);

  // Build sx rules to attach the gradients to the correct series
  const areaFillSx = useMemo(() => {
    const rules = {};
    lines.forEach((s) => {
      rules[`& .MuiAreaElement-series-${s.id}`] = { fill: `url('#grad-${s.id}')` };
    });
    return rules;
  }, [lines]);

  // Top metric & delta chip (sum across sectors for last year vs previous year)
  const totals = useMemo(() => {
    if (!years.length) return { latest: 0, prev: 0 };
    const last = years[years.length - 1];
    const prev = years.length >= 2 ? years[years.length - 2] : null;
    const sumForYear = (yr) =>
      sectors.reduce((acc, sec) => {
        const v = data.series[sec]?.find?.((p) => p.year === yr)?.value ?? 0;
        return acc + (Number.isFinite(v) ? v : 0);
      }, 0);
    return {
      latest: sumForYear(last),
      prev: prev == null ? null : sumForYear(prev),
      label: String(last),
    };
  }, [years, sectors, data]);

  const deltaPct = useMemo(() => {
    if (totals.prev == null || totals.prev === 0) return null;
    return ((totals.latest - totals.prev) / totals.prev) * 100;
  }, [totals]);

  const actions = (
    <YearRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
  );

  return (
    <SectionCard
      title="Totals by Sector (Observed)"
      actions={actions}
      // Subtitle area mirrors the Sessions header layout
      subtitle={
        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography variant="h4" component="p">
              {totals.latest.toLocaleString()}
            </Typography>
            {deltaPct != null && (
              <Chip
                size="small"
                color={deltaPct >= 0 ? 'success' : 'error'}
                label={`${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%`}
              />
            )}
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Total across sectors in {totals.label}
          </Typography>
        </Stack>
      }
    >
      <PanelError message={err} />
      {loading ? (
        <ChartSkeleton />
      ) : (
        <LineChart
          xAxis={[{
            data: years,
            label: 'Year',
            scaleType: 'point',
            tickInterval: (value, index) => (index % 2 === 0), // reduce crowding
            height: 30,
          }]}
          yAxis={[{ width: 60 }]}
          series={lines.map(({ _color, ...rest }) => rest)}
          height={400}
          margin={{ left: 6, right: 18, top: 16, bottom: 4 }}
          grid={{ horizontal: true }}
          hideLegend
          sx={{
            ...areaFillSx,
          }}
        >
          {lines.map((s) => (
            <AreaGradient key={s.id} id={`grad-${s.id}`} color={s._color} />
          ))}
        </LineChart>
      )}
    </SectionCard>
  );
}
