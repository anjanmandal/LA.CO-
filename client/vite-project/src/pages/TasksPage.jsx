// src/pages/TasksPage.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
  MenuItem,
} from '@mui/material';
import {
  DataGrid,
  GridToolbarQuickFilter,
  GridToolbarContainer,
} from '@mui/x-data-grid';

import RefreshIcon from '@mui/icons-material/RefreshRounded';
import AddTaskIcon from '@mui/icons-material/PlaylistAddRounded';
import DoneAllIcon from '@mui/icons-material/DoneAllRounded';
import ScheduleIcon from '@mui/icons-material/ScheduleRounded';
import WarningIcon from '@mui/icons-material/WarningAmberRounded';
import ErrorIcon from '@mui/icons-material/ErrorOutlineRounded';
import CalendarIcon from '@mui/icons-material/CalendarMonthRounded';
import FilterAltIcon from '@mui/icons-material/FilterAltRounded';
import FileDownloadIcon from '@mui/icons-material/FileDownloadRounded';

import { http } from '../api/http';
import { planCompliance } from '../api/copilot';
import TaskSubmissionDrawer from '../components/tasks/TaskSubmissionDrawer.jsx';
import { useAuth } from '../context/AuthContext';
import { fmtDateTime } from '../utils/format';

/* --------------------- Small helpers --------------------- */
const StatusChip = ({ value }) => {
  const map = {
    open:        { color: 'warning', label: 'Open' },
    in_progress: { color: 'info',    label: 'In progress' },
    submitted:   { color: 'primary', label: 'Submitted' },
    completed:   { color: 'success', label: 'Completed' },
    accepted:    { color: 'success', label: 'Accepted' },
    overdue:     { color: 'error',   label: 'Overdue' },
    closed:      { color: 'default', label: 'Closed' },
  };
  const cfg = map[value] || { color: 'default', label: value || '—' };
  return <Chip size="small" color={cfg.color} label={cfg.label} variant="outlined" />;
};

