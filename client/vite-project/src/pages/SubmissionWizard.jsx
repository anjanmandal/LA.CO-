import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Card, CardContent, Stack, Typography, TextField, MenuItem, Button, Alert } from '@mui/material';
import { getTemplate, submitFiling } from '../api/copilot';

export default function SubmissionWizard() {
  const { templateId } = useParams();
  const [tmpl, setTmpl] = useState(null);
  const [values, setValues] = useState({});
  const [files, setFiles] = useState({});
  const [result, setResult] = useState(null);

  useEffect(()=>{ (async()=> setTmpl(await getTemplate(templateId)))() }, [templateId]);

  const setVal = (k, v) => setValues(x=>({ ...x, [k]: v }));

  const onSubmit = async () => {
    const fileList = Object.entries(files).map(([field, file]) => ({ field, file }));
    const res = await submitFiling({ orgId:'demo-org', taskId:null, templateId, values, files: fileList });
    setResult(res);
  };

  if (!tmpl) return null;
  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={800}>{tmpl.name}</Typography>
      <Card><CardContent>
        <Stack spacing={2}>
          {tmpl.fields.map(f=>{
            if (f.type === 'select') return (
              <TextField key={f.key} select label={f.label} required={f.required}
                value={values[f.key] ?? ''} onChange={e=>setVal(f.key, e.target.value)} helperText={f.help||''}>
                {f.options.map(op=><MenuItem key={op} value={op}>{op}</MenuItem>)}
              </TextField>
            );
            if (f.type === 'multiline') return (
              <TextField key={f.key} label={f.label} multiline minRows={3}
                value={values[f.key] ?? ''} onChange={e=>setVal(f.key, e.target.value)} helperText={f.help||''} />
            );
            return (
              <TextField key={f.key} label={f.label} type={f.type==='number'?'number':'text'} required={f.required}
                value={values[f.key] ?? ''} onChange={e=>setVal(f.key, e.target.value)} helperText={f.help||''} />
            );
          })}
          {tmpl.attachments?.length>0 && (
            <Box>
              <Typography variant="subtitle2">Attachments</Typography>
              <Stack spacing={1} mt={1}>
                {tmpl.attachments.map(a=>(
                  <div key={a.key}>
                    <Typography variant="body2" gutterBottom>{a.label} {a.required && '(required)'}</Typography>
                    <input type="file" onChange={e=>setFiles(s=>({ ...s, [a.key]: e.target.files?.[0] }))} />
                  </div>
                ))}
              </Stack>
            </Box>
          )}
          <Button variant="contained" onClick={onSubmit}>Submit</Button>
          {result && (
            <Alert severity={result.validation?.ok ? 'success' : 'warning'}>
              {result.validation?.messages?.join(' • ') || 'Submitted'}
            </Alert>
          )}
        </Stack>
      </CardContent></Card>
    </Stack>
  );
}
