// src/pages/CcusProjectPage.jsx
import { useEffect, useMemo, useState, Fragment } from 'react';
import {
  Box, Card, CardContent, Chip, Divider, Grid, Stack, Typography,
  Button, TextField, MenuItem, LinearProgress, IconButton, Tooltip,
  alpha, useTheme, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import WaterRoundedIcon from '@mui/icons-material/WaterRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';

import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default marker icons (Vite)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
  iconUrl:       new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
  shadowUrl:     new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
});

// API
import { getProject, getInjectionSeries, listProjects, runGeoAlerts, listAlerts } from '../api/ccus';

// Helpers
const getLatLng = (coord) => [coord[1], coord[0]];
const polygonFromGeoJSON = (geom) => {
  if (!geom || geom.type !== 'Polygon' || !geom.coordinates?.[0]) return null;
  return geom.coordinates[0].map(getLatLng);
};
const polylineFromGeoJSON = (geom) => {
  if (!geom || geom.type !== 'LineString' || !geom.coordinates) return null;
  return geom.coordinates.map(getLatLng);
};
const hasGeom = (g) => g && typeof g === 'object' && g.type && g.coordinates;

// Build bounds from visible layers
const boundsFromLayers = ({ boundaryLatLngs, pipeLines, wellMarkers }) => {
  let b = null;
  if (boundaryLatLngs?.length) b = L.latLngBounds(boundaryLatLngs);
  (pipeLines || []).forEach(pl => {
    if (pl?.latlngs?.length) b = b ? b.extend(L.latLngBounds(pl.latlngs)) : L.latLngBounds(pl.latlngs);
  });
  (wellMarkers || []).forEach(w => {
    if (w?.pos) b = b ? b.extend(w.pos) : L.latLngBounds([w.pos, w.pos]);
  });
  return b;
};

// --- Map helpers (size + autofit)
function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t = setTimeout(() => map.invalidateSize(), 60);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function MapAutoFit({ boundaryLatLngs, pipeLines, wellMarkers, fallback }) {
  const map = useMap();
  useEffect(() => {
    const b = boundsFromLayers({ boundaryLatLngs, pipeLines, wellMarkers });
    if (b) map.fitBounds(b.pad(0.2));
    else if (fallback) map.setView(fallback, 9);
  }, [boundaryLatLngs, pipeLines, wellMarkers, fallback, map]);
  return null;
}

// --- Map HUD
function MapHud({ basemap, setBasemap, fitData, centerFallback }) {
  const map = useMap();
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        position: 'absolute', top: 12, right: 12, zIndex: 1000,
        p: 1, borderRadius: 2, bgcolor: (t) => alpha(t.palette.background.paper, 0.85),
        backdropFilter: 'blur(6px)', boxShadow: 2, alignItems: 'center'
      }}
    >
      <ToggleButtonGroup
        size="small" exclusive value={basemap} onChange={(_, v)=>v && setBasemap(v)}
        sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
      >
        <ToggleButton value="osm">OSM</ToggleButton>
        <ToggleButton value="hot">HOT</ToggleButton>
        <ToggleButton value="light">Light</ToggleButton>
        <ToggleButton value="dark">Dark</ToggleButton>
      </ToggleButtonGroup>

      <Tooltip title="Fit to project">
        <IconButton
          size="small" color="primary"
          onClick={()=>{
            const b = boundsFromLayers(fitData);
            if (b) map.fitBounds(b.pad(0.2));
            else if (centerFallback) map.setView(centerFallback, 9);
            setTimeout(()=>map.invalidateSize(), 0);
          }}
        >
          <MyLocationRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

