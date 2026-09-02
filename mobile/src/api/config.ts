export const API_BASE_URL = 'http://192.95.13.27:9000';
export const API_URL = `${API_BASE_URL}/api`;
export const UPLOADS_BASE = API_BASE_URL;

export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:)/.test(url)) return url;
  return `${UPLOADS_BASE}${url}`;
}
