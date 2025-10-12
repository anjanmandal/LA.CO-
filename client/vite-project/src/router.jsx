import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import AppShell from '../components/Layout/AppShell'
import UploadPage from '../pages/UploadPage'
import MRVPage from '../pages/MRVPage'
import CopilotPage from '../pages/CopilotPage'
import TasksPage from '../pages/TasksPage'
import SubmissionWizard from '../pages/SubmissionWizard';
import PublicPortalPage from './pages/PublicPortalPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell mode={mode} onToggle={toggle} />, // Shell is inside router
    children: [
      { index: true, element: <UploadPage /> },
      { path: 'mrv', element: <MRVPage /> },
      { path: 'copilot', element: <CopilotPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'filings/:templateId', element: <SubmissionWizard /> },
      { path:'public', element:<PublicPortalPage /> }
      
    ],
  },
])

// then <RouterProvider router={router} />


export default router
