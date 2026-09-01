import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Home, LogOut, Settings, ShieldCheck, Users, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from './Avatar';

export function PrivateLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const hasSettingsMenu = user.permissions.canManageSettings || user.permissions.canManageUsers || user.role === 'admin';

  function isActive(path: string) {
    return location.pathname === path;
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="min-h-svh bg-card-subtle">
      <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/feed" className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary" />
            <span className="font-display uppercase tracking-wider text-sm text-text-main">Fura-Bucho</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              to="/feed"
              className={`p-2 rounded-full hover:bg-card-subtle transition ${isActive('/feed') ? 'text-primary' : 'text-text-main'}`}
              aria-label="Feed"
            >
              <Home size={22} />
            </Link>

            {hasSettingsMenu && (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="p-2 rounded-full hover:bg-card-subtle transition text-text-main" aria-label="Configurações">
                    <Settings size={22} />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={8}
                    className="bg-card rounded-xl shadow-2xl border border-border py-2 min-w-[220px] z-40"
                  >
                    {user.permissions.canManageSettings && (
                      <DropdownMenu.Item asChild>
                        <Link
                          to="/admin/configuracoes"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-card-subtle outline-none"
                        >
                          <Settings size={16} /> Configurações do site
                        </Link>
                      </DropdownMenu.Item>
                    )}
                    {user.permissions.canManageUsers && (
                      <DropdownMenu.Item asChild>
                        <Link
                          to="/admin/usuarios"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-card-subtle outline-none"
                        >
                          <Users size={16} /> Usuários
                        </Link>
                      </DropdownMenu.Item>
                    )}
                    {user.role === 'admin' && (
                      <DropdownMenu.Item asChild>
                        <Link
                          to="/admin/papeis"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-card-subtle outline-none"
                        >
                          <ShieldCheck size={16} /> Papéis
                        </Link>
                      </DropdownMenu.Item>
                    )}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            )}

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="p-1.5 rounded-full hover:bg-card-subtle transition ml-1" aria-label="Perfil">
                  <Avatar name={user.name} avatarUrl={user.avatarUrl} size={30} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="bg-card rounded-xl shadow-2xl border border-border py-2 min-w-[200px] z-40"
                >
                  <div className="px-4 py-2 border-b border-border mb-1">
                    <p className="text-sm font-medium text-text-main">{user.name}</p>
                    <p className="text-xs text-text-muted">{user.roleLabel}</p>
                  </div>
                  <DropdownMenu.Item asChild>
                    <Link
                      to="/perfil"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-card-subtle outline-none"
                    >
                      <UserRound size={16} /> Meu perfil
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-card-subtle outline-none"
                  >
                    <LogOut size={16} /> Sair
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </nav>
        </div>
      </header>

      <main className="pb-20 md:pb-8">{children}</main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur-md border-t border-border flex items-center justify-around h-16">
        <Link to="/feed" className={`p-2 ${isActive('/feed') ? 'text-primary' : 'text-text-muted'}`} aria-label="Feed">
          <Home size={24} />
        </Link>
        <Link to="/perfil" className={isActive('/perfil') ? 'text-primary' : 'text-text-muted'} aria-label="Perfil">
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size={28} />
        </Link>
      </nav>
    </div>
  );
}
