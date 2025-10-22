// src/pages/PublicStateEmissionsPage.jsx
import { useEffect, useMemo, useState } from 'react';
import {
  Box, Card, CardContent, CardHeader, MenuItem, Stack, Typography,
  TextField, Chip, IconButton, Divider, Tooltip, Paper,
  ToggleButtonGroup, ToggleButton, alpha, useTheme
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MapIcon from '@mui/icons-material/Map';
import InsightsIcon from '@mui/icons-material/Insights';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { DataGrid, gridClasses } from '@mui/x-data-grid';
import { getStateEmissionMeta, getStateEmissionSummary } from '../api/public';

// Leaflet map
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// ---- Guarded Leaflet marker assets (Vite)
if (L?.Icon?.Default?.prototype && typeof L.Icon.Default.prototype._getIconUrl !== 'function') {
  // nothing
}
if (L?.Icon?.Default?.mergeOptions) {
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
    iconUrl:       new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
    shadowUrl:     new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
  });
}

/* ---------- small utils ---------- */
const fmt0 = (n) =>
  Number.isFinite(Number(n))
    ? Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
    : '—';

const SUBPART_LABELS = Object.freeze({
  C: 'Stationary Fuel Combustion',
  P: 'Hydrogen Production',
  W: 'Petroleum & Natural Gas Systems',
  PP: 'CO₂ Suppliers',
  PP_MANDATORY: 'CO₂ Suppliers',
  AA: 'Pulp & Paper',
  BB: 'Glass Production',
  CC: 'Ammonia Production',
  DD: 'Adipic Acid Production',
  EE: 'Nitric Acid Production',
  FF: 'Petrochemical Production',
  HH: 'Cement Production',
  II: 'Lime Manufacturing',
  JJ: 'Iron & Steel',
  KK: 'Aluminum Production',
  LL: 'Fluorinated GHG Production',
  MM: 'Phosphoric Acid Production',
  NN: 'Silicon Carbide Production',
  OO: 'Soda Ash Manufacturing',
});

/* ---------- Map helpers ---------- */
function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t = setTimeout(() => map.invalidateSize(), 60);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function fitToMarkers(map, latlngs) {
  if (!latlngs?.length) return false;
  if (latlngs.length === 1) {
    map.setView(latlngs[0], 9, { animate: true });
    return true;
  }
  const bounds = L.latLngBounds(latlngs);
  map.fitBounds(bounds.pad(0.2), { animate: true, duration: 0.6 });
  return true;
}

function MapAutoFit({ points, fallback }) {
  const map = useMap();
  useEffect(() => {
    const ok = fitToMarkers(map, points);
    if (!ok && fallback) map.setView(fallback, 6);
  }, [points, fallback, map]);
  return null;
}

