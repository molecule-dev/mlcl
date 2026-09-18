export { loadContent } from '@molecule/app-locales-legal-default'

// `VITE_API_URL` may be empty (rely on the same-origin Vite proxy in dev),
// `/api` (legacy fallback), or an absolute origin like `http://localhost:4100`.
// Page-level `http.get('/api/...')` calls already include the `/api` prefix,
// so the base URL must NOT also end with `/api` — otherwise we get
// `/api/api/...` 404s.
const RAW_BASE = import.meta.env?.VITE_API_URL ?? ''
export const API_BASE_URL = RAW_BASE.replace(/\/api$/, '')

// Auth endpoint paths intentionally include the `/api` prefix so they
// resolve correctly whether `API_BASE_URL` is empty (proxy-relative) or an
// absolute origin (no `/api` suffix). Keep this consistent with the page
// `http.<verb>('/api/...')` convention used everywhere else.
export const authConfig = {
  baseURL: API_BASE_URL,
  loginEndpoint: '/api/users/log-in',
  registerEndpoint: '/api/users',
  forgotPasswordEndpoint: '/api/users/forgot-password',
  resetPasswordEndpoint: '/api/users/reset-password',
  changePasswordEndpoint: '/api/users/me/password',
  // [M1-1] These two otherwise default to `/users/me` and `/users/logout` (no
  // `/api`); with an empty baseURL that bypasses the Vite `/api` proxy → cookie
  // session-restore + logout silently fail (every authed page redirects to /login).
  currentUserEndpoint: '/api/users/me',
  logoutEndpoint: '/api/users/logout',
  // storage omitted → secure in-memory default; a localStorage bearer copy is XSS-exfiltratable and defeats the httpOnly session cookie [M1-1]
  autoRefresh: true,
}

export const oauthConfig = {
  baseURL: API_BASE_URL,
  oauthProviders: [],
  oauthEndpoint: '/api/users/oauth',
}
