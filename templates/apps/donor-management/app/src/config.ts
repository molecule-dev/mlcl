import { getProvider as getI18nProvider, registerContent } from '@molecule/app-i18n'

import { legalContent } from './locales/en/content.js'

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
  oauthEndpoint: '/users/oauth',
}

/**
 * App-specific legal content loader — donor-management ships its own
 * nonprofit covenant (terms + privacy, see `locales/en/content.ts`) and
 * registers it under the SAME `content.*` keys the bonded loader uses, so
 * the standalone /terms + /privacy pages and the footer legal modals stay
 * in sync (one source, two surfaces). Non-English locales fall back to the
 * shared `@molecule/app-locales-legal-default` copy, re-fetched on every
 * locale change via `registerContent` exactly like the bonded loader.
 */
export async function loadContent(module: 'privacyPolicy' | 'termsOfService'): Promise<void> {
  const provider = getI18nProvider()
  const locale = provider.getLocale()
  const loader = async (loc: string): Promise<void> => {
    if (loc === 'en' || loc.startsWith('en-')) {
      provider.addTranslations('en', legalContent)
      return
    }
    const legalDefault = (await import('@molecule/app-locales-legal-default')) as unknown as Record<
      string,
      Record<string, string>
    >
    provider.addTranslations(loc, legalDefault[loc.replace('-', '')] ?? legalDefault.en)
  }
  registerContent(module, loader)
  await loader(locale)
}
