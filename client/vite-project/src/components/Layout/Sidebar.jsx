// src/components/Layout/Sidebar.jsx
import { alpha } from '@mui/material/styles';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Stack,
  Divider,
  Tooltip,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/DashboardRounded';
import UploadIcon from '@mui/icons-material/CloudUploadRounded';
import InsightsIcon from '@mui/icons-material/InsightsRounded';
import FactoryIcon from '@mui/icons-material/FactoryRounded';
import PublicIcon from '@mui/icons-material/PublicRounded';
import TaskIcon from '@mui/icons-material/TaskAltRounded';
import HomeIcon from '@mui/icons-material/HomeRounded';
import ArticleIcon from '@mui/icons-material/ArticleRounded';
import FactCheckIcon from '@mui/icons-material/FactCheckRounded';
import HistoryIcon from '@mui/icons-material/HistoryRounded';
import TimelineIcon from '@mui/icons-material/TimelineRounded';
import SettingsIcon from '@mui/icons-material/ManageAccountsRounded';
import AssessmentIcon from '@mui/icons-material/AssessmentRounded';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Brand icon
import LAco2Icon from '../icon/LAco2Icon';            // ← keep your path

const NAV_ITEM_SX = (t) => ({
  position: 'relative',
  minHeight: 44,
  borderRadius: 12,
  py: 1,                 // was paddingBlock: 8  (64px) ➜ now 8px
  px: 1.25,              // 10px
  mx: 1,
  my: 0.25,
  transition: t.transitions.create(['background-color', 'color'], {
    duration: t.transitions.duration.shortest,
  }),
  '& .MuiListItemIcon-root': { minWidth: 36, color: t.palette.text.secondary },
  '&:hover': {
    backgroundColor:
      t.palette.mode === 'light'
        ? alpha(t.palette.primary.main, 0.08)
        : alpha(t.palette.primary.main, 0.12),
  },
  '&.active': {
    color: t.palette.primary.main,
    backgroundColor:
      t.palette.mode === 'light'
        ? alpha(t.palette.primary.main, 0.12)
        : alpha(t.palette.primary.main, 0.18),
    '& .MuiListItemIcon-root': { color: t.palette.primary.main },
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 6,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 3,
    backgroundColor: 'transparent',
    transition: t.transitions.create(['background-color', 'width']),
  },
  '&:hover::before, &.active::before': {
    backgroundColor: t.palette.primary.main,
    width: 4,
  },
});


function NavItem({ to, icon, label, onClick }) {
  return (
    <ListItemButton
      component={NavLink}
      to={to}
      onClick={onClick}
      sx={NAV_ITEM_SX}
    >
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText primary={label} />
    </ListItemButton>
  );
}

