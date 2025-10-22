import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Backdrop,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataGrid } from '@mui/x-data-grid';
import ArticleIcon from '@mui/icons-material/ArticleOutlined';
import SearchIcon from '@mui/icons-material/SearchRounded';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import CloseIcon from '@mui/icons-material/Close';
import TaskAltIcon from '@mui/icons-material/TaskAltRounded';
import GppMaybeIcon from '@mui/icons-material/GppMaybeRounded';
import { listSubmissions, updateSubmissionStatus } from '../api/submissions';
import { fmtDateTime, fmtInt } from '../utils/format';

export default function RegulatorSubmissionsPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['submissions', 'regulator', 'submitted'],
    queryFn: () => listSubmissions({ status: 'submitted' }),
  });

  const rows = useMemo(() => data?.submissions ?? [], [data]);

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      const orgName = row.orgName?.toLowerCase?.() || '';
      const template = row.templateName?.toLowerCase?.() || '';
      return orgName.includes(term) || template.includes(term) || row.status?.toLowerCase?.().includes(term);
    });
  }, [rows, search]);

  const columns = useMemo(
    () => [
      {
        field: 'orgName',
        headerName: 'Organization',
        flex: 1.2,
        minWidth: 180,
      },
      {
        field: 'templateName',
        headerName: 'Filing Template',
        flex: 1.1,
        minWidth: 180,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 140,
        renderCell: ({ value }) => (
          <Chip size="small" label={value || '—'} color="primary" sx={{ textTransform: 'capitalize' }} />
        ),
      },
      {
        field: 'files',
        headerName: 'Files',
        width: 110,
        valueGetter: ({ value }) => (Array.isArray(value) ? value.length : 0),
        renderCell: ({ value }) => (
          <Chip size="small" icon={<ArticleIcon fontSize="inherit" />} label={`${value} file${value === 1 ? '' : 's'}`} />
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Submitted',
        width: 190,
        valueFormatter: ({ value }) => (value ? fmtDateTime(value) : '—'),
      },
      {
        field: 'actions',
        headerName: ' ',
        width: 130,
        sortable: false,
        renderCell: (params) => (
          <Button size="small" onClick={() => setSelected(params.row)}>
            View details
          </Button>
        ),
      },
    ],
    []
  );

  const detailFiles = useMemo(() => selected?.files ?? [], [selected]);
  const validationMessages = useMemo(() => selected?.validation?.messages ?? [], [selected]);
  const validationOk = selected?.validation?.ok;

  const { mutate: mutateStatus, isLoading: isUpdating, error: actionError } = useMutation({
    mutationFn: ({ id, status }) => updateSubmissionStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['submissions', 'regulator', 'submitted']);
      queryClient.invalidateQueries({ queryKey: ['submissions', 'history'] });
      setSelected(null);
    },
  });

  const approve = () => {
    if (!selected?.id) return;
    mutateStatus({ id: selected.id, status: 'accepted' });
  };

  const reject = () => {
    if (!selected?.id) return;
    mutateStatus({ id: selected.id, status: 'rejected' });
  };

  const closeOverlay = () => {
    if (isUpdating) return;
    setSelected(null);
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={800}>
        Submitted filings
      </Typography>
      <Typography variant="body2" color="text.secondary" maxWidth={720}>
        Review newly submitted filings from operators. Approve or reject each submission to update its compliance status.
      </Typography>

      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField
              size="small"
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by organization, filing, or status"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: { xs: '100%', md: 280 } }}
            />
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ height: 560, width: '100%' }}>
        <DataGrid
          loading={isLoading}
          rows={filteredRows}
          columns={columns}
          getRowId={(row) => row.id}
          initialState={{
            sorting: { sortModel: [{ field: 'createdAt', sort: 'desc' }] },
            pagination: { paginationModel: { pageSize: 15, page: 0 } },
          }}
          pageSizeOptions={[15, 30, 50]}
          disableRowSelectionOnClick
        />
        {error && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {error.message || 'Failed to load submissions'}
          </Typography>
        )}
      </Box>

      <Backdrop
        open={Boolean(selected)}
        onClick={closeOverlay}
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 2, color: '#fff', p: 3 }}
      >
        {selected && (
          <Paper
            onClick={(e) => e.stopPropagation()}
            sx={{
              width: { xs: '100%', sm: 520 },
              maxHeight: '90vh',
              overflowY: 'auto',
              p: 3,
              borderRadius: 2,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
              <Stack spacing={0.5}>
                <Typography variant="overline" color="text.secondary">
                  {selected.orgName}
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {selected.templateName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Submitted {selected.createdAt ? fmtDateTime(selected.createdAt) : '—'}
                </Typography>
              </Stack>
              <IconButton size="small" onClick={closeOverlay} disabled={isUpdating}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Stack spacing={0.5}>
              {selected.validation && (
                <Chip
                  size="small"
                  color={validationOk ? 'success' : 'warning'}
                  label={validationOk ? 'Validation OK' : 'Needs review'}
                  sx={{ textTransform: 'capitalize', width: 'fit-content' }}
                />
              )}
            </Stack>

            <Stack spacing={1}>
              <Typography variant="subtitle2">Files</Typography>
              {detailFiles.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No files attached
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {detailFiles.map((file) => (
                    <Stack
                      key={`${file.key}-${file.filename}`}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}
                    >
                      <Stack spacing={0.5}>
                        <Typography variant="body2" fontWeight={600}>
                          {file.filename}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {file.key} · {file.size ? `${fmtInt(file.size)} bytes` : 'size unknown'}
                        </Typography>
                      </Stack>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<DownloadIcon fontSize="small" />}
                        disabled
                      >
                        Download
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Stack>

            <Stack spacing={1}>
              <Typography variant="subtitle2">Validation notes</Typography>
              {validationMessages.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No validation messages recorded.
                </Typography>
              ) : (
                <Stack spacing={0.75}>
                  {validationMessages.map((msg, idx) => (
                    <Typography key={idx} variant="body2">
                      • {msg}
                    </Typography>
                  ))}
                </Stack>
              )}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
              <Button
                variant="contained"
                color="success"
                startIcon={<TaskAltIcon />}
                onClick={approve}
                disabled={isUpdating}
                fullWidth
              >
                Approve
              </Button>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<GppMaybeIcon />}
                onClick={reject}
                disabled={isUpdating}
                fullWidth
              >
                Reject
              </Button>
            </Stack>

            {isUpdating && (
              <Stack alignItems="center" sx={{ mt: 2 }}>
                <CircularProgress size={24} />
              </Stack>
            )}

            {actionError && (
              <Typography variant="body2" color="error" sx={{ mt: 1.5 }}>
                {actionError.message || 'Failed to update submission'}
              </Typography>
            )}
          </Paper>
        )}
      </Backdrop>
    </Stack>
  );
}
