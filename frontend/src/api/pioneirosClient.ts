import { API_URL } from '../lib/config';
import { ApiError } from './client';

const TOKEN_KEY = 'fb_pioneiro_token';

export function getPioneiroToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setPioneiroToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getPioneiroToken();
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Erro inesperado' }));
    throw new ApiError(body.error ?? 'Erro inesperado', res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const pioneirosApi = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
