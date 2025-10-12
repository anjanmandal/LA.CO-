// src/components/Layout/Topbar.jsx
import { useMemo } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  InputBase,
  Stack,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/MenuRounded';
import SearchIcon from '@mui/icons-material/SearchRounded';
import HelpOutlineRounded from '@mui/icons-material/HelpOutlineRounded';
import NotificationsNoneRounded from '@mui/icons-material/NotificationsNoneRounded';

import ThemeToggle from './ThemeToggle';
import LAco2Icon from '../icon/LAco2Icon';

export default function Topbar({ mode, onToggle, onOpenSidebar, drawerWidth = 260 }) {
  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));

  // Subtle glass backdrop with hairline bottom border & faint gradient accent
  const barSx = useMemo(
    () => ({
      zIndex: theme.zIndex.drawer + 1,
      width: { md: `calc(100% - ${drawerWidth}px)` },
      ml: { md: `${drawerWidth}px` },
      background: `linear-gradient(
        180deg,
        ${alpha(theme.palette.background.paper, theme.palette.mode === 'light' ? 0.88 : 0.5)} 0%,
        ${alpha(theme.palette.background.paper, theme.palette.mode === 'light' ? 0.72 : 0.35)} 100%
      )`,
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
    }),
    [drawerWidth, theme]
  );

  return (
    <AppBar elevation={0} color="transparent" position="fixed" sx={barSx}>
      <Toolbar sx={{ minHeight: 64, px: { xs: 1.25, md: 2 }, gap: 1 }}>
        {/* Mobile: hamburger */}
        {!mdUp && onOpenSidebar && (
          <IconButton edge="start" onClick={onOpenSidebar} aria-label="Open sidebar">
            <MenuIcon />
          </IconButton>
        )}

        {/* Brand */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ minWidth: 0, mr: 1 }}
        >
         
          {mdUp && (
            <Typography
              variant="subtitle1"
              fontWeight={800}
              sx={{
                letterSpacing: 0.4,
                color: 'text.primary',
                whiteSpace: 'nowrap',
              }}
            >
              LA.CO₂
            </Typography>
          )}
        </Stack>

        {/* Search (grows) */}
        <Box
          role="search"
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.75,
            maxWidth: 720,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
            bgcolor:
              theme.palette.mode === 'light'
                ? alpha(theme.palette.background.paper, 0.9)
                : alpha('#000', 0.25),
          }}
        >
          <SearchIcon fontSize="small" />
          <InputBase
            placeholder="Search facilities, sectors…"
            inputProps={{ 'aria-label': 'Search' }}
            sx={{ flex: 1, fontSize: 14 }}
          />
        </Box>

        {/* Right actions */}
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ ml: 1 }}>
          <IconButton aria-label="Help">
            <HelpOutlineRounded />
          </IconButton>
          <IconButton aria-label="Notifications">
            <NotificationsNoneRounded />
          </IconButton>
          <ThemeToggle mode={mode} onToggle={onToggle} />
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
