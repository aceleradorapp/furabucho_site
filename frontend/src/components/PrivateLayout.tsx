import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Home, Images, KeyRound, LogOut, Megaphone, Settings, ShieldCheck, Sparkles, Users, UserRound } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AnnouncementBellButton, AnnouncementFullscreenViewer, type AnnouncementItem } from './AnnouncementsBell';
import { Avatar } from './Avatar';
import { useConfirm } from './ConfirmDialogProvider';

const ANNOUNCEMENT_AUTO_SHOW_DELAY = 3000;
const ANNOUNCEMENT_POLL_INTERVAL = 20000;

export function PrivateLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const [siteName, setSiteName] = useState('Fura-Bucho');
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [activeAnnouncement, setActiveAnnouncement] = useState<AnnouncementItem | null>(null);
  const [bellOpenDesktop, setBellOpenDesktop] = useState(false);
  const [bellOpenMobile, setBellOpenMobile] = useState(false);
  const shownAnnouncementIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    function loadSiteName() {
      api.get<{ siteName: string }>('/settings').then((s) => setSiteName(s.siteName));
    }
    loadSiteName();
    window.addEventListener('site-settings-updated', loadSiteName);
    return () => window.removeEventListener('site-settings-updated', loadSiteName);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAnnouncements() {
      const data = await api.get<AnnouncementItem[]>('/announcements/active');
      if (cancelled) return data;
      setAnnouncements(data);
      return data;
    }

    async function checkAutoShow() {
      const data = await loadAnnouncements();
      if (cancelled) return;
      const unseen = data.find((a) => !a.viewed && !shownAnnouncementIdsRef.current.has(a.id));
      if (unseen) {
        shownAnnouncementIdsRef.current.add(unseen.id);
        setActiveAnnouncement(unseen);
      }
    }

    if (location.pathname === '/feed') {
      const initialTimer = setTimeout(checkAutoShow, ANNOUNCEMENT_AUTO_SHOW_DELAY);
      const pollInterval = setInterval(checkAutoShow, ANNOUNCEMENT_POLL_INTERVAL);
      return () => {
        cancelled = true;
        clearTimeout(initialTimer);
        clearInterval(pollInterval);
      };
    }

    loadAnnouncements();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  async function markAnnouncementViewed(id: number) {
    await api.post(`/announcements/${id}/view`);
    setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, viewed: true } : a)));
  }

  function handleCloseAnnouncement() {
    if (activeAnnouncement) markAnnouncementViewed(activeAnnouncement.id);
    setActiveAnnouncement(null);
  }

  async function handleDeleteAnnouncement(id: number) {
    if (!(await confirm({ title: 'Excluir esta novidade?', variant: 'danger' }))) return;
    await api.delete(`/announcements/${id}`);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  if (!user) return null;

  const missingProfileParts = [
    !user.avatarUrl && 'uma foto de perfil',
    !user.birthDate && 'sua data de nascimento',
  ].filter(Boolean) as string[];
  const isProfileComplete = missingProfileParts.length === 0;

  const hasSettingsMenu =
    user.permissions['settings.edit'] ||
    user.permissions['members.view'] ||
    user.permissions['gallery.manage'] ||
    user.role === 'admin';

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
            <span className="font-display uppercase tracking-wider text-sm text-text-main">{siteName}</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              to="/feed"
              className={`p-2 rounded-full hover:bg-card-subtle transition ${isActive('/feed') ? 'text-primary' : 'text-text-main'}`}
              aria-label="Feed"
            >
              <Home size={22} />
            </Link>

            <Link
              to="/galeria"
              className={`p-2 rounded-full hover:bg-card-subtle transition ${isActive('/galeria') ? 'text-primary' : 'text-text-main'}`}
              aria-label="Galeria"
            >
              <Images size={22} />
            </Link>

            <AnnouncementBellButton
              announcements={announcements}
              open={bellOpenDesktop}
              onOpenChange={setBellOpenDesktop}
              onSelect={setActiveAnnouncement}
              onDelete={handleDeleteAnnouncement}
              canManage={user.permissions['announcements.manage']}
              className="p-2 rounded-full hover:bg-card-subtle transition text-text-main"
            />

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
                    {user.permissions['settings.edit'] && (
                      <DropdownMenu.Item asChild>
                        <Link
                          to="/admin/configuracoes"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-card-subtle outline-none"
                        >
                          <Settings size={16} /> Configurações do site
                        </Link>
                      </DropdownMenu.Item>
                    )}
                    {user.permissions['members.view'] && (
                      <DropdownMenu.Item asChild>
                        <Link
                          to="/admin/usuarios"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-card-subtle outline-none"
                        >
                          <Users size={16} /> Usuários
                        </Link>
                      </DropdownMenu.Item>
                    )}
                    {user.permissions['announcements.manage'] && (
                      <DropdownMenu.Item asChild>
                        <Link
                          to="/admin/novidades"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-card-subtle outline-none"
                        >
                          <Megaphone size={16} /> Novidades
                        </Link>
                      </DropdownMenu.Item>
                    )}
                    {user.permissions['gallery.manage'] && (
                      <DropdownMenu.Item asChild>
                        <Link
                          to="/admin/galeria"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-card-subtle outline-none"
                        >
                          <Images size={16} /> Gerenciar galeria
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
                    {user.role === 'admin' && (
                      <DropdownMenu.Item asChild>
                        <Link
                          to="/admin/permissoes"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-card-subtle outline-none"
                        >
                          <KeyRound size={16} /> Permissões por usuário
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
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-card-subtle outline-none cursor-pointer"
                  >
                    <LogOut size={16} /> Sair
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </nav>
        </div>
      </header>

      {!isProfileComplete && location.pathname !== '/perfil' && (
        <div className="bg-primary/10 border-b border-primary/20">
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-start sm:items-center gap-2 text-sm text-text-main min-w-0">
              <Sparkles size={16} className="text-primary shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong className="font-medium">Complete seu perfil</strong> — falta {missingProfileParts.join(' e ')}.
              </span>
            </div>
            <Link
              to="/perfil"
              className="self-start sm:self-auto shrink-0 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-full px-3 py-1.5 transition"
            >
              Completar agora
            </Link>
          </div>
        </div>
      )}

      <main className="pb-20 md:pb-8">{children}</main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur-md border-t border-border flex items-center justify-around h-16">
        <Link to="/feed" className={`p-2 ${isActive('/feed') ? 'text-primary' : 'text-text-muted'}`} aria-label="Feed">
          <Home size={24} />
        </Link>
        <Link
          to="/galeria"
          className={`p-2 ${isActive('/galeria') ? 'text-primary' : 'text-text-muted'}`}
          aria-label="Galeria"
        >
          <Images size={24} />
        </Link>
        <AnnouncementBellButton
          announcements={announcements}
          open={bellOpenMobile}
          onOpenChange={setBellOpenMobile}
          onSelect={setActiveAnnouncement}
          onDelete={handleDeleteAnnouncement}
          canManage={user.permissions['announcements.manage']}
          className="p-2 text-text-muted"
          iconSize={24}
        />
        <Link to="/perfil" className={isActive('/perfil') ? 'text-primary' : 'text-text-muted'} aria-label="Perfil">
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size={28} />
        </Link>
      </nav>

      {activeAnnouncement && (
        <AnnouncementFullscreenViewer announcement={activeAnnouncement} onClose={handleCloseAnnouncement} />
      )}
    </div>
  );
}