function MapLegend() {
  return (
    <Box
      sx={{
        position: 'absolute', bottom: 12, left: 12, zIndex: 1000,
        p: 1.1, borderRadius: 1.5, bgcolor: (t)=>alpha(t.palette.background.paper, 0.9),
        backdropFilter: 'blur(6px)', boxShadow: 1, fontSize: 12, lineHeight: 1.3,
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 18, height: 2, bgcolor: '#22c55e' }} />
          <span>Boundary</span>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 18, height: 0, borderBottom: '2px dashed #64748b' }} />
          <span>Pipeline</span>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#2563eb', border: '1px solid #fff' }} />
          <span>Well</span>
        </Stack>
      </Stack>
    </Box>
  );
}

// KPI chip
const RiskChip = ({ risk = 0 }) => {
  const level = risk > 85 ? 'error' : risk > 70 ? 'warning' : 'success';
  return <Chip size="small" color={level} label={risk} />;
};

// Minimal stat card with accent
function StatCard({ icon: Icon, title, value, suffix, color = 'primary' }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex' }}>
        <Box sx={{ width: 4, bgcolor: (t)=>t.palette[color].main }} />
        <CardContent sx={{ py: 1.75, px: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: .5 }}>
            {Icon ? <Icon fontSize="small" /> : null}
            <Typography variant="caption" color="text.secondary">{title}</Typography>
          </Stack>
          <Stack direction="row" alignItems="baseline" spacing={0.75}>
            <Typography variant="h5" fontWeight={800}>{(value ?? 0).toLocaleString?.() ?? value}</Typography>
            {suffix && <Typography variant="caption" color="text.secondary">{suffix}</Typography>}
          </Stack>
        </CardContent>
      </Box>
    </Card>
  );
}

