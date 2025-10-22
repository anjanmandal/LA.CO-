import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Drawer,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { DataGrid } from '@mui/x-data-grid';
import ArticleIcon from '@mui/icons-material/ArticleOutlined';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import { listMySubmissions } from '../api/submissions';
import { fmtDateTime, fmtInt } from '../utils/format';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

export default function OperatorSubmissionsPage() {
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['submissions', 'mine', { status }],
    queryFn: () => listMySubmissions({ status: status || undefined }),
  });

  const rows = useMemo(() => data?.submissions ?? [], [data]);

  const columns = useMemo(
    () => [
      { field: 'templateName', headerName: 'Filing Template', flex: 1 },
      {
        field: 'status',
        headerName: 'Status',
        width: 140,
        renderCell: ({ value }) => <Chip size="small" label={value} sx={{ textTransform: 'capitalize' }} />,
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

  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={800}>
        Submissions
      </Typography>
      <Typography variant="body2" color="text.secondary" maxWidth={720}>
        Review all filings submitted by your organization. Each submission lists the validation results and
        attached evidence.
      </Typography>

      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
            <TextField
              size="small"
              label="Status"
              select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ height: 520, width: '100%' }}>
        <DataGrid
          loading={isLoading}
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          initialState={{
            sorting: { sortModel: [{ field: 'createdAt', sort: 'desc' }] },
            pagination: { paginationModel: { pageSize: 10, page: 0 } },
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
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
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, p: 2 } }}
      >
        {selected && (
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Typography variant="h6" fontWeight={700}>
                {selected.templateName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Submitted {selected.createdAt ? fmtDateTime(selected.createdAt) : '—'}
              </Typography>
              <Chip
                size="small"
                color={validationOk ? 'success' : 'warning'}
                label={validationOk ? 'Validation OK' : 'Needs review'}
                sx={{ textTransform: 'capitalize', width: 'fit-content' }}
              />
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
                <Stack spacing={0.5}>
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
