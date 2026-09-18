import { getProvider as getI18nProvider, registerContent } from '@molecule/app-i18n'

export const API_BASE_URL = import.meta.env?.VITE_API_URL || '/api'

export const authConfig = {
  baseURL: API_BASE_URL,
  loginEndpoint: '/users/log-in',
  registerEndpoint: '/users',
  forgotPasswordEndpoint: '/users/forgot-password',
  resetPasswordEndpoint: '/users/reset-password',
  changePasswordEndpoint: '/users/password',
  // storage omitted → secure in-memory default; a localStorage bearer copy is XSS-exfiltratable and defeats the httpOnly session cookie [M1-1]
  autoRefresh: true,
}

export const oauthConfig = {
  baseURL: API_BASE_URL,
  oauthProviders: [],
  oauthEndpoint: '/users/oauth',
}

/**
 * Lazily load a locale content module and register it for automatic
 * reload on locale changes. The first call loads the content and registers
 * its loader; future locale changes reload it automatically.
 */
export async function loadContent(module: string): Promise<void> {
  const provider = getI18nProvider()
  const locale = provider.getLocale()
  const loader = async (loc: string): Promise<void> => {
    const content = await import(`./locales/${loc}/${module}.ts`)
    provider.addTranslations(loc, content[module])
  }
  registerContent(module, loader)
  await loader(locale)
}
