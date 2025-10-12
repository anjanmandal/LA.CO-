import { IconButton, Tooltip } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightModeRounded';
import DarkModeIcon from '@mui/icons-material/DarkModeRounded';

export default function ThemeToggle({ mode, onToggle }) {
  return (
    <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
      <IconButton color="inherit" onClick={onToggle} size="small" sx={{ ml: 1 }}>
        {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
      </IconButton>
    </Tooltip>
  );
}
