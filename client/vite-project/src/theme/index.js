import { createTheme, alpha } from '@mui/material/styles';

const brand = {
  green: '#22c55e',
  blue: '#2563eb',
  amber: '#f59e0b',
  slate: {
    50:'#f8fafc',100:'#f1f5f9',200:'#e2e8f0',300:'#cbd5e1',
    400:'#94a3b8',500:'#64748b',600:'#475569',700:'#334155',
    800:'#1f2937',900:'#0f172a'
  },
  white: '#ffffff',
  black: '#0b0f1a',
};

export const createAppTheme = (mode='light') => createTheme({
  palette: {
    mode,
    primary: { main: brand.green },
    secondary: { main: brand.blue },
    warning: { main: brand.amber },
    background: {
      default: mode === 'light' ? brand.slate[50] : brand.black,
      paper:   mode === 'light' ? brand.white     : brand.slate[800],
    },
    text: {
      primary:   mode === 'light' ? brand.slate[800] : brand.slate[100],
      secondary: mode === 'light' ? brand.slate[500] : brand.slate[400],
    },
    divider: mode === 'light'
      ? brand.slate[200]
      : alpha(brand.slate[700], 0.8),
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial`,
    h1:{fontWeight:800,letterSpacing:-0.5},
    h2:{fontWeight:800,letterSpacing:-0.4},
    h3:{fontWeight:700,letterSpacing:-0.3},
    h4:{fontWeight:700},
    button:{textTransform:'none',fontWeight:600},
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        body: {
          backgroundImage:
            theme.palette.mode === 'light'
              ? 'radial-gradient(60rem 60rem at 112% -10%, rgba(34,197,94,0.08) 0, rgba(34,197,94,0) 60%)'
              : 'radial-gradient(60rem 60rem at 112% -10%, rgba(34,197,94,0.15) 0, rgba(34,197,94,0) 60%)',
        },
      }),
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme }) => ({
          border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
          backgroundImage: 'none',
        }),
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: 'none',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        }),
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 12 },
        containedPrimary: { boxShadow: 'none', ':hover': { boxShadow: 'none' } },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: ({ theme }) => ({
          border: 'none',
          '--DataGrid-rowBorderColor': alpha(theme.palette.divider, 0.5),
          '--DataGrid-containerBackground': 'transparent',
        }),
        columnHeaders: ({ theme }) => ({
          background: alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.06 : 0.12),
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
          backdropFilter: 'saturate(180%) blur(6px)',
        }),
      },
    },
  },
});
