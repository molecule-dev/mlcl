export { loadContent } from '@molecule/app-locales-legal-default'

export const API_BASE_URL = import.meta.env?.VITE_API_URL || ''

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
