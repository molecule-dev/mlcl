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
  // storage omitted → secure in-memory default; a localStorage bearer copy is XSS-exfiltratable and defeats the httpOnly session cookie [M1-1]
  autoRefresh: true,
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
