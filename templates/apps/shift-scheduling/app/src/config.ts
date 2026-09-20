export { loadContent } from '@molecule/app-locales-legal-default'

export const API_BASE_URL = import.meta.env?.VITE_API_URL || '/api'

export const authConfig = {
  baseURL: API_BASE_URL,
  loginEndpoint: '/users/log-in',
  registerEndpoint: '/users',
  forgotPasswordEndpoint: '/users/forgot-password',
  // Token-based password-reset finalization (called from /reset-password
  // with the token from the email). NOT the same as
  // changePasswordEndpoint, which the SettingsPanel uses for an
  // already-authenticated user changing their own password.
  resetPasswordEndpoint: '/users/reset-password',
  changePasswordEndpoint: '/users/me/password',
  // storage omitted → secure in-memory default; a localStorage bearer copy is XSS-exfiltratable and defeats the httpOnly session cookie [M1-1]
  autoRefresh: true,
}

export const oauthConfig = {
  baseURL: API_BASE_URL,
  oauthProviders: [],
  oauthEndpoint: '/users/oauth',
}
