// src/components/analytics/StateTotalsChart.jsx
import { useEffect, useMemo, useState } from 'react';
import { Chip, Stack, Typography, useTheme } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import SectionCard from '../common/SectionCard';
import { PanelError, ChartSkeleton } from '../common/LoadState';
import { getStateEmissionTotals } from '../../api/public';

/* ---------- helpers ---------- */
const paletteFromTheme = (theme) => [
  theme.palette.primary.dark,
  theme.palette.primary.main,
  theme.palette.secondary.main,
  theme.palette.info.main,
  theme.palette.success.main,
  theme.palette.warning.main,
  theme.palette.error.main,
];

const slug = (s) =>
  (s || 'unknown')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

/** Soft gradient for area under each line */
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

/* ---------- component ---------- */
export default function StateTotalsChart() {
  const theme = useTheme();
  const [chart, setChart] = useState({ years: [], states: [] });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr('');

    getStateEmissionTotals({ limit: 5 })
      .then((data) => {
        if (!alive) return;
        setChart({
          years: Array.isArray(data?.years) ? data.years : [],
          states: Array.isArray(data?.states) ? data.states : [],
        });
      })
      .catch((error) => {
        if (alive) setErr(error?.message || 'Failed to load state totals');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => { alive = false; };
  }, []);

  const years = chart.years;
  const palette = paletteFromTheme(theme);

  // Build series with gradient-friendly IDs and colors
  const series = useMemo(() => {
    return chart.states.map((entry, idx) => {
      const points = years.map((year) => {
        const match = entry.totals.find((pt) => pt.year === year);
        return Number.isFinite(Number(match?.total)) ? Number(match.total) : 0;
      });
      const id = slug(entry.state);
      return {
        id,                // used for CSS class & gradient mapping
        label: entry.state,
        data: points,
        color: palette[idx % palette.length],
        showMark: false,
        area: true,        // soft area under line
        curve: 'linear',
        lineWidth: 2,
        valueFormatter: (v) =>
          typeof v === 'number' ? v.toLocaleString() : String(v ?? ''),
        _color: palette[idx % palette.length], // internal for gradient element
      };
    });
  }, [chart.states, years, palette]);

  // Attach gradients to the correct series classnames
  const areaFillSx = useMemo(() => {
    const rules = {};
    series.forEach((s) => {
      rules[`& .MuiAreaElement-series-${s.id}`] = { fill: `url('#grad-${s.id}')` };
    });
    return rules;
  }, [series]);

  // Header metrics (sum of shown states for latest year vs previous)
  const totals = useMemo(() => {
    if (!years.length) return { latest: 0, prev: null, label: '' };
    const last = years[years.length - 1];
    const prev = years.length >= 2 ? years[years.length - 2] : null;

    const sumForYear = (yr) =>
      chart.states.reduce((acc, st) => {
        const val = st.totals.find((t) => t.year === yr)?.total ?? 0;
        return acc + (Number.isFinite(Number(val)) ? Number(val) : 0);
      }, 0);

    return {
      latest: sumForYear(last),
      prev: prev == null ? null : sumForYear(prev),
      label: String(last),
    };
  }, [chart.states, years]);

  const deltaPct = useMemo(() => {
    if (totals.prev == null || totals.prev === 0) return null;
    return ((totals.latest - totals.prev) / totals.prev) * 100;
  }, [totals]);

  return (
    <SectionCard
      title="Top State Emissions"
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
            Sum for shown states in {totals.label}
          </Typography>
        </Stack>
      }
    >
      <PanelError message={err} />
      {loading ? (
        <ChartSkeleton />
      ) : years.length === 0 || series.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No state totals available yet. Import state emissions to populate this chart.
        </Typography>
      ) : (
        <LineChart
          xAxis={[{
            data: years,
            scaleType: 'point',
            tickInterval: (_v, i) => i % 2 === 0,        // reduce crowding
            valueFormatter: (v) => String(v),
            tickLabelStyle: { fontSize: 12 },
            height: 30,
          }]}
          yAxis={[{
            label: 'Total CO₂e (t)',
            labelStyle: { fontSize: 12 },
            width: 64,
          }]}
          series={series.map(({ _color, ...rest }) => rest)}
          height={360}
          margin={{ left: 70, right: 24, top: 16, bottom: 36 }} // space for ticks/labels
          grid={{ horizontal: true }}
          // keep legend visible so users see state→color mapping
          // set to hideLegend if you want a cleaner look
          hideLegend={false}
          sx={{ ...areaFillSx }}
        >
          {series.map((s) => (
            <AreaGradient key={s.id} id={`grad-${s.id}`} color={s._color} />
          ))}
        </LineChart>
      )}
    </SectionCard>
  );
}
