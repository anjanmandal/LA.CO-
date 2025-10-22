// src/pages/PublicPortalPage.jsx
import { useEffect, useMemo, useState, Fragment } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, Divider, LinearProgress,
  Stack, TextField, Typography, MenuItem, alpha, useTheme
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { BarChart } from '@mui/x-charts/BarChart';

import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import {
  getOverview, getPublicProjects,
  downloadEmissionsCsv, downloadProjectsCsv,
  explainChart
} from '../api/public';
import CivicBriefCard from '../components/public/CivicBriefCard';
import StateTotalsLine from '../components/public/StateTotalsLine';
import { Link as RouterLink } from 'react-router-dom';

// --- Leaflet marker icons (Vite fix)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
  iconUrl:       new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
  shadowUrl:     new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
});

// --- helpers
const toLatLng = (c) => [c[1], c[0]];
const polygonFromGeoJSON = (geom) =>
  geom?.type === 'Polygon' ? geom.coordinates?.[0]?.map(toLatLng) : null;

// Ensures Leaflet recomputes canvas size after the layout settles
function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t = setTimeout(() => map.invalidateSize(), 60);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function MapAutoFit({ projects }) {
  const map = useMap();
  useEffect(() => {
    const pts = (projects || [])
      .map((p) => p.location?.coordinates)
      .filter((c) => Array.isArray(c) && c.length === 2)
      .map(toLatLng);
    if (pts.length >= 2) {
      const bounds = L.latLngBounds(pts);
      map.fitBounds(bounds.pad(0.15), { animate: true, duration: 0.6 });
    } else if (pts.length === 1) {
      map.setView(pts[0], 9, { animate: true });
    }
  }, [projects, map]);
  return null;
}

/** Minimal stat with left accent bar, no pill/gradient */
function StatCard({ title, value, suffix }) {
  const theme = useTheme();
  const accent = theme.palette.mode === 'dark'
    ? alpha(theme.palette.primary.main, 0.6)
    : theme.palette.primary.main;

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', bgcolor: 'background.paper' }}>
      <Box sx={{ display: 'flex' }}>
        <Box sx={{ width: 4, bgcolor: accent }} />
        <CardContent sx={{ py: 1.5, px: 2 }}>
          <Typography variant="caption" color="text.secondary">{title}</Typography>
          <Stack direction="row" alignItems="baseline" spacing={0.75} sx={{ mt: 0.25 }}>
            <Typography variant="h5" fontWeight={800}>
              {(value ?? 0).toLocaleString?.() ?? value}
            </Typography>
            {suffix && <Typography variant="caption" color="text.secondary">{suffix}</Typography>}
          </Stack>
        </CardContent>
      </Box>
    </Card>
  );
}

