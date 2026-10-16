import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import DocumentDetailPage from './pages/DocumentDetailPage'
import WorkspacePage from './pages/WorkspacePage'
import ExportPage from './pages/ExportPage'
import CreateAccountPage from './pages/CreateAccountPage'
import AccountsPage from './pages/AccountsPage'
import AccountDetailPage from './pages/AccountDetailPage'
import ProfilePage from './pages/ProfilePage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import { AuthProvider, useAuth } from './context/AuthContext'

/** Requires a verified authenticated identity before exposing business screens. */
function ProtectedRoutes() {
  console.debug('[Routes] Checking authenticated access')
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading)
    return (
      <p role="status" className="p-8">
        Đang xác thực phiên đăng nhập...
      </p>
    )
  return user ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ returnTo: location.pathname }} replace />
  )
}

/** Configures authenticated application screens and the public login form. */
export default function App() {
  console.debug('[App] Rendering application routes')
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoutes />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
              <Route path="/export" element={<ExportPage />} />
              <Route path="/accounts/create" element={<CreateAccountPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/accounts/:accountId" element={<AccountDetailPage />} />
              <Route
                path="/documents/:documentId"
                element={<DocumentDetailPage />}
              />
              <Route
                path="/approvals/:documentId"
                element={<DocumentDetailPage />}
              />
              <Route
                path="/invoices/:documentId"
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
                  path={'/' + kind}
                  element={<WorkspacePage key={kind} kind={kind} />}
                />
              ))}
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
