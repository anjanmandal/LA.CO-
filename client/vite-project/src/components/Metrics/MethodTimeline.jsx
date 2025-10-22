// src/components/Metrics/MethodTimeline.jsx
import { useEffect, useMemo, useState } from 'react';
import { Typography } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import SectionCard from '../common/SectionCard';
import { PanelError } from '../common/LoadState';
import { getMethods } from '../../api/metrics';

export default function MethodTimeline({ facilityId, from=2015, to=2025, hasFacilities=false }) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!facilityId) {
      setRows([]);
      setLoading(false);
      setErr('');
      return () => { alive = false; };
    }
    setLoading(true);
    setErr('');
    setRows([]);
    const params = new URLSearchParams({ facilityId, from, to }).toString();
    getMethods(params)
      .then(d => { if (alive) setRows(d.rows || []); })
      .catch(e => { if (alive) setErr(e.message); })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [facilityId, from, to]);

  const columns = useMemo(() => ([
    { field: 'year', headerName: 'Year', width: 100, type: 'number' },
    { field: 'month', headerName: 'Month', width: 90, valueFormatter: (p) => p ?? '—' },
    { field: 'source', headerName: 'Source', width: 140 },
    { field: 'method', headerName: 'Method', flex: 1, minWidth: 240, valueGetter: (p)=> p || '—' },
    { field: 'datasetVersion', headerName: 'Version', width: 140, valueGetter:(p)=> p || '—' },
  ]), []);

  const gridRows = rows.map((r, i) => ({ id: i, ...r }));

  return (
    <SectionCard title="Method Tracking">
      <PanelError message={err} />
      {!facilityId ? (
        <Typography variant="body2" color="text.secondary">
          {hasFacilities ? 'Select a facility to review method lineage.' : 'Facilities not found.'}
        </Typography>
      ) : (
        <div style={{ height: 460, width: '100%' }}>
          <DataGrid
            loading={loading}
            rows={gridRows}
            columns={columns}
            disableRowSelectionOnClick
            density="compact"
            slots={{ toolbar: GridToolbar }}
            slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 300 }, csvOptions: { fileName: 'method-timeline' } } }}
            initialState={{
              sorting: { sortModel: [{ field: 'year', sort: 'asc' }] },
              pagination: { paginationModel: { pageSize: 25 } }
            }}
            pageSizeOptions={[25, 50, 100]}
          />
        </div>
      )}
    </SectionCard>
  );
}
