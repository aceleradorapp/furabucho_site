import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { PermissionKey } from '../lib/permissionKeys';

export function ProtectedRoute({
  children,
  requirePermission,
  requireAdmin,
}: {
  children: ReactNode;
  requirePermission?: PermissionKey | PermissionKey[];
  requireAdmin?: boolean;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-svh flex items-center justify-center text-text-muted">Carregando...</div>;
  }

  if (!user) return <Navigate to="/?login=1" replace />;

  if (user.mustChangePassword) return <Navigate to="/trocar-senha" replace />;

  if (requireAdmin && user.role !== 'admin') {
    return (
      <div className="min-h-svh flex items-center justify-center text-text-muted">
        Você não tem permissão para acessar esta página.
      </div>
    );
  }

  if (requirePermission) {
    const required = Array.isArray(requirePermission) ? requirePermission : [requirePermission];
    const allowed = required.some((permission) => user.permissions[permission]);
    if (!allowed) {
      return (
        <div className="min-h-svh flex items-center justify-center text-text-muted">
          Você não tem permissão para acessar esta página.
        </div>
      );
    }
  }

  return <>{children}</>;
}
