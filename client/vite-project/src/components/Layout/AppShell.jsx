import { useState } from 'react';
import { Box, Toolbar, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Outlet } from 'react-router-dom';

const DRAWER_WIDTH = 260;

export default function AppShell({ mode, onToggle }) {
  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleOpenSidebar = () => setMobileOpen(true);
  const handleCloseSidebar = () => setMobileOpen(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top App Bar */}
      <Topbar
        mode={mode}
        onToggle={onToggle}
        onOpenSidebar={!mdUp ? handleOpenSidebar : undefined}
        drawerWidth={DRAWER_WIDTH} 
      />

      {/* Sidebar (temporary on mobile, permanent on md+) */}
      <Sidebar
        width={DRAWER_WIDTH}
        mobileOpen={mobileOpen}
        onClose={handleCloseSidebar}
        permanent={mdUp}
      />

      {/* Main content */}
      <Box
        component="main"
        sx={(t) => ({
          flexGrow: 1,
          minWidth: 0,                         // <- lets maps/charts expand
          px: { xs: 2, md: 3 },
          py: 2,
          // Only reserve space for the drawer when it's permanent (md+)
          ml: { md: `${DRAWER_WIDTH}px` },
          transition: t.transitions.create(['margin'], {
            duration: t.transitions.duration.shorter,
          }),
        })}
      >
        <Toolbar />  {/* pushes content below Topbar */}
        <Outlet />

        <Box
          component="footer"
          sx={{
            mt: 4,
            pt: 2,
            pb: 3,
            textAlign: 'center',
            borderTop: '1px solid',
            borderColor: 'divider',
            color: 'text.secondary',
          }}
        >
          &copy; {new Date().getFullYear()} BayouCarbon
        </Box>
      </Box>
    </Box>
  );
}