function Toolbar({ onRefresh, onPlan, onExport, busy, quickFilters, setQuickFilters }) {
  return (
    <GridToolbarContainer sx={{ p: 1, gap: 1, justifyContent: 'space-between' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
        <FilterAltIcon fontSize="small" />
        <GridToolbarQuickFilter quickFilterParser={(v) => v.split(/\s+/)} />
        <Chip
          size="small"
          color={quickFilters.status === 'open' ? 'warning' : 'default'}
          variant={quickFilters.status === 'open' ? 'filled' : 'outlined'}
          label="Open"
          onClick={() => setQuickFilters((f) => ({ ...f, status: f.status === 'open' ? '' : 'open' }))}
          sx={{ ml: 1 }}
        />
        <Chip
          size="small"
          color={quickFilters.status === 'overdue' ? 'error' : 'default'}
          variant={quickFilters.status === 'overdue' ? 'filled' : 'outlined'}
          label="Overdue"
          onClick={() => setQuickFilters((f) => ({ ...f, status: f.status === 'overdue' ? '' : 'overdue' }))}
        />
        <Chip
          size="small"
          color={quickFilters.status === 'completed' ? 'success' : 'default'}
          variant={quickFilters.status === 'completed' ? 'filled' : 'outlined'}
          label="Completed"
          onClick={() => setQuickFilters((f) => ({ ...f, status: f.status === 'completed' ? '' : 'completed' }))}
        />
      </Stack>

      <Stack direction="row" spacing={1}>
        <Tooltip title="Export CSV">
          <span>
            <IconButton onClick={onExport} disabled={busy}>
              <FileDownloadIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Refresh">
          <span>
            <IconButton onClick={onRefresh} disabled={busy}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Button startIcon={<AddTaskIcon />} onClick={onPlan} disabled={busy} variant="contained">
          Plan tasks
        </Button>
      </Stack>
    </GridToolbarContainer>
  );
}

/* ------------------------- Page -------------------------- */
export default function TasksPage() {
  const theme = useTheme();
  const { user } = useAuth();
  const canEditOrg = user?.role === 'admin';

  // planner controls
  const [orgId, setOrgId] = useState('');
  const [sector, setSector] = useState('');
  const [owner, setOwner] = useState('');
  const [months, setMonths] = useState(12);

  // table data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTask, setActiveTask] = useState(null);

  // quick filters
  const [quickFilters, setQuickFilters] = useState({ status: '' });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = orgId ? { params: { orgId } } : undefined;
      const { data } = await http.get('/tasks', params);
      const nextRows = Array.isArray(data) ? data : [];
      setRows(nextRows);
    } catch (e) {
      setError(e?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const plan = async () => {
    if (!orgId) {
      setError('Organization ID is required to plan tasks.');
      return;
    }
    if (!owner) {
      setError('Owner email is required to plan tasks.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await planCompliance({
        orgId,
        sector: sector || undefined,
        owner,
        months: Number(months || 12),
      });
      setToast(`Planned: ${res.created} new, skipped: ${res.skipped}`);
      await fetchTasks();
    } catch (e) {
      setError(e?.message || 'Plan failed');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => {
    if (user?.orgId && !orgId) setOrgId(String(user.orgId));
    if (user?.email && !owner) setOwner(user.email);
  }, [user, orgId, owner]);

  const rowsForOrg = useMemo(() => {
    if (!user?.orgId) return rows;
    return rows.filter((r) => String(r?.orgId) === String(user.orgId));
  }, [rows, user?.orgId]);

  // KPIs
  const kpis = useMemo(() => {
    const now = Date.now();
    let open = 0, dueSoon = 0, overdue = 0, completed = 0;
    rowsForOrg.forEach(r => {
      const due = r?.dueAt ? new Date(r.dueAt).getTime() : null;
      const st = r?.status || 'open';
      if (st === 'completed' || st === 'submitted') completed += 1;
      else {
        open += 1;
        if (due != null) {
          if (due < now) overdue += 1;
          else if (due - now <= 1000 * 60 * 60 * 24 * 14) dueSoon += 1; // 14 days
        }
      }
    });
    return { open, dueSoon, overdue, completed, total: rowsForOrg.length };
  }, [rowsForOrg]);

  // quick filter
  const filteredRows = useMemo(() => {
    const base = rowsForOrg;
    if (!quickFilters.status) return base;
    if (quickFilters.status === 'overdue') {
      const now = Date.now();
      return base.filter(r =>
        !['completed', 'submitted'].includes(r?.status) &&
        r?.dueAt && new Date(r.dueAt).getTime() < now
      );
    }
    return base.filter(r => (r?.status || 'open') === quickFilters.status);
  }, [rowsForOrg, quickFilters]);

  // safer row id
  const getRowId = (r) => r?._id ?? r?.id;

  // Columns — use params.value/params.row and guard nulls
  const columns = [
    { field: 'title', headerName: 'Title', flex: 1.4, minWidth: 240 },
    {
      field: 'requirement',
      headerName: 'Requirement',
      flex: 1,
      minWidth: 220,
      valueGetter: (value) => value?.requirementId || null,
      renderCell: (value) => {
        const req = value;
        if (!req) return '—';
        const code = req.code || 'Requirement';
        const badge = req.sector ? req.sector.toUpperCase() : null;
        return (
          <Stack spacing={0.5}>
            <Typography variant="body2" fontWeight={600}>{code}</Typography>
            {req.title && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {req.title}
              </Typography>
            )}
            {badge && (
              <Chip size="small" label={badge} variant="outlined" sx={{ alignSelf: 'flex-start' }} />
            )}
          </Stack>
        );
      },
      sortable: false,
    },

    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => <StatusChip value={params?.value ?? params?.row?.status} />,
    },

    {
      field: 'dueAt',
      headerName: 'Due',
      width: 220,
      valueGetter: (value) => {
        const raw = value;
        if (!raw) return null;
        const date = new Date(raw);
        return Number.isNaN(date.getTime()) ? null : date;
      },
      renderCell: (params) => {
        const v = params?.value; // Date or null
        if (!v) return '—';
        const isPast = v.getTime() < Date.now();
        return (
          <Stack direction="row" spacing={1} alignItems="center">
            <CalendarIcon fontSize="small" color={isPast ? 'error' : 'action'} />
            <Typography variant="body2" color={isPast ? 'error.main' : 'text.primary'}>
              {fmtDateTime(v)}
            </Typography>
          </Stack>
        );
      },
      sortComparator: (a, b) => (a?.getTime?.() ?? 0) - (b?.getTime?.() ?? 0),
    },

    {
      field: 'daysLeft',
      headerName: 'Δ days',
      width: 110,
      valueGetter: (value) => {
        const raw = value?.dueAt;
        if (!raw) return null;
        const dueMs = new Date(raw).getTime();
        if (Number.isNaN(dueMs)) return null;
        return Math.ceil((dueMs - Date.now()) / (1000 * 60 * 60 * 24));
      },
      renderCell: (params) => {
        const v = params?.value;
        if (v == null) return '—';
        const color = v < 0 ? 'error' : v <= 14 ? 'warning' : 'default';
        return <Chip size="small" color={color} variant="outlined" label={`${v}d`} />;
      },
      sortComparator: (a, b) => (a ?? 0) - (b ?? 0),
    },

    { field: 'owner', headerName: 'Owner', width: 220 },
    { field: 'generatedBy', headerName: 'Source', width: 150 },
  ];

  // CSV export of filtered rows
  const onExportCsv = () => {
    const cols = ['title', 'status', 'dueAt', 'owner', 'generatedBy'];
    const header = cols.join(',');
    const lines = filteredRows.map(r =>
      cols.map(k => {
        const v = k === 'dueAt' && r?.[k] ? new Date(r[k]).toISOString() : (r?.[k] ?? '');
        const s = String(v).replace(/"/g, '""');
        return /[,"\n]/.test(s) ? `"${s}"` : s;
      }).join(',')
    );
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compliance_tasks.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const headerBg = (t) =>
    `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.12)}, ${alpha(t.palette.secondary.main, 0.06)})`;

  const handleRowClick = (params) => {
    setActiveTask(params?.row || null);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setActiveTask(null);
  };

  const handleSubmissionCompleted = async () => {
    setToast('Submission saved');
    await fetchTasks();
    handleDrawerClose();
  };

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Card sx={{ p: 2, borderRadius: 2, background: headerBg(theme) }} variant="outlined">
        <Stack spacing={0.25}>
          <Typography variant="h5" fontWeight={800}>Compliance Tasks</Typography>
          <Typography color="text.secondary">
            Plan required filings from rules, then track progress and due dates.
          </Typography>
        </Stack>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}
      <Snackbar open={!!toast} onClose={() => setToast('')} autoHideDuration={4000} message={toast} />

      {/* KPI Row */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <ScheduleIcon color="warning" />
                <Typography variant="overline" color="text.secondary">Open</Typography>
              </Stack>
              <Typography variant="h4" fontWeight={800}>{kpis.open}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <WarningIcon color="warning" />
                <Typography variant="overline" color="text.secondary">Due (≤ 14 days)</Typography>
              </Stack>
              <Typography variant="h4" fontWeight={800}>{kpis.dueSoon}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <ErrorIcon color="error" />
                <Typography variant="overline" color="text.secondary">Overdue</Typography>
              </Stack>
              <Typography variant="h4" fontWeight={800}>{kpis.overdue}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <DoneAllIcon color="success" />
                <Typography variant="overline" color="text.secondary">Completed</Typography>
              </Stack>
              <Typography variant="h4" fontWeight={800}>{kpis.completed}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Planner controls */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <TextField
              label="Org ID"
              value={orgId}
              onChange={(e)=>setOrgId(e.target.value)}
              sx={{ minWidth: 220 }}
              disabled={!canEditOrg}
              helperText={canEditOrg ? 'Target organization for planning' : 'Using your organization'}
            />
            <TextField label="Sector" value={sector} onChange={(e)=>setSector(e.target.value)} select sx={{ minWidth: 220 }}>
              <MenuItem value="">(All)</MenuItem>
              <MenuItem value="energy">Energy</MenuItem>
              <MenuItem value="power">Power</MenuItem>
              <MenuItem value="agriculture">Agriculture</MenuItem>
              <MenuItem value="buildings">Buildings</MenuItem>
              <MenuItem value="ccus">CCUS</MenuItem>
              <MenuItem value="transport">Transport</MenuItem>
              <MenuItem value="waste">Waste</MenuItem>
            </TextField>
            <TextField label="Owner" value={owner} onChange={(e)=>setOwner(e.target.value)} sx={{ minWidth: 220 }} />
            <TextField label="Months" type="number" value={months} onChange={(e)=>setMonths(Number(e.target.value))} sx={{ width: 140 }} />
            <Divider flexItem orientation="vertical" sx={{ display: { xs:'none', md:'block' } }} />
            <Button startIcon={<AddTaskIcon />} variant="contained" onClick={plan} disabled={busy}>
              {busy ? 'Planning…' : 'Plan from rules'}
            </Button>
            <Button startIcon={<RefreshIcon />} onClick={fetchTasks} disabled={loading || busy}>Refresh</Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Table */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Box sx={{ height: 580, width: '100%' }}>
            {loading ? (
              <Stack spacing={1}>
                <Skeleton variant="rounded" height={44} />
                <Skeleton variant="rounded" height={500} />
              </Stack>
            ) : (
              <DataGrid
                rows={filteredRows}
                columns={columns}
                getRowId={getRowId}
                disableRowSelectionOnClick
                density="comfortable"
                initialState={{
                  sorting: { sortModel: [{ field: 'dueAt', sort: 'asc' }] },
                  pagination: { paginationModel: { page: 0, pageSize: 10 } },
                }}
                pageSizeOptions={[10, 25, 50]}
                slots={{ toolbar: Toolbar }}
                slotProps={{
                  toolbar: {
                    onRefresh: fetchTasks,
                    onPlan: plan,
                    onExport: onExportCsv,
                    busy,
                    quickFilters,
                    setQuickFilters,
                  },
                }}
                getRowClassName={(params) => {
                  const st = params?.row?.status || 'open';
                  const due = params?.row?.dueAt ? new Date(params.row.dueAt).getTime() : null;
                  const now = Date.now();
                  if (st !== 'completed' && st !== 'submitted' && due != null) {
                    if (due < now) return 'task-overdue';
                    if (due - now <= 1000 * 60 * 60 * 24 * 14) return 'task-soon';
                  }
                  return '';
                }}
                onRowClick={handleRowClick}
                sx={{
                  border: 'none',
                  '& .MuiDataGrid-columnHeaders': { fontWeight: 700 },
                  '& .MuiDataGrid-row': { cursor: 'pointer' },
                  '& .task-overdue': {
                    bgcolor: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08),
                  },
                  '& .task-soon': {
                    bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08),
                  },
                }}
              />
            )}
          </Box>
        </CardContent>
      </Card>
      <TaskSubmissionDrawer
        open={drawerOpen}
        task={activeTask}
        onClose={handleDrawerClose}
        onSubmitted={handleSubmissionCompleted}
      />
    </Stack>
  );
}
