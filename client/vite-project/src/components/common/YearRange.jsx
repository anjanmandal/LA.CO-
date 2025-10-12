// src/components/common/YearRange.jsx
import { Stack, TextField } from '@mui/material';
export default function YearRange({ from, to, setFrom, setTo, min=2000, max=new Date().getFullYear(), size="small" }) {
  const clamp = (v) => Math.min(Math.max(v, min), max);
  return (
    <Stack direction="row" spacing={1}>
      <TextField
        size={size} label="From" type="number" value={from}
        onChange={(e)=>setFrom(clamp(+e.target.value || min))} sx={{ width: 120 }}
        inputProps={{ min, max }}
      />
      <TextField
        size={size} label="To" type="number" value={to}
        onChange={(e)=>setTo(clamp(+e.target.value || max))} sx={{ width: 120 }}
        inputProps={{ min, max }}
      />
    </Stack>
  );
}
