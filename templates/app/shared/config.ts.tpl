import { getProvider as getI18nProvider, registerContent } from '@molecule/app-i18n'

export const API_BASE_URL = import.meta.env?.VITE_API_URL || '/api'

export const authConfig = {
  baseURL: API_BASE_URL,
  loginEndpoint: '/users/log-in',
  registerEndpoint: '/users',
  forgotPasswordEndpoint: '/users/forgot-password',
  resetPasswordEndpoint: '/users/reset-password',
  changePasswordEndpoint: '/users/password',
  // Token storage is NOT set here — it is wiring, so the generated auth bond
  // (`src/bonds/auth-default.ts`) passes `createBrowserStorageAdapter()` from
  // `@molecule/app-auth`, which keeps the session across a page reload. Change it
  // there: that export's JSDoc has the trade (Web Storage is script-readable) and
  // the stronger alternative (an httpOnly session cookie the API sets, paired with
  // the client's in-memory default).
  // An external contract that reads the token at its own key (an e2e suite's
  // `localStorage.jwtToken`) is the client's `tokenKey` — set `tokenKey: 'jwtToken'`
  // beside the bond's `storage: createBrowserStorageAdapter()`, never a second store.
  // This API issues no refresh token — the durable session is an httpOnly cookie
  // the server refreshes — so there is nothing for the client to refresh. Set this
  // true only for an API with a refresh endpoint that returns refresh tokens.
  autoRefresh: false,
}

export const oauthConfig = {
  baseURL: API_BASE_URL,
  oauthProviders: [{{OAUTH_PROVIDERS}}],
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
