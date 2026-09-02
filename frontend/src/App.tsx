import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminAnnouncementsPage } from './pages/admin/AdminAnnouncementsPage'
import { AdminGalleryDetailPage } from './pages/admin/AdminGalleryDetailPage'
import { AdminGalleryPage } from './pages/admin/AdminGalleryPage'
import { AdminRolesPage } from './pages/admin/AdminRolesPage'
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage'
import { AdminUserPermissionsPage } from './pages/admin/AdminUserPermissionsPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { FeedPage } from './pages/FeedPage'
import { GalleryDetailPage } from './pages/GalleryDetailPage'
import { GalleryListPage } from './pages/GalleryListPage'
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
        path="/galeria"
        element={
          <ProtectedRoute>
            <GalleryListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/galeria/:id"
        element={
          <ProtectedRoute>
            <GalleryDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/configuracoes"
        element={
          <ProtectedRoute requirePermission="settings.edit">
            <AdminSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/usuarios"
        element={
          <ProtectedRoute requirePermission="members.view">
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
      <Route
        path="/admin/permissoes"
        element={
          <ProtectedRoute requireAdmin>
            <AdminUserPermissionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/novidades"
        element={
          <ProtectedRoute requirePermission="announcements.manage">
            <AdminAnnouncementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/galeria"
        element={
          <ProtectedRoute requirePermission="gallery.manage">
            <AdminGalleryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/galeria/:id"
        element={
          <ProtectedRoute requirePermission="gallery.manage">
            <AdminGalleryDetailPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
