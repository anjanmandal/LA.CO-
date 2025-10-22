import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Paper elevation={6} sx={{ maxWidth: 440, width: '100%', p: 4 }}>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={600}>
            Access denied
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {user
              ? 'You do not have permission to view this page. Please contact your administrator if you believe this is an error.'
              : 'You need to sign in to view this page.'}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={() => navigate('/')}>
              Go home
            </Button>
            {!user && (
              <Button variant="outlined" onClick={() => navigate('/login')}>
                Sign in
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