function MapHud({ basemap, setBasemap, points, fallback }) {
  const map = useMap();
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        position: 'absolute', top: 12, right: 12, zIndex: 1000,
        p: 1, borderRadius: 2, bgcolor: (t)=>alpha(t.palette.background.paper, 0.85),
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

      <Tooltip title="Fit to facilities">
        <IconButton
          size="small" color="primary"
          onClick={()=>{
            const ok = fitToMarkers(map, points);
            if (!ok && fallback) map.setView(fallback, 6);
            setTimeout(()=>map.invalidateSize(), 0);
          }}
        >
          <MyLocationRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

function StatCard({ icon, title, value, suffix }) {
  return (
    <Paper
      elevation={0}
      sx={{
        flex: 1, p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider',
        display: 'flex', alignItems: 'center', gap: 2,
      }}
    >
      <Box sx={(theme)=>({
        width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center',
        bgcolor: theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light,
        color: theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : theme.palette.primary.dark,
      })}>
        {icon}
      </Box>
      <Stack spacing={0.25}>
        <Typography variant="caption" color="text.secondary">{title}</Typography>
        <Stack direction="row" spacing={0.5} alignItems="baseline">
          <Typography variant="h6" fontWeight={700}>{value}</Typography>
          {suffix && <Typography variant="caption" color="text.secondary">{suffix}</Typography>}
        </Stack>
      </Stack>
    </Paper>
  );
}

/* =================== PAGE =================== */
export default function PublicStateEmissionsPage() {
  const theme = useTheme();

  const [meta, setMeta] = useState({ states: [] });
  const [stateCode, setStateCode] = useState('');
  const [year, setYear] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // basemap
  const [basemap, setBasemap] = useState('osm');
  const baseUrl =
    basemap === 'hot'   ? 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png' :
    basemap === 'light' ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' :
    basemap === 'dark'  ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' :
                          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  /* ---- load meta ---- */
  useEffect(() => {
    let alive = true;
    getStateEmissionMeta()
      .then((data) => {
        if (!alive) return;
        setMeta(data || { states: [] });
        const first = data?.states?.[0];
        if (first && !stateCode) {
          setStateCode(first.state);
          const years = Array.isArray(first.years) ? first.years : [];
          if (years.length) setYear(years[years.length - 1]);
        }
      })
      .catch((e) => { if (alive) setErr(e.message || 'Failed to load states'); });
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- load summary ---- */
  useEffect(() => {
    if (!stateCode) return;
    let alive = true;
    setLoading(true);
    setErr('');
    getStateEmissionSummary({ state: stateCode, year })
      .then((data) => { if (alive) setSummary(data || null); })
      .catch((e) => { if (alive) setErr(e.message || 'Failed to load emissions'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [stateCode, year]);

  const currentMeta = useMemo(
    () => meta.states?.find((s) => s.state === stateCode) || { years: [] },
    [meta, stateCode]
  );

  // charts
  const sectorChart = useMemo(() => {
    const list = summary?.sectors || [];
    if (!list.length) return null;
    const labels = list.map((s) => s.sectorLabel || s.sector);
    const values = list.map((s) => {
      const v = Number(s.ghgQuantity);
      return Number.isFinite(v) ? v : 0;
    });
    return { labels, values };
  }, [summary]);

  const pieData = useMemo(() => {
    const list = summary?.sectors || [];
    return list.slice(0, 8).map((s, i) => ({
      id: i,
      value: Number.isFinite(Number(s.ghgQuantity)) ? Number(s.ghgQuantity) : 0,
      label: s.sectorLabel || s.sector,
    }));
  }, [summary]);

  // facilities table rows
  const facilityRows = useMemo(() => {
    const list = summary?.facilities || [];
    return list.map((f, idx) => ({
      id: `${f.ghgrpId || idx}-${idx}`,
      facilityName: f.facilityName ?? '—',
      city: f.city ?? '',
      county: f.county ?? '',
      ghgQuantity: Number.isFinite(Number(f.ghgQuantity)) ? Number(f.ghgQuantity) : null,
      parentCompanies: f.parentCompanies ?? '',
      subparts: (f.subparts || []).map((c) => SUBPART_LABELS[c] || c).join(', '),
      latitude: Number.isFinite(Number(f.latitude)) ? Number(f.latitude) : null,
      longitude: Number.isFinite(Number(f.longitude)) ? Number(f.longitude) : null,
    }));
  }, [summary]);

  // map points (for fit + markers)
  const mapPoints = useMemo(() => {
    return facilityRows
      .filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude))
      .map((r) => L.latLng(r.latitude, r.longitude));
  }, [facilityRows]);

  const mapFallback = useMemo(() => {
    if (mapPoints.length) {
      const p = mapPoints[0];
      return [p.lat, p.lng];
    }
    // continental US fallback
    return [37.8, -96];
  }, [mapPoints]);

  // right-rail quick stats
  const facilitiesCount = facilityRows.length;
  const totalEmissions = summary?.total ?? null;
  const topSector = useMemo(() => {
    const list = summary?.sectors || [];
    if (!list.length) return null;
    const top = [...list].sort((a, b) => Number(b.ghgQuantity) - Number(a.ghgQuantity))[0];
    return top ? { label: top.sectorLabel || top.sector, value: top.ghgQuantity } : null;
  }, [summary]);

  return (
    <Stack spacing={3} sx={{ pb: 4 }}>
      {/* Header */}
      <Stack direction="row" spacing={1} alignItems="center">
        <InsightsIcon color="primary" />
        <Typography variant="h4" fontWeight={800}>State emissions by sector</Typography>
        <Tooltip title="Source: EPA FLIGHT (GHGRP). Totals are per-facility CO₂e split across listed subparts.">
          <IconButton size="small" color="default"><InfoOutlinedIcon fontSize="small"/></IconButton>
        </Tooltip>
      </Stack>

      {/* Filters */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
        <TextField
          select label="State" size="small" value={stateCode}
          onChange={(e) => {
            const next = e.target.value;
            setStateCode(next);
            const candidate = meta.states?.find((s) => s.state === next);
            const ys = candidate?.years || [];
            setYear(ys.length ? ys[ys.length - 1] : null);
          }}
          sx={{ minWidth: 160 }}
        >
          {(meta.states || []).map((entry) => (
            <MenuItem key={entry.state} value={entry.state}>{entry.state}</MenuItem>
          ))}
        </TextField>

        <TextField
          select label="Year" size="small" value={year ?? ''}
          onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
          sx={{ minWidth: 120 }} disabled={!currentMeta.years?.length}
        >
          {(currentMeta.years || []).map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>

        {summary?.total != null && (
          <Chip color="primary" label={`Total: ${fmt0(summary.total)} t CO₂e`} />
        )}
      </Stack>

      {err && (
        <Typography color="error">
          {err}
        </Typography>
      )}

      {/* Charts card */}
      <Card>
        <CardHeader title="Sector breakdown" subheader={loading ? 'Loading…' : undefined} />
        <CardContent>
          {!sectorChart ? (
            <Typography variant="body2" color="text.secondary">No data for the selected filters.</Typography>
          ) : (
            <>
              <Box sx={{ height: 320 }}>
                <BarChart
                  height={320}
                  xAxis={[{
                    data: sectorChart.labels,
                    scaleType: 'band',
                    labelStyle: { fontSize: 11 },
                    tickLabelStyle: { fontSize: 11, angle: 0, maxHeight: 40, wordBreak: 'break-word' },
                  }]}
                  yAxis={[{ label: 't CO₂e' }]}
                  series={[{ data: sectorChart.values, label: 't CO₂e' }]}
                  slotProps={{ legend: { hidden: true } }}
                  margin={{ left: 50, right: 12, top: 12, bottom: 28 }}
                />
              </Box>
              <Divider sx={{ my: 2 }} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <Box sx={{ flex: 1, minWidth: 260 }}>
                  <PieChart
                    height={240}
                    series={[{ data: pieData, innerRadius: 50, outerRadius: 110, paddingAngle: 1 }]}
                    slotProps={{ legend: { hidden: false } }}
                  />
                </Box>
                <Stack sx={{ flex: 1 }} spacing={1}>
                  {(summary?.sectors || []).slice(0, 8).map((s) => (
                    <Stack key={s.sector} direction="row" justifyContent="space-between">
                      <Typography variant="body2">{s.sectorLabel || s.sector}</Typography>
                      <Typography variant="body2" fontWeight={600}>{fmt0(s.ghgQuantity)}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      {/* Map card — same layout style as PublicPortalPage (map + fixed right rail) */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <MapIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Facilities map {stateCode ? `· ${stateCode}` : ''}
            </Typography>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 340px' }, // fixed rail width
              gap: 2,
              alignItems: 'stretch',
              minHeight: { xs: 360, md: 520 },
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
                '& .leaflet-container': { height: '100%', width: '100%' },
              }}
            >
              <MapContainer center={mapFallback} zoom={6}>
                <MapInvalidateSize />
                <TileLayer attribution='&copy; OpenStreetMap contributors' url={baseUrl} />
                <MapAutoFit points={mapPoints} fallback={mapFallback} />
                <MapHud basemap={basemap} setBasemap={setBasemap} points={mapPoints} fallback={mapFallback} />

                {facilityRows
                  .filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude))
                  .slice(0, 1000)
                  .map((r) => (
                    <Marker key={r.id} position={[r.latitude, r.longitude]}>
                      <Popup>
                        <Stack spacing={0.5}>
                          <Typography variant="subtitle2">{r.facilityName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {[r.city, r.county].filter(Boolean).join(' · ')}
                          </Typography>
                          <Typography variant="body2">{fmt0(r.ghgQuantity)} t CO₂e</Typography>
                          {r.subparts && (
                            <Typography variant="caption">Subparts: {r.subparts}</Typography>
                          )}
                        </Stack>
                      </Popup>
                    </Marker>
                  ))}
              </MapContainer>
            </Box>

            {/* RIGHT rail */}
            <Stack spacing={1.25}>
              <StatCard
                icon={<MapIcon fontSize="small" />}
                title="Facilities listed"
                value={fmt0(facilitiesCount)}
              />
              <StatCard
                icon={<InsightsIcon fontSize="small" />}
                title={`Total CO₂e${year ? ` (${year})` : ''}`}
                value={fmt0(totalEmissions)}
                suffix="t"
              />
              <StatCard
                icon={<InfoOutlinedIcon fontSize="small" />}
                title="Top sector"
                value={topSector ? (topSector.label || '—') : '—'}
                suffix={topSector ? `${' · ' + fmt0(topSector.value)} t` : undefined}
              />

              {/* You can add download buttons here later if needed */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Tips
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use the map toolbar to change basemaps or refit to all facilities.
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* Facilities table */}
      <Card>
        <CardHeader title="Facilities" subheader="Sorted by reported CO₂e" />
        <CardContent>
          <Box sx={{ height: 420 }}>
            <DataGrid
              rows={facilityRows}
              columns={[
                { field: 'facilityName', headerName: 'Facility', flex: 1.2, minWidth: 220 },
                { field: 'city', headerName: 'City', width: 140 },
                { field: 'county', headerName: 'County', width: 160 },
                { field: 'ghgQuantity', headerName: 'GHG (t CO₂e)', width: 160,
                  valueFormatter: ({ value }) => fmt0(value) },
                { field: 'parentCompanies', headerName: 'Parent Companies', flex: 1, minWidth: 220 },
                { field: 'subparts', headerName: 'Subparts', flex: 0.8, minWidth: 160 },
              ]}
              loading={loading}
              density="compact"
              disableRowSelectionOnClick
              sx={{ [`& .${gridClasses.row}`]: { cursor: 'default' } }}
              initialState={{
                sorting: { sortModel: [{ field: 'ghgQuantity', sort: 'desc' }] },
                pagination: { paginationModel: { pageSize: 10 } },
              }}
              pageSizeOptions={[10, 25, 50]}
              getRowId={(r) => r.id}
            />
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
