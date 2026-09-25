import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError } from '../api/client';

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  birthDate: string | null;
  mustChangePassword: boolean;
  welcomeSeen: boolean;
  role: string;
  roleLabel: string;
  dailyPostLimit: number;
  isPontaFirme: boolean;
  isVeterano: boolean;
  permissions: Record<string, boolean>;
}

interface MembroRoleSnapshot {
  permissions: Record<string, boolean>;
  dailyPostLimit: number;
}

const VIEW_AS_MEMBER_KEY = 'fb_view_as_member';

interface AuthContextValue {
  user: AuthUser | null;
  realUser: AuthUser | null;
  loading: boolean;
  viewAsMember: boolean;
  viewModeLoading: boolean;
  toggleViewAsMember: () => void;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [realUser, setRealUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewAsMember, setViewAsMember] = useState(() => sessionStorage.getItem(VIEW_AS_MEMBER_KEY) === '1');
  const [membroSnapshot, setMembroSnapshot] = useState<MembroRoleSnapshot | null>(null);
  const [viewModeLoading, setViewModeLoading] = useState(false);

  async function refreshUser() {
    const token = localStorage.getItem('fb_token');
    if (!token) {
      setRealUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.get<{ user: AuthUser }>('/auth/me');
      setRealUser(data.user);
    } catch (err) {
      // Só desloga de verdade quando o servidor diz que o token é inválido/expirado (401).
      // Qualquer outro erro (rede instável, servidor reiniciando num deploy, etc.) não deve
      // apagar a sessão guardada — o usuário tentaria de novo e continuaria logado.
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem('fb_token');
      }
      setRealUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshUser();
  }, []);

  // Se a sessao guardada nao for de admin (ou nao tiver sessao), o modo membro nao faz sentido
  // ficar ligado -- limpa pra nao deixar rastro de uma sessao anterior nessa mesma aba.
  useEffect(() => {
    if (!loading && realUser?.role !== 'admin' && viewAsMember) {
      setViewAsMember(false);
      sessionStorage.removeItem(VIEW_AS_MEMBER_KEY);
    }
  }, [loading, realUser, viewAsMember]);

  // O snapshot das permissoes do papel Membro fica so em memoria (nao em sessionStorage), entao
  // um recarregamento de pagina inteira (ou abrir uma URL direto) perde ele -- essa rehidratacao
  // busca de novo sempre que precisar, sem depender de ter clicado no botao de novo.
  useEffect(() => {
    if (loading || realUser?.role !== 'admin' || !viewAsMember || membroSnapshot || viewModeLoading) return;
    let cancelled = false;
    setViewModeLoading(true);
    api
      .get<{ key: string; permissions: Record<string, boolean>; dailyPostLimit: number }[]>('/admin/roles')
      .then((roles) => {
        if (cancelled) return;
        const membro = roles.find((r) => r.key === 'membro');
        if (membro) setMembroSnapshot({ permissions: membro.permissions, dailyPostLimit: membro.dailyPostLimit });
      })
      .finally(() => {
        if (!cancelled) setViewModeLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, realUser, viewAsMember, membroSnapshot]);

  async function login(identifier: string, password: string) {
    const data = await api.post<{ token: string; user: AuthUser }>('/auth/login', { identifier, password });
    localStorage.setItem('fb_token', data.token);
    setRealUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('fb_token');
    sessionStorage.removeItem(VIEW_AS_MEMBER_KEY);
    setRealUser(null);
    setViewAsMember(false);
  }

  function toggleViewAsMember() {
    if (!realUser || realUser.role !== 'admin') return;

    if (viewAsMember) {
      setViewAsMember(false);
      sessionStorage.removeItem(VIEW_AS_MEMBER_KEY);
      return;
    }

    setViewAsMember(true);
    sessionStorage.setItem(VIEW_AS_MEMBER_KEY, '1');
  }

  // Enquanto o modo membro esta ligado mas o snapshot de permissoes ainda nao chegou (ex.: acabou
  // de recarregar a pagina), NAO cai pro usuario real -- ficaria mostrando admin completo por um
  // instante. Melhor tratar como "ainda carregando" do que arriscar expor algo que nao devia.
  const viewModeHydrating = viewAsMember && realUser?.role === 'admin' && !membroSnapshot;

  const user = useMemo<AuthUser | null>(() => {
    if (!viewAsMember || realUser?.role !== 'admin') return realUser;
    if (!membroSnapshot) return null;
    return {
      ...realUser,
      role: 'membro',
      roleLabel: 'Membro',
      isPontaFirme: false,
      isVeterano: false,
      dailyPostLimit: membroSnapshot.dailyPostLimit,
      permissions: membroSnapshot.permissions,
    };
  }, [viewAsMember, realUser, membroSnapshot]);

  return (
    <AuthContext.Provider
      value={{
        user,
        realUser,
        loading: loading || viewModeHydrating,
        viewAsMember,
        viewModeLoading,
        toggleViewAsMember,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
