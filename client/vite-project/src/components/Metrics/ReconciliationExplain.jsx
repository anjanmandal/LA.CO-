// web/src/components/Metrics/ReconciliationExplain.jsx
import { useEffect, useMemo, useState } from 'react';
import { Box, Stack, Typography, Chip, Button, Tooltip } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { getReconciliationExplain } from '../../api/metrics';

export default function ReconciliationExplain({ facilityId, year }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!facilityId) return;
    let alive = true;
    setErr('');
    setLoading(true);
    getReconciliationExplain(facilityId, year)
      .then((payload) => { if (alive) setData(payload); })
      .catch((e) => { if (alive) setErr(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [facilityId, year]);
  const wf = useMemo(() => {
    if (!data?.breakdown) return null;
    let run = 0;
    const labels = [], base = [], up = [], down = [], final = [];
    for (const p of data.breakdown) {
      labels.push(p.label);
      if (p.type === 'base') {
        run = p.value || 0; base.push(run); up.push(0); down.push(0); final.push(0);
      } else if (p.type === 'adjustment' || p.type === 'residual') {
        const v = p.value || 0;
        if (v >= 0) { base.push(run); up.push(v); down.push(0); }
        else        { base.push(run + v); up.push(0); down.push(Math.abs(v)); }
        final.push(0); run += v;
      } else {
        base.push(0); up.push(0); down.push(0); final.push(p.value || 0);
      }
    }
    return { labels, base, up, down, final };
  }, [data]);

  if (err) return <Typography color="error">{err}</Typography>;
  if (loading || !data) return <Typography variant="body2">Loading…</Typography>;

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="subtitle1">Why Reported ≠ Observed</Typography>
        <Chip size="small" label={`Year ${data.year}`} />
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Download CSV">
          <Button size="small" variant="outlined" onClick={()=>{
            const rows = (data.breakdown||[]).map(b => ({label:b.label, value:b.value, type:b.type}));
            const csv = ['label,value,type', ...rows.map(r => `"${r.label.replace(/"/g,'""')}",${r.value},${r.type}`)].join('\n');
            const blob = new Blob([csv], { type:'text/csv' }); const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `recon_${data.year}.csv`; a.click();
            URL.revokeObjectURL(url);
          }}>CSV</Button>
        </Tooltip>
      </Stack>

      {wf && (
        <BarChart
          height={200}
          xAxis={[{ data: wf.labels, scaleType: 'band' }]}
          series={[
            { data: wf.base,  label:'Base',   stack:'w', color:'transparent' },
            { data: wf.up,    label:'Adj (+)', stack:'w' },
            { data: wf.down,  label:'Adj (−)', stack:'w' },
            { data: wf.final, label:'Reported' },
          ]}
          slotProps={{ legend: { direction:'row', position:{ vertical:'top', horizontal:'center' } } }}
        />
      )}

      <Stack direction="row" spacing={3}>
        <Typography variant="body2"><b>Observed:</b> {Math.round(data.meta.observed||0).toLocaleString()} t</Typography>
        <Typography variant="body2"><b>Reported:</b> {Math.round(data.meta.reported||0).toLocaleString()} t</Typography>
        <Typography variant="body2"><b>Δ:</b> {Math.round((data.meta.delta)||0).toLocaleString()} t</Typography>
      </Stack>

      {data.explanation && (
        <>
          <Typography variant="subtitle2">Explanation</Typography>
          <Typography variant="body2" sx={{ whiteSpace:'pre-wrap' }}>{data.explanation}</Typography>
        </>
      )}
    </Stack>
  );
}
