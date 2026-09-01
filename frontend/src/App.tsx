import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRolesPage } from './pages/admin/AdminRolesPage'
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { FeedPage } from './pages/FeedPage'
import { LandingPage } from './pages/LandingPage'
import { ProfilePage } from './pages/ProfilePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/trocar-senha" element={<ChangePasswordPage />} />
      <Route
        path="/feed"
        element={
          <ProtectedRoute>
            <FeedPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/configuracoes"
        element={
          <ProtectedRoute requirePermission="canManageSettings">
            <AdminSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/usuarios"
        element={
          <ProtectedRoute requirePermission="canManageUsers">
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/papeis"
        element={
          <ProtectedRoute requireAdmin>
            <AdminRolesPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
