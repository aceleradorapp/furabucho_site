import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminAnnouncementsPage } from './pages/admin/AdminAnnouncementsPage'
import { AdminGalleryDetailPage } from './pages/admin/AdminGalleryDetailPage'
import { AdminGalleryHighlightsPage } from './pages/admin/AdminGalleryHighlightsPage'
import { AdminGalleryPage } from './pages/admin/AdminGalleryPage'
import { AdminPioneiroCommentsPage } from './pages/admin/AdminPioneiroCommentsPage'
import { AdminPioneiroConversionPage } from './pages/admin/AdminPioneiroConversionPage'
import { AdminPioneiroPhotosPage } from './pages/admin/AdminPioneiroPhotosPage'
import { AdminRolesPage } from './pages/admin/AdminRolesPage'
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage'
import { AdminUserPermissionsPage } from './pages/admin/AdminUserPermissionsPage'
import { AdminUploadsPage } from './pages/admin/AdminUploadsPage'
import { AdminUserPhotosPage } from './pages/admin/AdminUserPhotosPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { BilhetinhosPage } from './pages/BilhetinhosPage'
import { BirthdaysPage } from './pages/BirthdaysPage'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { DownloadAppPage } from './pages/DownloadAppPage'
import { FeedPage } from './pages/FeedPage'
import { GalleryDetailPage } from './pages/GalleryDetailPage'
import { GalleryListPage } from './pages/GalleryListPage'
import { LandingPage } from './pages/LandingPage'
import { PioneirosPage } from './pages/PioneirosPage'
import { PioneirosPainelPage } from './pages/PioneirosPainelPage'
import { PontaFirmePage } from './pages/PontaFirmePage'
import { ProfilePage } from './pages/ProfilePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/pioneiros" element={<PioneirosPage />} />
      <Route path="/pioneiros/painel" element={<PioneirosPainelPage />} />
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
        path="/bilhetinhos"
        element={
          <ProtectedRoute>
            <BilhetinhosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/aniversariantes"
        element={
          <ProtectedRoute>
            <BirthdaysPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DownloadAppPage />
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
        path="/admin/fotos-perfil"
        element={
          <ProtectedRoute requirePermission="members.view">
            <AdminUserPhotosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/arquivos"
        element={
          <ProtectedRoute requirePermission="uploads.manage">
            <AdminUploadsPage />
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
      <Route
        path="/admin/pioneiros-fotos"
        element={
          <ProtectedRoute requirePermission="gallery.manage">
            <AdminPioneiroPhotosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pioneiros-comentarios"
        element={
          <ProtectedRoute requirePermission="gallery.manage">
            <AdminPioneiroCommentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pioneiros-conversao"
        element={
          <ProtectedRoute requirePermission="pioneiros.manage">
            <AdminPioneiroConversionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/carrossel-inicial"
        element={
          <ProtectedRoute requirePermission="gallery.manage">
            <AdminGalleryHighlightsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ponta-firme"
        element={
          <ProtectedRoute requirePermission="pontaFirme.manage" allowIfPontaFirme>
            <PontaFirmePage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
