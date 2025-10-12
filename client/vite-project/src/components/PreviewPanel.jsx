import { useState } from 'react';
import { Card, CardContent, Chip, Stack, Typography, Divider, Collapse, Button } from '@mui/material';
import DatasetOutlinedIcon from '@mui/icons-material/DatasetOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';

export default function PreviewPanel({ preview }) {
  const [showProblems, setShowProblems] = useState(false);
  if (!preview) return null;

  const { adapter, previewStats = {} } = preview;
  const isTrace = adapter === 'trace_sector';
  const problems = previewStats.problems || [];

  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack spacing={1.25}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="h6">Preview</Typography>
            <Chip
              icon={<DatasetOutlinedIcon />}
              label={`Adapter: ${adapter || '—'}`}
              variant="outlined"
            />
            <Chip color="success" label={`Valid rows: ${previewStats.ok ?? 0}`} />
            <Chip color={problems.length ? 'warning' : 'default'} label={`Issues: ${problems.length}`} />
            {isTrace ? (
              <Chip icon={<ShieldOutlinedIcon />} color="info" variant="outlined" label="Climate TRACE detected" />
            ) : (
              <Chip variant="outlined" label="Operator upload" />
            )}
          </Stack>

          <Typography variant="body2" color="text.secondary">
            Checked {previewStats.checked ?? 0} sample rows.
          </Typography>

          {problems.length > 0 && (
            <>
              <Divider />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2">Problems</Typography>
                <Button size="small" onClick={() => setShowProblems((s) => !s)}>
                  {showProblems ? 'Hide' : 'Show'} first 10
                </Button>
              </Stack>
              <Collapse in={showProblems}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(problems.slice(0, 10), null, 2)}
                </pre>
              </Collapse>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