export default function Sidebar({ width = 260, mobileOpen, onClose, permanent }) {
  const { user } = useAuth();
  const role = user?.role;

  const navItems = [
    { to: '/', icon: <HomeIcon />, label: 'Home', roles: ['public', 'operator', 'regulator', 'admin'] },
    { to: '/upload', icon: <UploadIcon />, label: 'Data Upload', roles: ['operator', 'admin'] },
    { to: '/copilot', icon: <InsightsIcon />, label: 'Compliance Copilot', roles: ['operator', 'admin'] },
    { to: '/tasks', icon: <TaskIcon />, label: 'Tasks', roles: ['operator', 'admin'] },
    { to: '/submissions', icon: <ArticleIcon />, label: 'Submissions', roles: ['operator', 'admin'] },
    { to: '/submissions/review', icon: <FactCheckIcon />, label: 'Filings Review', roles: ['regulator', 'admin'] },
    { to: '/submissions/history', icon: <HistoryIcon />, label: 'Decision History', roles: ['regulator', 'admin'] },
    { to: '/metrics/deep-dive', icon: <TimelineIcon />, label: 'Sector Deep Dive', roles: ['regulator', 'admin'] },
    { to: '/submit', icon: <UploadIcon />, label: 'Guided Submission', roles: ['operator', 'admin'] },
    { to: '/mrv', icon: <DashboardIcon />, label: 'MRV Analytics', roles: ['admin'] },
    { to: '/ccus', icon: <FactoryIcon />, label: 'CCUS Projects', roles: ['regulator', 'admin'] },
    { to: '/ccus/admin', icon: <SettingsIcon />, label: 'CCUS Admin', roles: ['regulator', 'admin'] },
    { to: '/public', icon: <PublicIcon />, label: 'Public Portal', roles: ['public', 'operator', 'regulator', 'admin'] },
    { to: '/public/state-emissions/upload', icon: <AssessmentIcon />, label: 'State Emissions Upload', roles: ['admin'] },
    { to: '/public/sector-deep-dive', icon: <TimelineIcon />, label: 'Public Trends', roles: ['public'] },
  ];

  const filteredItems = navItems.filter(item => !item.roles || (role && item.roles.includes(role)));
  const primaryItems = filteredItems.filter(item => item.label !== 'Public Portal');
  const publicPortalItem = filteredItems.find(item => item.label === 'Public Portal');

  const drawerContent = (
    <Box
      sx={(t) => ({
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        // a subtle vertical gradient for the whole rail
        backgroundImage:
          t.palette.mode === 'dark'
            ? `linear-gradient(180deg, ${alpha('#000', 0.14)}, transparent 28%)`
            : `linear-gradient(180deg, ${alpha('#000', 0.02)}, transparent 28%)`,
      })}
    >
      {/* Header matches AppBar height and shows brand */}
      <Toolbar
        disableGutters
        sx={(t) => ({
          px: 2,
          borderBottom: `1px solid ${alpha(t.palette.divider, 0.6)}`,
          background:
            t.palette.mode === 'dark'
              ? `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.12)}, ${alpha(
                  t.palette.primary.main,
                  0.06
                )})`
              : `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.08)}, ${alpha(
                  t.palette.primary.main,
                  0.04
                )})`,
        })}
      >
        <Stack
          component={Link}
          to="/"
          direction="row"
          spacing={1.1}
          alignItems="center"
          sx={{ textDecoration: 'none', color: 'inherit' }}
        >
          <Tooltip title="LA.CO₂ Home" arrow>
            <Box sx={{ display: 'grid', placeItems: 'center' }}>
              <LAco2Icon sx={{ fontSize: 28, color: 'primary.main' }} />
            </Box>
          </Tooltip>
          <Typography variant="subtitle1" fontWeight={800}>
            LA.CO₂
          </Typography>
        </Stack>
      </Toolbar>

      {/* Nav list */}
      <Box
        sx={(t) => ({
          p: 1.25,
          pt: 1,
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          // nicer scroll
          '&::-webkit-scrollbar': { width: 8 },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(t.palette.text.secondary, 0.25),
            borderRadius: 8,
          },
        })}
      >
        <Stack spacing={1.25}>
          <Typography variant="overline" color="text.secondary" sx={{ px: 1.5 }}>
            Navigation
          </Typography>
          <List disablePadding>
            {primaryItems.map(item => (
              <NavItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                onClick={onClose}
              />
            ))}
            {publicPortalItem && primaryItems.length > 0 && <Divider sx={{ my: 1.25 }} />}
            {publicPortalItem && (
              <NavItem
                key={publicPortalItem.to}
                to={publicPortalItem.to}
                icon={publicPortalItem.icon}
                label={publicPortalItem.label}
                onClick={onClose}
              />
            )}
          </List>
        </Stack>
      </Box>

      {/* Footer */}
      <Box
        sx={(t) => ({
          px: 2,
          py: 1.25,
          borderTop: `1px solid ${alpha(t.palette.divider, 0.6)}`,
          color: 'text.secondary',
        })}
      >
        <Typography variant="caption">v0.1 • © {new Date().getFullYear()}</Typography>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Temporary drawer for mobile */}
      {!permanent && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width,
              boxSizing: 'border-box',
              borderRight: (t) => `1px solid ${alpha(t.palette.divider, 0.6)}`,
              backgroundImage: 'none',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Permanent drawer for md+ */}
      {permanent && (
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width,
              boxSizing: 'border-box',
              borderRight: (t) => `1px solid ${alpha(t.palette.divider, 0.6)}`,
              backgroundImage: 'none',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
}
