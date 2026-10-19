import { getProvider as getI18nProvider, registerContent } from '@molecule/app-i18n'

export const API_BASE_URL = import.meta.env?.VITE_API_URL || '/api'

// When your API returns more than the base profile (`id`/`name`/`avatar`), give
// this config the app's user type ONCE and reuse it everywhere:
//
//   import type { AuthClientConfig, UserProfile } from '@molecule/app-auth'
//   interface AppUser extends UserProfile { username: string; image: string }
//   export const authConfig: AuthClientConfig<AppUser> = { /* … */ }
//   createDefaultAuthClient<AppUser>(authConfig)   // in src/bonds/auth-default.ts
//   useAuth<AppUser>()                             // in components
//
// `mapAuthResponse` (below, when the API wraps its auth answer) is then
// type-checked against `AppUser`: a mapper that omits a required custom field is
// a compile error, not a signed-in page that renders `undefined`. Keep every
// field the pages read — spread the wire user and ADD the base fields
// (`user: { ...wire, id: wire.username, name: wire.username, avatar: wire.image }`)
// rather than rebuilding it field by field. Never silence the check with
// `as unknown as AppUser`.
export const authConfig = {
  baseURL: API_BASE_URL,
  // The scheme the auth and HTTP clients send the token with: `Bearer` unless the API
  // reads another one (`Token` for an API shaped like RealWorld's). Both read THIS value —
  // never set it on a built client (that is a type error and changes no header).
  authScheme: 'Bearer',
  loginEndpoint: '/users/log-in',
  registerEndpoint: '/users',
  // The current-user route. `validateSession()` calls it on reload to confirm the
  // stored session, and `initialize()` uses it to restore the session from the
  // httpOnly cookie. Point it at your API's own current-user route when you serve
  // one: the `/users/me` default answers 404 there, and the auth client then keeps
  // the stored token but leaves the session unconfirmed.
  currentUserEndpoint: '/users/me',
  forgotPasswordEndpoint: '/users/forgot-password',
  resetPasswordEndpoint: '/users/reset-password',
  changePasswordEndpoint: '/users/password',
  // Token storage is NOT set here — it is wiring, so the generated auth bond
  // (`src/bonds/auth-default.ts`) passes `createBrowserStorageAdapter()` from
  // `@molecule/app-auth`, which keeps the session across a page reload (in a browser
  // that adapter is also the client's default). To keep the bearer token out of
  // script-reachable storage when your API sets an httpOnly session cookie, pass
  // `storage: 'memory'` in the bond instead — the stronger route.
  // An external contract that reads the token at its own key (an e2e suite's
  // `localStorage.jwtToken`) is `tokenKey: 'jwtToken'` in this config, paired with the
  // bond's `storage: createBrowserStorageAdapter()`; never a second store.
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
