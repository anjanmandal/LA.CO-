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
import CcusProjectPage from './pages/CcusProjectPage';
import PublicPortalPage from './pages/PublicPortalPage';
import UploadPage from './pages/UploadPage';
import MRVPage from './pages/MRVPage';
import SubmitPage from './pages/SubmitPage';
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
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell mode={mode} onToggle={toggle} />}>
              <Route index element={<UploadPage />} />
              <Route path="mrv" element={<MRVPage />} />
              <Route path="copilot" element={<CopilotPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="filings/:templateId" element={<SubmissionWizard />} />
              <Route path="/submit" element={<SubmitPage />} />
              <Route path="/ccus" element={<CcusProjectPage />} />
              <Route path="/public" element={<PublicPortalPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><Root /></React.StrictMode>
);
