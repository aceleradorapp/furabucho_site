import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, getToken, setToken } from '../api/client';

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  birthDate: string | null;
  mustChangePassword: boolean;
  role: string;
  roleLabel: string;
  permissions: Record<string, boolean>;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { user: me } = await api.get<{ user: AuthUser }>('/auth/me');
        setUser(me);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(identifier: string, password: string) {
    const { token, user: loggedUser } = await api.post<{ token: string; user: AuthUser }>('/auth/login', {
      identifier,
      password,
    });
    await setToken(token);
    setUser(loggedUser);
  }

  async function logout() {
    await setToken(null);
    setUser(null);
  }

  async function refreshUser() {
    const { user: me } = await api.get<{ user: AuthUser }>('/auth/me');
    setUser(me);
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
