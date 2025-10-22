import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Drawer,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { DataGrid } from '@mui/x-data-grid';
import ArticleIcon from '@mui/icons-material/ArticleOutlined';
import SearchIcon from '@mui/icons-material/SearchRounded';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import { listSubmissions } from '../api/submissions';
import { fmtDateTime, fmtInt } from '../utils/format';

const STATUS_COLOR = {
  accepted: 'success',
  rejected: 'warning',
};

const STATUS_LABEL = {
  accepted: 'Approved',
  rejected: 'Rejected',
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All decisions' },
  { value: 'accepted', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export default function RegulatorSubmissionsHistoryPage() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const statusParam =
    filterStatus === 'all' ? 'accepted,rejected' : filterStatus;

  const { data, isLoading, error } = useQuery({
    queryKey: ['submissions', 'history', { statusParam }],
    queryFn: () => listSubmissions({ status: statusParam }),
  });

  const rows = useMemo(() => data?.submissions ?? [], [data]);

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      const orgName = row.orgName?.toLowerCase?.() || '';
      const template = row.templateName?.toLowerCase?.() || '';
      return (
        orgName.includes(term) ||
        template.includes(term) ||
        row.status?.toLowerCase?.().includes(term)
      );
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
        flex: 1.2,
        minWidth: 200,
      },
      {
        field: 'status',
        headerName: 'Decision',
        width: 140,
        renderCell: ({ value }) => (
          <Chip
            size="small"
            label={STATUS_LABEL[value] || value || '—'}
            color={STATUS_COLOR[value] || 'default'}
            sx={{ textTransform: 'capitalize' }}
          />
        ),
      },
      {
        field: 'updatedAt',
        headerName: 'Decision date',
        width: 190,
        valueFormatter: ({ value }) => (value ? fmtDateTime(value) : '—'),
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
    ],
    []
  );

  const detailFiles = useMemo(() => selected?.files ?? [], [selected]);
  const validationMessages = useMemo(() => selected?.validation?.messages ?? [], [selected]);
  const validationOk = selected?.validation?.ok;

  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={800}>
        Decision history
      </Typography>
      <Typography variant="body2" color="text.secondary" maxWidth={720}>
        Track every filing that has been approved or rejected. Use the search and filters to audit prior regulator decisions.
      </Typography>

      <Card variant="outlined">
        <CardContent>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', md: 'center' }}
          >
            <TextField
              size="small"
              select
              label="Decision"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {FILTER_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by organization or filing"
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
            sorting: { sortModel: [{ field: 'updatedAt', sort: 'desc' }] },
            pagination: { paginationModel: { pageSize: 15, page: 0 } },
          }}
          pageSizeOptions={[15, 30, 50]}
          disableRowSelectionOnClick
          onRowClick={(params) => setSelected(params.row)}
        />
        {error && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {error.message || 'Failed to load submissions'}
          </Typography>
        )}
      </Box>

      <Drawer
        anchor="right"
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, p: 2.5 } }}
      >
        {selected && (
          <Stack spacing={2}>
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
              <Typography variant="body2" color="text.secondary">
                Decided {selected.updatedAt ? fmtDateTime(selected.updatedAt) : '—'}
              </Typography>
              <Chip
                size="small"
                color={STATUS_COLOR[selected.status] || 'default'}
                label={STATUS_LABEL[selected.status] || selected.status || '—'}
                sx={{ textTransform: 'capitalize', width: 'fit-content' }}
              />
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
          </Stack>
        )}
      </Drawer>
    </Stack>
  );
}
