export { loadContent } from '@molecule/app-locales-legal-default'

export const API_BASE_URL = import.meta.env?.VITE_API_URL || '/api'

export const authConfig = {
  baseURL: API_BASE_URL,
  loginEndpoint: '/users/log-in',
  registerEndpoint: '/users',
  forgotPasswordEndpoint: '/users/forgot-password',
  resetPasswordEndpoint: '/users/reset-password',
  changePasswordEndpoint: '/users/me/password',
  // The session-restore call: repoint it with the others when the app serves its own current
  // user, or its 401 signs the user out right after a successful login.
  currentUserEndpoint: '/users/me',
  // [M1-1] The auth client's own logout() only POSTs to logoutEndpoint while
  // it still holds the in-memory bearer token — which is gone after any full
  // page load. So instead of relying on it (and to avoid a redundant/duplicate
  // call), we leave this empty and clear the httpOnly `token` cookie explicitly
  // from the sign-out handler via the credentialed HTTP client
  // (POST /api/users/logout — the route IS mounted by mountDefaultUserAuthRoutes).
  logoutEndpoint: '',
  // storage omitted → secure in-memory default; a localStorage bearer copy is XSS-exfiltratable and defeats the httpOnly session cookie [M1-1]
  autoRefresh: true,
}

export const oauthConfig = {
  baseURL: API_BASE_URL,
  oauthProviders: [],
  oauthEndpoint: '/users/oauth',
}
