import { getProvider as getI18nProvider, registerContent } from '@molecule/app-i18n'

export const API_BASE_URL = import.meta.env?.VITE_API_URL || '/api'

/*
 * The user shape of this app's auth session — decide it ONCE and pass it to the
 * factory, this config and the hook. `mapAuthResponse` is then checked against it:
 * a mapper that leaves out a field the pages read is a compile error, not a
 * signed-in page rendering `undefined`.
 *
 * The DEFAULT user resource answers a user whose `id` is the server's (`id`, plus
 * optional `name`/`avatar`), so its profile extends `UserProfile`. Spread the wire
 * user and keep that `id`. Never re-derive it from `username`, `handle` or `name` —
 * those are display fields that change; a fabricated id changes with them, and
 * anything that treats it as identity is then wrong.
 *
 * ```typescript
 * import type { AuthClientConfig, UserProfile } from '@molecule/app-auth'
 * import { createBrowserStorageAdapter, createJWTAuthClient } from '@molecule/app-auth'
 * import { useAuth } from '@molecule/app-react'
 *
 * interface AppUser extends UserProfile {
 *   username?: string
 *   bio?: string
 * }
 *
 * // The endpoint fields below, typed by this app's profile.
 * export const authConfig: AuthClientConfig<AppUser> = {}
 *
 * // src/bonds/auth-default.ts — the generated call takes the SAME type argument.
 * createJWTAuthClient<AppUser>({ ...authConfig, storage: createBrowserStorageAdapter() })
 *
 * // In a component: `user` is `AppUser`.
 * useAuth<AppUser>()
 * ```
 *
 * An API whose account has NO `id` (an account keyed by handle, a directory
 * profile) is typed by its own interface. It does not extend `UserProfile`, and
 * nothing is invented to satisfy `id`: the client stores and returns the object it
 * is given and reads no field of it. The type argument at the factory, this config
 * and the hook is the whole support — no extra package and no hand-written
 * provider.
 *
 * ```typescript
 * import type { AuthClientConfig } from '@molecule/app-auth'
 * import { createBrowserStorageAdapter, createJWTAuthClient } from '@molecule/app-auth'
 * import { useAuth } from '@molecule/app-react'
 *
 * interface Account {
 *   handle: string
 *   email: string
 *   displayName?: string
 *   avatarUrl?: string
 * }
 *
 * export const authConfig: AuthClientConfig<Account> = {
 *   // The endpoint fields below, then the account's own write route and answer shape.
 *   profileEndpoint: (user) => '/accounts/' + encodeURIComponent(user.handle),
 *   mapAuthResponse: (data) => {
 *     const { token, account } = data as { token: string; account: Account }
 *     // The bearer stays OUT of the profile: the client caches `user` in Web
 *     // Storage, where any script on the origin can read a token copy.
 *     return { accessToken: token, user: account }
 *   },
 * }
 *
 * // src/bonds/auth-default.ts — the generated call takes the SAME type argument.
 * createJWTAuthClient<Account>({ ...authConfig, storage: createBrowserStorageAdapter() })
 *
 * // In a component: `user` is `Account` — `user.handle` is typed, `user.id` does
 * // not exist.
 * useAuth<Account>()
 * ```
 *
 * Keep every wire field the pages read (spreading the wire user does that), map a
 * field to another NAME only when the page reads that name, and never silence a
 * mismatch with `as unknown as T`. An app that bonds
 * `@molecule/app-bonds-default-react` passes the same type to
 * `createDefaultAuthClient<T>(authConfig)` instead of `createJWTAuthClient<T>`.
 */

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
  // The write route comes from the API user resource contract, independently of the GET above.
  // Keep this with its method when adapting the app to a different API.
{{PROFILE_UPDATE_CONFIG}}
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
