export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? (import.meta.env.DEV ? 'http://localhost:4321' : '');
export const API_URL = `${API_BASE_URL}/api`;
export const UPLOADS_BASE = API_BASE_URL;
