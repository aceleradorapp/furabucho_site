import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Anchor,
  Cake,
  HardDrive,
  Home,
  ImageIcon,
  Images,
  KeyRound,
  LogOut,
  Megaphone,
  MessageSquare,
  Moon,
  Rocket,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Trophy,
  UserPlus,
  Users,
  UserRound,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { AnnouncementBellButton, AnnouncementFullscreenViewer, type AnnouncementItem } from './AnnouncementsBell';
import { Avatar } from './Avatar';
import { useConfirm } from './ConfirmDialogProvider';
import { TodayBirthdaysBanner } from './TodayBirthdaysBanner';

const ANNOUNCEMENT_AUTO_SHOW_DELAY = 3000;
const ANNOUNCEMENT_POLL_INTERVAL = 20000;

export function PrivateLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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

  const canSite = user.permissions['settings.edit'] || user.permissions['announcements.manage'] || user.permissions['gallery.manage'];
  const canMembers = user.permissions['members.view'];
  const canGallery = user.permissions['gallery.manage'];
  const canPioneiros = user.permissions['gallery.manage'] || user.permissions['pioneiros.manage'];
  const canSystem = user.permissions['uploads.manage'] || user.role === 'admin';

  const hasSettingsMenu = canSite || canMembers || canGallery || canPioneiros || canSystem;

  const hasPontaFirmeAccess = user.isPontaFirme || user.role === 'admin' || user.permissions['pontaFirme.manage'];

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
            <img src="/ico-ff.jpeg" alt={siteName} className="w-8 h-8 rounded-lg object-cover shrink-0" />
            <span className="hidden sm:inline font-display uppercase tracking-wider text-sm text-text-main">
              {siteName}
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <div className="hidden md:flex items-center gap-1">
              <Link
                to="/feed"
                className={`p-2 rounded-full hover:bg-card-subtle transition ${isActive('/feed') ? 'text-primary' : 'text-text-main'}`}
                aria-label="Feed"
                title="Feed"
              >
                <Home size={22} />
              </Link>

              <Link
                to="/galeria"
                className={`p-2 rounded-full hover:bg-card-subtle transition ${isActive('/galeria') ? 'text-primary' : 'text-text-main'}`}
                aria-label="Galeria"
                title="Galeria"
              >
                <Images size={22} />
              </Link>

              <Link
                to="/aniversariantes"
                className={`p-2 rounded-full hover:bg-card-subtle transition ${isActive('/aniversariantes') ? 'text-primary' : 'text-text-main'}`}
                aria-label="Aniversariantes"
                title="Aniversariantes"
              >
                <Cake size={22} />
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

              <Link
                to="/app"
                className={`p-2 rounded-full hover:bg-card-subtle transition ${isActive('/app') ? 'text-primary' : 'text-text-main'}`}
                aria-label="Baixar o app"
                title="Baixar o app"
              >
                <Smartphone size={22} />
              </Link>

              {hasPontaFirmeAccess && (
                <Link
                  to="/ponta-firme"
                  className={`p-2 rounded-full transition shadow-sm ${
                    isActive('/ponta-firme')
                      ? 'bg-[#F59E0B] text-white'
                      : 'bg-[#F59E0B]/15 text-[#F59E0B] hover:bg-[#F59E0B]/25'
                  }`}
                  aria-label="Ponta Firme"
                  title="Área Ponta Firme"
                >
                  <Anchor size={22} />
                </Link>
              )}
            </div>

            {hasSettingsMenu && (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    className="p-2 rounded-full hover:bg-card-subtle transition text-text-main"
                    aria-label="Configurações"
                    title="Configurações"
                  >
                    <Settings size={22} />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={8}
                    className="bg-card rounded-xl shadow-2xl border border-border py-2 min-w-[240px] z-40"
                  >
                    {canSite && (
                      <DropdownMenu.Group>
                        <DropdownMenu.Label className="px-4 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                          Site
                        </DropdownMenu.Label>
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
                              to="/admin/carrossel-inicial"
                              className="flex items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-card-subtle outline-none"
                            >
                              <Sparkles size={16} /> Carrossel da página inicial
                            </Link>
                          </DropdownMenu.Item>
                        )}
                      </DropdownMenu.Group>
                    )}

                    {canMembers && (
                      <DropdownMenu.Group>
                        {canSite && <DropdownMenu.Separator className="my-1.5 h-px bg-border" />}
                        <DropdownMenu.Label className="px-4 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                          Membros
                        </DropdownMenu.Label>
                        <DropdownMenu.Item asChild>
                          <Link
                            to="/admin/usuarios"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-card-subtle outline-none"
                          >
                            <Users size={16} /> Usuários
                          </Link>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item asChild>
                          <Link
                            to="/admin/fotos-perfil"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-card-subtle outline-none"
                          >
                            <ImageIcon size={16} /> Fotos de Perfil
                          </Link>
                        </DropdownMenu.Item>
                      </DropdownMenu.Group>
                    )}

                    {canGallery && (
                      <DropdownMenu.Group>
                        {(canSite || canMembers) && <DropdownMenu.Separator className="my-1.5 h-px bg-border" />}
                        <DropdownMenu.Label className="px-4 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                          Galeria
                        </DropdownMenu.Label>
                        <DropdownMenu.Item asChild>
                          <Link
                            to="/admin/galeria"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-card-subtle outline-none"
                          >
                            <Images size={16} /> Gerenciar galeria
                          </Link>
                        </DropdownMenu.Item>
                      </DropdownMenu.Group>
                    )}

                    {canPioneiros && (
                      <DropdownMenu.Group>
                        {(canSite || canMembers || canGallery) && <DropdownMenu.Separator className="my-1.5 h-px bg-border" />}
                        <DropdownMenu.Label className="px-4 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                          Programa Pioneiros
                        </DropdownMenu.Label>
                        {user.permissions['gallery.manage'] && (
                          <DropdownMenu.Item asChild>
                            <Link
                              to="/pioneiros/painel"
                              className="flex items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-card-subtle outline-none"
                            >
                              <Trophy size={16} /> Painel dos Pioneiros
                            </Link>
                          </DropdownMenu.Item>
                        )}
                        {user.permissions['gallery.manage'] && (
                          <DropdownMenu.Item asChild>
                            <Link
                              to="/admin/pioneiros-fotos"
                              className="flex items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-card-subtle outline-none"
                            >
                              <Rocket size={16} /> Fotos dos Pioneiros
                            </Link>
                          </DropdownMenu.Item>
                        )}
                        {user.permissions['gallery.manage'] && (
                          <DropdownMenu.Item asChild>
                            <Link
                              to="/admin/pioneiros-comentarios"
                              className="flex items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-card-subtle outline-none"
                            >
                              <MessageSquare size={16} /> Comentários dos Pioneiros
                            </Link>
                          </DropdownMenu.Item>
                        )}
                        {user.permissions['pioneiros.manage'] && (
                          <DropdownMenu.Item asChild>
                            <Link
                              to="/admin/pioneiros-conversao"
                              className="flex items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-card-subtle outline-none"
                            >
                              <UserPlus size={16} /> Pioneiros → Membros
                            </Link>
                          </DropdownMenu.Item>
                        )}
                      </DropdownMenu.Group>
                    )}

                    {canSystem && (
                      <DropdownMenu.Group>
                        {(canSite || canMembers || canGallery || canPioneiros) && (
                          <DropdownMenu.Separator className="my-1.5 h-px bg-border" />
                        )}
                        <DropdownMenu.Label className="px-4 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                          Sistema
                        </DropdownMenu.Label>
                        {user.permissions['uploads.manage'] && (
                          <DropdownMenu.Item asChild>
                            <Link
                              to="/admin/arquivos"
                              className="flex items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-card-subtle outline-none"
                            >
                              <HardDrive size={16} /> Arquivos do Servidor
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
                      </DropdownMenu.Group>
                    )}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            )}

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="p-1.5 rounded-full hover:bg-card-subtle transition ml-1" aria-label="Perfil" title="Perfil">
                  <Avatar name={user.name} avatarUrl={user.avatarUrl} size={30} role={user.role} isPontaFirme={user.isPontaFirme} isVeterano={user.isVeterano} />
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
                    onSelect={(e) => {
                      e.preventDefault();
                      toggleTheme();
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-card-subtle outline-none cursor-pointer"
                  >
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
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

      <TodayBirthdaysBanner />

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
        <Link
          to="/aniversariantes"
          className={`p-2 ${isActive('/aniversariantes') ? 'text-primary' : 'text-text-muted'}`}
          aria-label="Aniversariantes"
        >
          <Cake size={24} />
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
        <Link to="/app" className={`p-2 ${isActive('/app') ? 'text-primary' : 'text-text-muted'}`} aria-label="Baixar o app">
          <Smartphone size={24} />
        </Link>
        {hasPontaFirmeAccess && (
          <Link
            to="/ponta-firme"
            className={`p-2 rounded-full ${isActive('/ponta-firme') ? 'bg-[#F59E0B] text-white' : 'text-[#F59E0B]'}`}
            aria-label="Ponta Firme"
          >
            <Anchor size={24} />
          </Link>
        )}
      </nav>

      {activeAnnouncement && (
        <AnnouncementFullscreenViewer announcement={activeAnnouncement} onClose={handleCloseAnnouncement} />
      )}
    </div>
  );
}
