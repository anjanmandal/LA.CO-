import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/EditRounded';
import AddIcon from '@mui/icons-material/AddCircleRounded';
import DeleteIcon from '@mui/icons-material/DeleteRounded';
import RefreshIcon from '@mui/icons-material/RefreshRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SectionCard from '../components/common/SectionCard';
import {
  fetchProjects,
  fetchProjectDetail,
  createProject,
  updateProject,
  deleteProject,
  createWell,
  updateWell,
  deleteWell,
} from '../api/ccusAdmin';

const STATUS_OPTIONS = ['planning', 'permitting', 'construction', 'operational', 'suspended', 'closed'];
const WELL_TYPE_OPTIONS = ['injection', 'monitoring', 'strat-test'];
const WELL_STATUS_OPTIONS = ['proposed', 'permitted', 'drilling', 'completed', 'injecting', 'suspended', 'plugged'];

function ProjectForm({ open, onClose, initial }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState(() => ({
    name: initial?.name || '',
    operator: initial?.operator || '',
    organizationId: initial?.organizationId || '',
    classType: initial?.classType || 'VI',
    status: initial?.status || 'permitting',
  }));

  const { mutate, isLoading } = useMutation({
    mutationFn: initial
      ? (payload) => updateProject(initial._id, payload)
      : (payload) => createProject(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['ccus', 'projects']);
      onClose();
    },
  });

  const handleChange = (field) => (event) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = () => {
    if (!values.name || !values.operator) return;
    mutate(values);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit CCUS project' : 'Create CCUS project'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <TextField label="Project name" value={values.name} onChange={handleChange('name')} required />
        <TextField label="Operator" value={values.operator} onChange={handleChange('operator')} required />
        <TextField label="Organization ID (optional)" value={values.organizationId || ''} onChange={handleChange('organizationId')} />
        <TextField select label="Class" value={values.classType} onChange={handleChange('classType')}>
          {['VI', 'II', 'Other'].map((opt) => (
            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
          ))}
        </TextField>
        <TextField select label="Status" value={values.status} onChange={handleChange('status')}>
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isLoading}>
          {initial ? 'Save changes' : 'Create project'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function WellsManager({ projectId, open, onClose }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['ccus', 'project', projectId],
    queryFn: () => fetchProjectDetail(projectId),
    enabled: open,
  });

  const [editingWell, setEditingWell] = useState(null);
  const [form, setForm] = useState({
    name: '',
    apiNo: '',
    type: 'injection',
    status: 'proposed',
  });

  const resetForm = () => {
    setEditingWell(null);
    setForm({ name: '', apiNo: '', type: 'injection', status: 'proposed' });
  };

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const { mutate: saveWell, isLoading: saving } = useMutation({
    mutationFn: (payload) => (
      editingWell
        ? updateWell(editingWell._id, payload)
        : createWell(projectId, payload)
    ),
    onSuccess: () => {
      queryClient.invalidateQueries(['ccus', 'project', projectId]);
      resetForm();
    },
  });

  const { mutate: removeWell, isLoading: deleting } = useMutation({
    mutationFn: (id) => deleteWell(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['ccus', 'project', projectId]);
    },
  });

  const wells = data?.wells ?? [];

  const handleSubmit = () => {
    if (!form.name) return;
    saveWell(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Manage wells</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {isLoading ? (
          <Skeleton height={180} />
        ) : (
          <Stack spacing={1.5}>
            {wells.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No wells recorded yet.
              </Typography>
            ) : wells.map((well) => (
              <Card key={well._id} variant="outlined">
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight={700}>{well.name}</Typography>
                    <Stack direction="row" spacing={1}>
                      <IconButton size="small" onClick={() => { setEditingWell(well); setForm({
                        name: well.name || '',
                        apiNo: well.apiNo || '',
                        type: well.type || 'injection',
                        status: well.status || 'proposed',
                      }); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => removeWell(well._id)} disabled={deleting}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Type: {well.type} • Status: {well.status} {well.apiNo ? `• API: ${well.apiNo}` : ''}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}

        <Divider />

        <Typography variant="subtitle1" fontWeight={700}>
          {editingWell ? 'Edit well' : 'Add new well'}
        </Typography>
        <Stack spacing={1.5}>
          <TextField label="Well name" value={form.name} onChange={handleChange('name')} required />
          <TextField label="API number" value={form.apiNo} onChange={handleChange('apiNo')} />
          <TextField select label="Type" value={form.type} onChange={handleChange('type')}>
            {WELL_TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </TextField>
          <TextField select label="Status" value={form.status} onChange={handleChange('status')}>
            {WELL_STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={resetForm} color="inherit">
          Clear
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {editingWell ? 'Save well' : 'Add well'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CcusAdminPage() {
  const queryClient = useQueryClient();
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [manageWellsProjectId, setManageWellsProjectId] = useState(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['ccus', 'projects'],
    queryFn: fetchProjects,
  });

  const { mutate: removeProject, isLoading: deleting } = useMutation({
    mutationFn: (id) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['ccus', 'projects']);
    },
  });

  const projects = data ?? [];

  const totalWells = useMemo(() => projects.reduce((acc, p) => acc + (p.counts?.wells || 0), 0), [projects]);

  return (
    <Stack spacing={3}>
      <SectionCard
        title="CCUS project administration"
        subtitle="Create, update, and manage capture, utilization, and storage projects."
        actions={(
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setEditingProject(null); setProjectFormOpen(true); }}
            >
              Add project
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
              disabled={isFetching}
            >
              Refresh
            </Button>
          </Stack>
        )}
      >
        {isLoading ? (
          <Grid container spacing={2}>
            {Array.from({ length: 3 }).map((_, idx) => (
              <Grid item xs={12} md={6} key={idx}>
                <Skeleton variant="rectangular" height={180} />
              </Grid>
            ))}
          </Grid>
        ) : projects.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No CCUS projects recorded yet. Use “Add project” to create one.
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {projects.map((project) => (
              <Grid item xs={12} md={6} key={project._id}>
                <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack spacing={0.5}>
                        <Typography variant="h6" fontWeight={700}>{project.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Operator: {project.operator}
                        </Typography>
                        {project.organizationName && (
                          <Chip size="small" label={project.organizationName} />
                        )}
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          size="small"
                          onClick={() => { setEditingProject(project); setProjectFormOpen(true); }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => removeProject(project._id)}
                          disabled={deleting}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip size="small" label={`Class ${project.classType}`} variant="outlined" />
                      <Chip size="small" label={project.status} color="info" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                    </Stack>

                    <Divider />

                    <Typography variant="subtitle2">Snapshot</Typography>
                    <Stack direction="row" spacing={2}>
                      <Stack spacing={0.25}>
                        <Typography variant="body2" color="text.secondary">Wells</Typography>
                        <Typography variant="subtitle1">{project.counts?.wells ?? 0}</Typography>
                      </Stack>
                      <Stack spacing={0.25}>
                        <Typography variant="body2" color="text.secondary">Permits</Typography>
                        <Typography variant="subtitle1">{project.counts?.permits ?? 0}</Typography>
                      </Stack>
                      <Stack spacing={0.25}>
                        <Typography variant="body2" color="text.secondary">Alerts</Typography>
                        <Typography variant="subtitle1">{project.counts?.alerts ?? 0}</Typography>
                      </Stack>
                    </Stack>

                    <Box sx={{ flexGrow: 1 }} />

                    <Button
                      variant="outlined"
                      onClick={() => setManageWellsProjectId(project._id)}
                    >
                      Manage wells
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </SectionCard>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700}>Stats</Typography>
          <Typography variant="body2" color="text.secondary">
            Total projects: {projects.length} • Total wells: {totalWells}
          </Typography>
        </CardContent>
      </Card>

      <ProjectForm
        open={projectFormOpen}
        onClose={() => setProjectFormOpen(false)}
        initial={editingProject}
      />
      <WellsManager
        projectId={manageWellsProjectId}
        open={Boolean(manageWellsProjectId)}
        onClose={() => setManageWellsProjectId(null)}
      />
    </Stack>
  );
}
