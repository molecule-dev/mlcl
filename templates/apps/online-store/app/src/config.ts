export { loadContent } from '@molecule/app-locales-legal-default'

export const API_BASE_URL = import.meta.env?.VITE_API_URL || '/api'

export const authConfig = {
  baseURL: API_BASE_URL,
  loginEndpoint: '/users/log-in',
  registerEndpoint: '/users',
  forgotPasswordEndpoint: '/users/forgot-password',
  changePasswordEndpoint: '/users/me/password',
  // The session-restore call: repoint it with the others when the app serves its own current
  // user, or its 401 signs the user out right after a successful login.
  currentUserEndpoint: '/users/me',
  // storage omitted → secure in-memory default; a localStorage bearer copy is XSS-exfiltratable and defeats the httpOnly session cookie [M1-1]
  autoRefresh: true,
}

export const oauthConfig = {
  baseURL: API_BASE_URL,
  oauthProviders: ['github', 'google'],
  oauthEndpoint: '/users/oauth',
}
