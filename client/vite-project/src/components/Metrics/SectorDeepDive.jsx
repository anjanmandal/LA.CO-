// src/components/analytics/SectorDeepDive.jsx
import { useMemo, useState, useId } from 'react';
import { useTheme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import {
  Backdrop,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Typography,
  alpha,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import BarChartIcon from '@mui/icons-material/BarChartRounded';
import { LineChart } from '@mui/x-charts/LineChart';
import { getSectorDeepDive } from '../../api/metrics';
import SectionCard from '../common/SectionCard';
import YearRange from '../common/YearRange';
import { PanelError } from '../common/LoadState';
import { fmtInt, fmtPercent } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

const MAX_SECTORS = 6;

/* ---------- small helpers ---------- */

const slug = (s) =>
  (s || 'unknown')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

const palette = (theme) => [
  theme.palette.primary.dark,
  theme.palette.primary.main,
  theme.palette.secondary.main,
  theme.palette.info.main,
  theme.palette.success.main,
  theme.palette.warning.main,
  theme.palette.error.main,
];

const pickColor = (theme, key) => {
  const list = palette(theme);
  // simple deterministic hash to spread sectors across palette
  let h = 0;
  const s = String(key || '');
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return list[h % list.length];
};

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

/* ---------- Waterfall (modernized) ---------- */

function WaterfallList({ items }) {
  if (!items?.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        Not enough subsector data to compute contributions.
      </Typography>
    );
  }

  const maxAbs = Math.max(...items.map((i) => Math.abs(i.delta))) || 1;

  return (
    <Stack spacing={1.25}>
      {items.map((item) => {
        const width = Math.max(4, Math.min(100, (Math.abs(item.delta) / maxAbs) * 100));
        const positive = item.delta >= 0;
        return (
          <Stack key={`${item.subsector}-${item.delta}`} spacing={0.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" noWrap title={item.subsector}>
                {item.subsector}
              </Typography>
              <Chip
                size="small"
                color={positive ? 'success' : 'warning'}
                variant="outlined"
                label={`${positive ? '+' : ''}${fmtInt(item.delta)} t`}
              />
            </Stack>
            <Box
              sx={{
                position: 'relative',
                height: 10,
                borderRadius: 999,
                bgcolor: (t) => alpha(t.palette.text.primary, 0.08),
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${width}%`,
                  bgcolor: (t) => (positive ? t.palette.success.main : t.palette.warning.main),
                  opacity: 0.85,
                }}
              />
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}

/* ---------- Sector summary card ---------- */

function SectorCard({ sector, theme, onOpen }) {
  const idBase = useId();
  const gradId = `grad-${slug(sector.sector)}-${idBase}`;
  const color = pickColor(theme, sector.sector);

  const years = sector.totals?.map((t) => t.year) ?? [];
  const values = sector.totals?.map((t) => t.value ?? 0) ?? [];
  const latestPct = sector.latest?.pctChange ?? null;
  const latestDelta = sector.latest?.delta ?? null;

  const TrendIcon = latestPct >= 0 ? TrendingUpIcon : TrendingDownIcon;
  const trendColor = latestPct >= 0 ? 'success' : 'warning';

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        height: '100%',
        transition: 'transform .15s ease, box-shadow .15s ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
      }}
    >
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor: alpha(color, 0.15),
                display: 'grid',
                placeItems: 'center',
                color,
              }}
            >
              <BarChartIcon fontSize="small" />
            </Box>
            <Typography variant="subtitle1" fontWeight={700} noWrap title={sector.sector}>
              {sector.sector || 'Unknown sector'}
            </Typography>
          </Stack>

          {latestPct != null && (
            <Chip
              size="small"
              color={trendColor}
              icon={<TrendIcon sx={{ fontSize: 16 }} />}
              label={fmtPercent(latestPct)}
              variant="outlined"
            />
          )}
        </Stack>

        {/* Mini sparkline */}
        {years.length > 1 ? (
          <LineChart
            height={120}
            xAxis={[
              {
                data: years,
                scaleType: 'point',
                tickInterval: (_v, i) => i % 2 === 0,
                valueFormatter: (v) => String(v),
              },
            ]}
            yAxis={[{ width: 40 }]}
            series={[
              {
                id: 's',
                data: values,
                area: true,
                showMark: false,
                curve: 'linear',
                color,
              },
            ]}
            margin={{ left: 8, right: 8, top: 10, bottom: 12 }}
            grid={{ horizontal: true }}
            sx={{
              '& .MuiLineElement-root': { strokeWidth: 2 },
              '& .MuiAreaElement-root': { fill: `url(#${gradId})` },
            }}
          >
            <AreaGradient color={color} id={gradId} />
          </LineChart>
        ) : (
          <Skeleton variant="rectangular" height={120} />
        )}

        {/* Details */}
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            Latest change
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {latestDelta != null ? `${fmtInt(latestDelta)} t vs previous year` : 'No previous year available'}
          </Typography>
        </Stack>

        <Box sx={{ flexGrow: 1 }} />

        <Button variant="outlined" size="small" onClick={() => onOpen(sector)}>
          View details
        </Button>
      </CardContent>
    </Card>
  );
}

/* ---------- Main component ---------- */

export default function SectorDeepDive({ allowedRoles = ['operator', 'regulator', 'admin'] }) {
  const { user } = useAuth();
  const role = user?.role ?? 'guest';
  const theme = useTheme();

  const allowed = allowedRoles.includes(role);
  if (!allowed) return null;

  const currentYear = new Date().getUTCFullYear();
  const [from, setFrom] = useState(currentYear - 5);
  const [to, setTo] = useState(currentYear);

  const { data, isLoading, error } = useQuery({
    queryKey: ['metrics', 'sectorDeepDive', { from, to }],
    queryFn: () => getSectorDeepDive({ from, to }),
    keepPreviousData: true,
  });

  const sectors = useMemo(() => {
    if (!data?.sectors?.length) return [];
    return data.sectors
      .map((s) => ({
        ...s,
        latestPctAbs: Math.abs(s?.latest?.pctChange ?? 0),
      }))
      .sort((a, b) => b.latestPctAbs - a.latestPctAbs)
      .slice(0, MAX_SECTORS);
  }, [data]);

  const [selected, setSelected] = useState(null);

  const detailYears = useMemo(() => selected?.totals?.map((t) => t.year) ?? [], [selected]);
  const detailValues = useMemo(() => selected?.totals?.map((t) => t.value ?? 0) ?? [], [selected]);

  const detailColor = pickColor(theme, selected?.sector);
  const gradDetailId = `grad-detail-${slug(selected?.sector || '')}`;

  return (
    <SectionCard
      title="Sector deep dive"
      subtitle="Year-over-year percent change with subsector contributions"
      actions={<YearRange from={from} to={to} setFrom={setFrom} setTo={setTo} />}
    >
      <PanelError message={error?.message} />

      {isLoading && !data ? (
        <Stack spacing={2}>
          <Skeleton variant="rectangular" height={220} />
          <Skeleton variant="rectangular" height={220} />
        </Stack>
      ) : !sectors.length ? (
        <Typography variant="body2" color="text.secondary">
          No sector data available for the selected range.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {sectors.map((sector) => (
            <Grid key={sector.sector} item xs={12} md={6}>
              <SectorCard sector={sector} theme={theme} onOpen={setSelected} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Detail sheet */}
      <Backdrop
        open={Boolean(selected)}
        onClick={() => setSelected(null)}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          color: '#fff',
          p: 3,
          backdropFilter: 'blur(2px)',
          bgcolor: (t) => alpha(t.palette.background.default, 0.5),
        }}
      >
        {selected && (
          <Paper
            onClick={(e) => e.stopPropagation()}
            elevation={selected ? 6 : 0}
            sx={{
              width: { xs: '100%', sm: 560 },
              maxHeight: '90vh',
              overflowY: 'auto',
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Stack spacing={2}>
              {/* Header */}
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Stack spacing={0.25}>
                  <Typography variant="h6" fontWeight={800}>
                    {selected.sector || 'Unknown sector'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {from} – {to}
                  </Typography>
                </Stack>
                <IconButton size="small" onClick={() => setSelected(null)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>

              {/* Detail chart */}
              {detailYears.length > 1 ? (
                <LineChart
                  height={220}
                  xAxis={[
                    {
                      data: detailYears,
                      scaleType: 'point',
                      tickInterval: (_v, i) => i % 2 === 0,
                      valueFormatter: (v) => String(v),
                    },
                  ]}
                  yAxis={[{ width: 54 }]}
                  series={[
                    {
                      id: 'detail',
                      data: detailValues,
                      area: true,
                      showMark: true,
                      curve: 'linear',
                      color: detailColor,
                    },
                  ]}
                  margin={{ left: 12, right: 12, top: 16, bottom: 16 }}
                  grid={{ horizontal: true }}
                  sx={{
                    '& .MuiLineElement-root': { strokeWidth: 2.5 },
                    '& .MuiAreaElement-root': { fill: `url(#${gradDetailId})` },
                  }}
                >
                  <AreaGradient color={detailColor} id={gradDetailId} />
                </LineChart>
              ) : (
                <Skeleton variant="rectangular" height={220} />
              )}

              {/* YoY list */}
              <Stack spacing={1}>
                <Typography variant="subtitle2">Year-over-year change</Typography>
                {selected.yoy?.length ? (
                  <Stack spacing={0.75}>
                    {selected.yoy.map((row) => {
                      const up = (row.delta ?? 0) >= 0;
                      return (
                        <Stack
                          key={row.year}
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography variant="body2">{row.year}</Typography>
                          <Chip
                            size="small"
                            color={up ? 'success' : 'warning'}
                            variant="outlined"
                            icon={up ? <TrendingUpIcon /> : <TrendingDownIcon />}
                            label={`${fmtInt(row.delta)} t (${fmtPercent(row.pct)})`}
                          />
                        </Stack>
                      );
                    })}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Not enough history to compute year-over-year change.
                  </Typography>
                )}
              </Stack>

              <Divider />

              {/* Contributions */}
              <Stack spacing={1}>
                <Typography variant="subtitle2">Top subsector contributions</Typography>
                <WaterfallList items={selected.breakdown} />
              </Stack>
            </Stack>
          </Paper>
        )}
      </Backdrop>
    </SectionCard>
  );
}
