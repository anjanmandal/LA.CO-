import { useMemo } from 'react';
import {
  Table, TableHead, TableBody, TableRow, TableCell, TextField, MenuItem, Typography, Chip, Stack
} from '@mui/material';

const TARGET_KEYS = [
  null,
  'facility_name',
  'year',
  'month',
  'co2e_tonnes',
  'scope',
  'source',
  'method',
  'dataset_version',
];

// Optional: keys you consider required
const REQUIRED = new Set(['facility_name', 'year', 'co2e_tonnes']);

export default function HeaderMappingTable({ headers, mapping, onChange }) {
  const map = useMemo(() => {
    const m = {};
    for (const h of headers) m[h] = mapping?.[h] ?? null;
    return m;
  }, [headers, mapping]);

  const handleSelect = (h, value) => {
    onChange({ ...map, [h]: value || null });
  };

  const missingRequired = useMemo(() => {
    const chosen = new Set(Object.values(map).filter(Boolean));
    return [...REQUIRED].filter((k) => !chosen.has(k));
  }, [map]);

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle2">Map headers to required schema</Typography>
        {missingRequired.length > 0 ? (
          <Chip color="warning" size="small" label={`Missing: ${missingRequired.join(', ')}`} />
        ) : (
          <Chip color="success" size="small" label="All required mapped" />
        )}
      </Stack>

      <Table size="small" aria-label="Header mapping table">
        <TableHead>
          <TableRow>
            <TableCell width={48}>#</TableCell>
            <TableCell>CSV Header</TableCell>
            <TableCell>Maps To</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {headers.map((h, i) => (
            <TableRow key={h}>
              <TableCell>{i + 1}</TableCell>
              <TableCell>{h}</TableCell>
              <TableCell>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={map[h] ?? ''}
                  onChange={(e) => handleSelect(h, e.target.value || null)}
                >
                  {TARGET_KEYS.map((k) => (
                    <MenuItem key={String(k)} value={k ?? ''}>
                      {k ?? '— ignore —'}
                    </MenuItem>
                  ))}
                </TextField>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