export default function CcusProjectPage() {
  const theme = useTheme();

  // Data
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [proj, setProj] = useState(null); // { project, wells, pipes, kpi }
  const [series, setSeries] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Basemap
  const [basemap, setBasemap] = useState('osm');

  // Load projects
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const p = await listProjects();
        setProjects(Array.isArray(p) ? p : []);
        if (p?.[0]?._id) setProjectId(p[0]._id);
      } finally { setLoading(false); }
    })();
  }, []);

  // Load one project + series + alerts
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      setLoading(true);
      try {
        const d = await getProject(projectId);
        setProj(d || null);

        const from = new Date(Date.now() - 120 * 86400e3).toISOString();
        const s = await getInjectionSeries(projectId, { from });
        setSeries(Array.isArray(s) ? s : []);

        const a = await listAlerts(projectId);
        setAlerts(Array.isArray(a) ? a : []);
      } finally { setLoading(false); }
    })();
  }, [projectId]);

  // Map center fallback
  const center = useMemo(() => {
    const c = proj?.project?.location?.coordinates;
    if (Array.isArray(c) && c.length === 2) return getLatLng(c);
    return [30.5, -91.2];
  }, [proj]);

  const boundaryLatLngs = useMemo(() => polygonFromGeoJSON(proj?.project?.boundary), [proj]);

  const wellMarkers = useMemo(() => {
    const wells = proj?.wells || [];
    return wells.map((w) => {
      const coords = w?.surface?.coordinates;
      if (!Array.isArray(coords) || coords.length !== 2) return null;
      return { id: w._id || w.name, name: w.name, status: w.status, pos: getLatLng(coords) };
    }).filter(Boolean);
  }, [proj]);

  const pipeLines = useMemo(() => {
    const pipes = proj?.pipes || [];
    return pipes.map((pl, idx) => {
      const latlngs = polylineFromGeoJSON(pl.geometry);
      if (!latlngs) return null;
      return { id: pl._id || `pipe-${idx}`, name: pl.name, latlngs };
    }).filter(Boolean);
  }, [proj]);

  const k = proj?.kpi;

  // Grid
  const rows = useMemo(() => (series || []).map((r, i) => ({
    id: r._id || `${i}-${r?.date ?? 'na'}`, ...r
  })), [series]);

  const columns = [
    {
      field: 'date', headerName: 'Date', width: 160,
      valueGetter: (p) => { const d = p; return d ? new Date(d) : null; },
      valueFormatter: (p) => p instanceof Date ? p.toLocaleDateString() : '—',
      sortComparator: (a, b) => (a?.getTime?.() ?? 0) - (b?.getTime?.() ?? 0),
    },
    { field: 'wellId', headerName: 'Well', width: 220 },
    { field: 'volume_tCO2', headerName: 'Volume (tCO₂)', width: 160,
      valueFormatter: (p) => (p ?? 0).toLocaleString() },
    { field: 'avgTubingPressure_psi', headerName: 'Avg tubing (psi)', width: 180 },
    { field: 'maxSurfacePressure_psi', headerName: 'Max surface (psi)', width: 180 },
    { field: 'source', headerName: 'Source', width: 120 },
  ];

  // Basemaps
  const baseUrl =
    basemap === 'hot'   ? 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png' :
    basemap === 'light' ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' :
    basemap === 'dark'  ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' :
                          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  // Header style
  const headerBg = `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.14)}, ${alpha(theme.palette.secondary.main, 0.08)})`;

  return (
    <Stack spacing={2}>
      {/* HEADER */}
      <Card sx={{ p: 2, borderRadius: 3, background: headerBg }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <MapRoundedIcon />
            <Typography variant="h5" fontWeight={800}>CCUS Projects</Typography>
            {proj?.project?.classType && <Chip size="small" label={`Class ${proj.project.classType}`} sx={{ ml: 1 }} />}
            {proj?.project?.operator && <Chip size="small" variant="outlined" label={proj.project.operator} sx={{ ml: 1 }} />}
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <TextField
              select size="small" label="Project"
              value={projectId} onChange={(e)=>setProjectId(e.target.value)}
              sx={{ minWidth: 260, bgcolor: 'background.paper' }}
            >
              {projects.map(p => <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>)}
            </TextField>

            <Tooltip title="Refresh data">
              <span>
                <IconButton onClick={()=>setProjectId(p=>p)} disabled={!projectId}>
                  <RefreshRoundedIcon />
                </IconButton>
              </span>
            </Tooltip>

            <Button
              startIcon={<PlayCircleOutlineRoundedIcon />}
              variant="contained"
              onClick={async ()=>{
                if (!projectId) return;
                await runGeoAlerts(projectId);
                const a = await listAlerts(projectId);
                setAlerts(Array.isArray(a) ? a : []);
              }}
            >
              Run Geo-alerts
            </Button>
          </Stack>
        </Stack>
      </Card>

      {loading && <LinearProgress />}

      {/* KPIs */}
      {k && (
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={4}>
            <StatCard icon={WaterRoundedIcon} title="Injected (30d)" value={k?.vol30_tCO2 ?? 0} suffix="tCO₂" color="primary" />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatCard icon={SpeedRoundedIcon} title="Max surface (30d)" value={k?.maxP30_psi ?? 0} suffix="psi" color="warning" />
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ display: 'flex' }}>
                <Box sx={{ width: 4, bgcolor: (t)=>t.palette.error.main }} />
                <CardContent sx={{ py: 1.75, px: 2 }}>
                  <Typography variant="caption" color="text.secondary">Risk score</Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: .5 }}>
                    <Typography variant="h5" fontWeight={800}>{k?.risk ?? 0}</Typography>
                    <RiskChip risk={k?.risk ?? 0} />
                  </Stack>
                </CardContent>
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* MAP + RAIL (modern, wide) */}
      {proj ? (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              {proj.project?.name || 'Project'} — Map
            </Typography>

            {/* CSS grid: map expands, rail stays fixed */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 360px' },
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
                  position: 'relative',
                }}
              >
                <MapContainer
                  center={center}
                  zoom={9}
                  style={{ height: '100%', width: '100%' }}
                >
                  <MapInvalidateSize />
                  <TileLayer attribution='&copy; OpenStreetMap contributors' url={baseUrl} />

                  {/* Overlays */}
                  {boundaryLatLngs && (
                    <Polygon positions={boundaryLatLngs} pathOptions={{ color: '#22c55e', weight: 2 }} />
                  )}
                  {pipeLines.map(pl => (
                    <Polyline key={pl.id} positions={pl.latlngs} pathOptions={{ color: '#64748b', weight: 2, dashArray: '4 4' }} />
                  ))}
                  {wellMarkers.map(w => (
                    <Marker key={w.id} position={w.pos}>
                      <Popup>
                        <div>
                          <b>{w.name}</b><br />
                          Status: {w.status || '—'}
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  <MapAutoFit
                    boundaryLatLngs={boundaryLatLngs}
                    pipeLines={pipeLines}
                    wellMarkers={wellMarkers}
                    fallback={center}
                  />
                  <MapHud
                    basemap={basemap}
                    setBasemap={setBasemap}
                    fitData={{ boundaryLatLngs, pipeLines, wellMarkers }}
                    centerFallback={center}
                  />
                  <MapLegend />
                </MapContainer>
              </Box>

              {/* RIGHT rail */}
              <Stack spacing={1.25}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: .5 }}>
                      <Chip label={proj.project?.status || '—'} />
                      {proj.project?.classType && <Chip size="small" variant="outlined" label={`Class ${proj.project.classType}`} />}
                    </Stack>
                  </CardContent>
                </Card>

                <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Typography variant="subtitle2" color="text.secondary">Alerts</Typography>
                    <Stack spacing={0.75} sx={{ flex: 1, overflow: 'auto', mt: .5 }}>
                      {(alerts || []).length === 0 && (
                        <Typography variant="body2" color="text.secondary">No alerts</Typography>
                      )}
                      {(alerts || []).slice(0, 12).map((a) => {
                        const color = a.severity === 'high' ? 'error' : a.severity === 'medium' ? 'warning' : 'default';
                        return (
                          <Stack key={a._id} direction="row" spacing={1} alignItems="center">
                            <Chip size="small" color={color} label={a.severity || 'low'} />
                            <Typography variant="body2" sx={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {a.kind}: {a.message}
                            </Typography>
                          </Stack>
                        );
                      })}
                    </Stack>

                    <Divider sx={{ my: 1.25 }} />
                    <Stack direction="row" spacing={1}>
                      <Button
                        fullWidth variant="outlined"
                        onClick={async ()=>{
                          if (!projectId) return;
                          const a = await listAlerts(projectId);
                          setAlerts(Array.isArray(a) ? a : []);
                        }}
                      >
                        Refresh
                      </Button>
                      <Button
                        fullWidth variant="contained"
                        onClick={async ()=>{
                          if (!projectId) return;
                          await runGeoAlerts(projectId);
                          const a = await listAlerts(projectId);
                          setAlerts(Array.isArray(a) ? a : []);
                        }}
                      >
                        Run checks
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>No project selected</Typography>
          <Typography variant="body2" color="text.secondary">
            Choose a project from the selector above to load data, map, and KPIs.
          </Typography>
        </Card>
      )}

      {/* TABLE */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }} fontWeight={700}>
            Injection time series
          </Typography>
          <div style={{ height: 420, width: '100%' }}>
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(r) => r.id}
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { page: 0, pageSize: 25 } },
                sorting: { sortModel: [{ field: 'date', sort: 'desc' }] },
              }}
              disableRowSelectionOnClick
              sx={{
                border: 'none',
                '& .MuiDataGrid-toolbarContainer': { p: 1 },
                '& .MuiDataGrid-columnHeaders': { fontWeight: 700 },
              }}
              slots={{ toolbar: GridToolbar }}
              slotProps={{
                toolbar: {
                  showQuickFilter: true,
                  quickFilterProps: { debounceMs: 300 },
                }
              }}
            />
          </div>
        </CardContent>
      </Card>
    </Stack>
  );
}
