// web/src/components/Public/CivicBriefCard.jsx
import { useEffect, useState } from 'react';
import { Card, CardContent, Stack, Typography, Button, MenuItem, TextField } from '@mui/material';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import { http } from '../../api/http';

export default function CivicBriefCard({ projectId, defaultLang='en' }) {
  const [lang, setLang] = useState(defaultLang);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    setBusy(true); setErr('');
    try {
      const r = await http.get(`/public/briefs/${projectId}?lang=${lang}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'brief failed');
      setData(d);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  useEffect(()=>{ load(); /* regenerate on lang change */ }, [lang, projectId]);

  return (
    <Card>
      <CardContent>
        <Stack spacing={1.2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <GraphicEqIcon />
            <Typography variant="h6">Civic Brief (60s)</Typography>
            <TextField select size="small" value={lang} onChange={(e)=>setLang(e.target.value)} sx={{ ml:'auto', width:120 }}>
              {['en','es','fr','vi'].map(l => <MenuItem key={l} value={l}>{l.toUpperCase()}</MenuItem>)}
            </TextField>
          </Stack>

          {err && <Typography color="error">{err}</Typography>}

          {data && (
            <>
              <audio controls src={data.audioUrl} style={{ width:'100%' }} />
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace:'pre-wrap' }}>
                {data.transcript}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" href={data.audioUrl} download>Download audio</Button>
                <Button variant="outlined" onClick={()=>navigator.share?.({title:'Civic Brief', url:window.location.href})}>
                  Share
                </Button>
                {data.cached && <Typography variant="caption" color="text.secondary" sx={{ ml:1 }}>cached</Typography>}
              </Stack>
            </>
          )}

          <Button variant="contained" onClick={load} disabled={busy}>
            {busy ? 'Generating…' : 'Refresh brief'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
