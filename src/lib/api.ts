/**
 * Central API URL helper.
 *
 * Web deployments can keep using same-origin /api routes. Native builds should
 * set VITE_API_BASE_URL to the HTTPS origin of the deployed Express backend.
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '')
  .trim()
  .replace(/\/+$/, '');

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}
