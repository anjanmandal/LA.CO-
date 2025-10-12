// src/components/Metrics/ReconciliationView.jsx
import { useEffect, useState, useMemo } from 'react';
import { Drawer, Box } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import SectionCard from '../common/SectionCard';
import { PanelError } from '../common/LoadState';
import { getReconciliation } from '../../api/metrics';
import { fmtInt } from '../../utils/format';
import ReconciliationExplain from './ReconciliationExplain';

export default function ReconciliationView({ facilityId }) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null);

  useEffect(() => {
    if (!facilityId) return;
    let alive = true;
    setLoading(true);
    getReconciliation(facilityId)
      .then(d => { if (alive) setRows(d.rows || []); })
      .catch(e => { if (alive) setErr(e.message); })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [facilityId]);
  console.log('RECONCILIATION ROWS', {rows});

  const columns = useMemo(() => ([
    { field: 'year', headerName: 'Year', width: 100, type: 'number' },
    { field: 'observed', headerName: 'Observed (tCO₂e)', flex: 1, valueFormatter: (p) => fmtInt(p) },
    { field: 'reported', headerName: 'Reported (tCO₂e)', flex: 1, valueFormatter: (p) => fmtInt(p) },
    {
      field: 'delta', headerName: 'Delta', flex: 1, valueFormatter: (p) => fmtInt(p),
      cellClassName: (p)=> (p?.value ?? 0) === 0 ? '' : ((p.value ?? 0) > 0 ? 'dg-warn' : 'dg-info')
    },
    { field: 'pct', headerName: '% vs Observed', width: 160, valueFormatter: (p) => (p == null ? '—' : `${p.toFixed(1)}%`) },
  ]), []);

  const gridRows = rows.map(r => ({ id: r.year, ...r }));

  return (
    <SectionCard title="Reconciliation (Reported vs Observed)" subtitle="Click a year to see the adjustment breakdown and explanation.">
      <PanelError message={err} />
      <div style={{ height: 440, width: '100%' }}>
        <DataGrid
          loading={loading}
          rows={gridRows}
          columns={columns}
          density="compact"
          disableRowSelectionOnClick
          onRowClick={(p) => { setSelectedYear(p.row.year); setOpen(true); }}
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 300 } } }}
          initialState={{
            sorting: { sortModel: [{ field: 'year', sort: 'asc' }] },
            pagination: { paginationModel: { pageSize: 10 } }
          }}
          pageSizeOptions={[10, 25, 50]}
        />
      </div>

      <Drawer anchor="right" open={open} onClose={()=>setOpen(false)} PaperProps={{ sx:{ width: 520, p: 2 } }}>
        <Box sx={{ p: 1 }}>
          <ReconciliationExplain facilityId={facilityId} year={selectedYear} />
        </Box>
      </Drawer>
    </SectionCard>
  );
}
