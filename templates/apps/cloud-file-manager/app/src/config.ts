export { loadContent } from '@molecule/app-locales-legal-default'

// `VITE_API_URL` may be empty (rely on the same-origin Vite proxy in dev),
// `/api` (legacy fallback), or an absolute origin like `http://localhost:4020`.
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
  // [M1-1] Session restore on reload: in-memory token is lost on a full page
  // load, so initialize() probes currentUserEndpoint with the httpOnly cookie
  // to re-establish the session. This app uses an EMPTY baseURL and prefixes
  // every endpoint with `/api` (so they survive whether baseURL is empty or an
  // absolute origin). currentUserEndpoint must follow the same convention —
  // its default ('/users/me', no `/api`) is NOT proxied by Vite, so it would
  // hit the SPA fallback (HTML 200), fail to parse, and silently log the user
  // out on every authed reload → AuthGuard bounces to /login. Pin it to the
  // real, `/api`-prefixed route.
  currentUserEndpoint: '/api/users/me',
  // storage: 'memory' EXPLICITLY — the client's browser default is Web Storage, and a
  // localStorage bearer copy is XSS-exfiltratable and defeats the httpOnly session cookie
  // [M1-1]. An external contract that reads the token at its own key (an e2e suite's
  // `localStorage.jwtToken`) is `storage: createBrowserStorageAdapter()` plus
  // `tokenKey: 'jwtToken'`; never a second store.
  storage: 'memory' as const,
  // This API issues no refresh token — the durable session is an httpOnly cookie
  // the server refreshes — so there is nothing for the client to refresh. Set this
  // true only for an API with a refresh endpoint that returns refresh tokens.
  autoRefresh: false,
}

export const oauthConfig = {
  baseURL: API_BASE_URL,
  oauthProviders: [],
  oauthEndpoint: '/api/users/oauth',
}
