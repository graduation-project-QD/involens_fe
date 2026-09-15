import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import DocumentDetailPage from './pages/DocumentDetailPage'
import WorkspacePage from './pages/WorkspacePage'

/** Cấu hình các màn hình và route chính của ứng dụng Involens. */
export default function App() {
  console.debug('[App] Rendering application routes')
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/documents/:documentId"
            element={<DocumentDetailPage />}
          />
          {[
            'documents',
            'upload',
            'approvals',
            'errors',
            'invoices',
            'activity',
          ].map((kind) => (
            <Route
              key={kind}
              path={`/${kind}`}
              element={<WorkspacePage kind={kind} />}
            />
          ))}
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
