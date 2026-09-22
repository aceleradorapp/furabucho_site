import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from '../api/client';

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  birthDate: string | null;
  mustChangePassword: boolean;
  role: string;
  roleLabel: string;
  isPontaFirme: boolean;
  isVeterano: boolean;
  permissions: Record<string, boolean>;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    const token = localStorage.getItem('fb_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.get<{ user: AuthUser }>('/auth/me');
      setUser(data.user);
    } catch (err) {
      // Só desloga de verdade quando o servidor diz que o token é inválido/expirado (401).
      // Qualquer outro erro (rede instável, servidor reiniciando num deploy, etc.) não deve
      // apagar a sessão guardada — o usuário tentaria de novo e continuaria logado.
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem('fb_token');
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshUser();
  }, []);

  async function login(identifier: string, password: string) {
    const data = await api.post<{ token: string; user: AuthUser }>('/auth/login', { identifier, password });
    localStorage.setItem('fb_token', data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('fb_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
