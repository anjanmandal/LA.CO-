import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useColorMode } from './hooks/useColorMode';
import AppShell from './components/Layout/AppShell';
import CopilotPage from './pages/CopilotPage';
import TasksPage from './pages/TasksPage';
import SubmissionWizard from './pages/SubmissionWizard';
import OperatorSubmissionsPage from './pages/OperatorSubmissionsPage';
import RegulatorSubmissionsPage from './pages/RegulatorSubmissionsPage';
import RegulatorSubmissionsHistoryPage from './pages/RegulatorSubmissionsHistoryPage';
import CcusProjectPage from './pages/CcusProjectPage';
import SectorDeepDivePage from './pages/SectorDeepDivePage';
import PublicSectorDeepDivePage from './pages/PublicSectorDeepDivePage';
import PublicPortalPage from './pages/PublicPortalPage';
import PublicStateEmissionsPage from './pages/PublicStateEmissionsPage';
import StateEmissionsUploadPage from './pages/StateEmissionsUploadPage';
import UploadPage from './pages/UploadPage';
import MRVPage from './pages/MRVPage';
import SubmitPage from './pages/SubmitPage';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import HomePage from './pages/HomePage';
import CcusAdminPage from './pages/CcusAdminPage';
import RequireAuth from './components/auth/RequireAuth';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import 'leaflet/dist/leaflet.css';
import 'maplibre-gl/dist/maplibre-gl.css';

const qc = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

function Root() {
  const { theme, mode, toggle } = useColorMode();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              <Route
                element={(
                  <RequireAuth>
                    <AppShell mode={mode} onToggle={toggle} />
                  </RequireAuth>
                )}
              >
                <Route
                  index
                  element={<HomePage />}
                />
                <Route
                  path="upload"
                  element={(
                    <RequireAuth roles={['operator', 'admin']}>
                      <UploadPage />
                    </RequireAuth>
                  )}
                />
                <Route
                  path="mrv"
                  element={(
                    <RequireAuth roles={['regulator', 'admin']}>
                      <MRVPage />
                    </RequireAuth>
                  )}
                />
                <Route
                  path="copilot"
                  element={(
                    <RequireAuth roles={['operator', 'regulator', 'admin']}>
                      <CopilotPage />
                    </RequireAuth>
                  )}
                />
                <Route
                  path="tasks"
                  element={(
                    <RequireAuth roles={['operator', 'regulator', 'admin']}>
                      <TasksPage />
                    </RequireAuth>
                  )}
                />
                <Route
                  path="metrics/deep-dive"
                  element={(
                    <RequireAuth roles={['regulator', 'admin']}>
                      <SectorDeepDivePage />
                    </RequireAuth>
                  )}
                />
                <Route
                  path="submissions"
                  element={(
                    <RequireAuth roles={['operator', 'admin']}>
                      <OperatorSubmissionsPage />
                    </RequireAuth>
                  )}
                />
                <Route
                  path="submissions/review"
                  element={(
                    <RequireAuth roles={['regulator', 'admin']}>
                      <RegulatorSubmissionsPage />
                    </RequireAuth>
                  )}
                />
                <Route
                  path="submissions/history"
                  element={(
                    <RequireAuth roles={['regulator', 'admin']}>
                      <RegulatorSubmissionsHistoryPage />
                    </RequireAuth>
                  )}
                />
                <Route
                  path="filings/:templateId"
                  element={(
                    <RequireAuth roles={['operator', 'regulator', 'admin']}>
                      <SubmissionWizard />
                    </RequireAuth>
                  )}
                />
                <Route
                  path="submit"
                  element={(
                    <RequireAuth roles={['operator', 'admin']}>
                      <SubmitPage />
                    </RequireAuth>
                  )}
                />
                <Route
                  path="ccus"
                  element={(
                    <RequireAuth roles={['regulator', 'admin']}>
                      <CcusProjectPage />
                    </RequireAuth>
                  )}
                />
                <Route
                  path="ccus/admin"
                  element={(
                    <RequireAuth roles={['regulator', 'admin']}>
                      <CcusAdminPage />
                    </RequireAuth>
                  )}
                />
                <Route
                  path="public"
                  element={(
                    <RequireAuth roles={['public', 'operator', 'regulator', 'admin']}>
                      <PublicPortalPage />
                    </RequireAuth>
                  )}
                />
                <Route
                  path="public/state-emissions"
                  element={(
                    <RequireAuth roles={['public', 'operator', 'regulator', 'admin']}>
                      <PublicStateEmissionsPage />
                    </RequireAuth>
                  )}
                />
                <Route
                  path="public/state-emissions/upload"
                  element={(
                    <RequireAuth roles={['admin']}>
                      <StateEmissionsUploadPage />
                    </RequireAuth>
                  )}
                />
                <Route
                  path="public/sector-deep-dive"
                  element={(
                    <RequireAuth roles={['public']}>
                      <PublicSectorDeepDivePage />
                    </RequireAuth>
                  )}
                />
              </Route>
            </Routes>
          </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><Root /></React.StrictMode>
);