export default function PublicPortalPage() {
  const theme = useTheme();

  // Filters
  const [from, setFrom] = useState(2015);
  const [to, setTo]     = useState(2025);

  // Data
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [projects, setProjects] = useState([]);
  const [caption, setCaption]   = useState('');
  const [error, setError]       = useState('');

  // Load data
  const refresh = async () => {
    setError('');
    setLoading(true);
    try {
      const [ov, pj] = await Promise.all([
        getOverview({ from, to }),
        getPublicProjects()
      ]);
      setOverview(ov);
      setProjects(Array.isArray(pj) ? pj : []);
      setCaption('');
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);         // on mount
  useEffect(() => { refresh(); }, [from, to]); // on filter change

  // Chart prep: stacked by sector each year
  const years = useMemo(
    () => [...new Set(overview?.chart?.map(d => d.year) ?? [])].sort((a,b)=>a-b),
    [overview]
  );
  const sectors = useMemo(() => overview?.sectors ?? [], [overview]);

  const dataset = useMemo(() => {
    const map = new Map();
    for (const y of years) map.set(y, { year: y });
    for (const r of (overview?.chart ?? [])) {
      const row = map.get(r.year);
      row[r.sector] = (row[r.sector] || 0) + r.co2eTonnes;
    }
    return Array.from(map.values());
  }, [overview, years]);

  const onExplain = async () => {
    if (!overview?.chart?.length) return;
    const series = sectors.map(sec => ({
      id: sec,
      data: dataset.map(row => Number(row[sec] || 0)),
      x: years,
    }));
    const sources = overview?.sources ?? [];
    const out = await explainChart({
      chartType: 'stackedBar',
      series,
      filters: { from, to },
      sources
    });
    setCaption(out.caption);
  };

  // Projects table rows
  const projRows = (projects || []).map((p, i) => ({
    id: p._id || i,
    name: p.name,
    status: p.status,
    lng: p.location?.coordinates?.[0] ?? null,
    lat: p.location?.coordinates?.[1] ?? null,
    vol30_tCO2: p.kpi?.vol30_tCO2 ?? 0,
    maxP30_psi: p.kpi?.maxP30_psi ?? 0,
    risk: p.kpi?.risk ?? 0
  }));

  // Bar colors
  const colorPalette = [
    (theme.vars || theme).palette.primary.dark,
    (theme.vars || theme).palette.primary.main,
    (theme.vars || theme).palette.primary.light,
    (theme.vars || theme).palette.secondary.main,
    (theme.vars || theme).palette.info.main,
    (theme.vars || theme).palette.success.main,
    (theme.vars || theme).palette.warning.main,
    (theme.vars || theme).palette.error.main,
  ];

  return (
    <Stack spacing={2}>
      {/* Subtle header */}
      <Card sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper', borderColor: 'divider' }} variant="outlined">
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={1.25}>
          <Stack spacing={0.25}>
            <Typography variant="h4" fontWeight={800}>Louisiana Carbon Transparency</Typography>
            <Typography color="text.secondary">Read-only map & charts with downloads and plain-language captions.</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <TextField
              select size="small" label="From" value={from} onChange={(e)=>setFrom(Number(e.target.value))}
              sx={{ minWidth: 120 }}
            >
              {Array.from({length: 11}, (_,i)=>2015+i).map(y=>(
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </TextField>
            <TextField
              select size="small" label="To" value={to} onChange={(e)=>setTo(Number(e.target.value))}
              sx={{ minWidth: 120 }}
            >
              {Array.from({length: 11}, (_,i)=>2015+i).map(y=>(
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </TextField>
            <Button component={RouterLink} to="/public/state-emissions" variant="outlined">
              State emissions view
            </Button>
            <Button variant="outlined" onClick={refresh}>Refresh</Button>
          </Stack>
        </Stack>
      </Card>

      {loading && <LinearProgress />}
      {error && <Alert severity="error">{error}</Alert>}

      {/* Top section: map + fixed rail (CSS grid) */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>CCUS Projects — Map</Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 360px' }, // fixed rail width
              gap: 2,
              alignItems: 'stretch',
              minHeight: { xs: 420, md: 520 },
            }}
          >
            {/* MAP pane */}
            <Box
              sx={{
                minWidth: 0,
                borderRadius: 1.5,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                height: '100%',
              }}
            >
              <MapContainer center={[30.5, -91.2]} zoom={9} style={{ height: '100%', width: '100%' }}>
                <MapInvalidateSize />
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapAutoFit projects={projects} />
                {(projects || []).map((p) => {
                  const ll = p.location?.coordinates;
                  const poly = polygonFromGeoJSON(p.boundary);
                  return (
                    <Fragment key={p._id || p.name}>
                      {ll && (
                        <Marker position={toLatLng(ll)}>
                          <Popup>
                            <div>
                              <b>{p.name}</b><br />
                              Status: {p.status || '—'}<br />
                              Injected (30d): {p.kpi?.vol30_tCO2?.toLocaleString?.() ?? 0} tCO₂
                            </div>
                          </Popup>
                        </Marker>
                      )}
                      {poly && <Polygon positions={poly} pathOptions={{ color: '#22c55e', weight: 2 }} />}
                    </Fragment>
                  );
                })}
              </MapContainer>
            </Box>

            {/* RIGHT rail */}
            <Stack spacing={1.25}>
              <StatCard title="Projects online" value={projects.length} suffix="count" />
              <StatCard
                title="30-day injected (all projects)"
                value={(projects || []).reduce((s,p)=>s+(p.kpi?.vol30_tCO2||0),0)}
                suffix="tCO₂"
              />
              <StatCard
                title="Max surface pressure (30d)"
                value={Math.max(0, ...(projects.map(p=>p.kpi?.maxP30_psi||0)))}
                suffix="psi"
              />
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Downloads</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button onClick={()=>downloadProjectsCsv()} variant="outlined">Projects CSV</Button>
                    <Button variant="outlined" onClick={()=>downloadEmissionsCsv({ from, to })}>Emissions CSV</Button>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Box>
      </CardContent>
    </Card>

    <StateTotalsLine from={from} to={to} />

    {/* Emissions stacked chart + explain + CSV */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Stack direction={{ xs:'column', md:'row' }} alignItems={{ xs:'flex-start', md:'center' }} justifyContent="space-between" gap={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Observed emissions by sector</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button onClick={onExplain} disabled={!overview?.chart?.length}>Explain this chart</Button>
              <Button variant="outlined" onClick={()=>downloadEmissionsCsv({ from, to })}>Download CSV</Button>
            </Stack>
          </Stack>

          {(!overview?.chart?.length) ? (
            <Typography color="text.secondary" sx={{ mt: 2 }}>No data</Typography>
          ) : (
            <Box sx={{ mt: 2 }}>
              <BarChart
                dataset={dataset}
                colors={colorPalette}
                xAxis={[{
                  scaleType: 'band',
                  dataKey: 'year',
                  categoryGapRatio: 0.4,
                  height: 28,
                }]}
                yAxis={[{ width: 64 }]}
                series={sectors.map((s) => ({ dataKey: s, label: s, stack: 'total' }))}
                height={360}
                grid={{ horizontal: true }}
                margin={{ left: 8, right: 8, top: 8, bottom: 6 }}
              />
            </Box>
          )}

          {!!caption && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2">AI caption</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{caption}</Typography>
              <Typography variant="caption" color="text.secondary">
                Source: Climate TRACE (dataset tags in CSV download)
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      {/* Projects table */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Projects</Typography>
          <div style={{ height: 460 }}>
            <DataGrid
              rows={projRows}
              columns={[
                { field: 'name', headerName: 'Name', flex: 1, minWidth: 220 },
                { field: 'status', headerName: 'Status', width: 140 },
                { field: 'vol30_tCO2', headerName: '30d Injected (tCO₂)', width: 200,
                  valueFormatter: p => (p.value ?? 0).toLocaleString() },
                { field: 'maxP30_psi', headerName: 'Max Surface (psi)', width: 180 },
                { field: 'risk', headerName: 'Risk', width: 120,
                  renderCell: (p)=><Chip size="small" color={p.value>85?'error':p.value>70?'warning':'success'} label={p.value ?? 0} /> },
              ]}
              getRowId={(r)=>r.id}
              pageSizeOptions={[10,25,50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10, page: 0 } },
                sorting: { sortModel: [{ field: 'vol30_tCO2', sort: 'desc' }] },
              }}
              density="comfortable"
              disableRowSelectionOnClick
              sx={{
                '& .MuiDataGrid-cell': { alignItems: 'center' },
                '& .MuiDataGrid-columnHeaders': { fontWeight: 700 },
              }}
            />
          </div>
         
        </CardContent>
      </Card>
    </Stack>
  );
}
