import { getProvider as getI18nProvider, registerContent } from '@molecule/app-i18n'

export const API_BASE_URL = import.meta.env?.VITE_API_URL || '/api'

/*
 * What the shared auth client already handles:
 * - `getAccessToken()` returns a stored token during restore; only 401/403 clears
 *   the session, while network/5xx failures retain it.
 * - `tokenKey`/`storagePrefix`, `authScheme`, `mapAuthResponse`,
 *   `currentUserEndpoint`, and `profileEndpoint`/`profileUpdateMethod` adapt the API.
 * - `logout()` and `refresh()` own sign-out and token refresh.
 * HTTP readiness delays requests, not rendering children; only a route guard waits
 * for `status === 'loading'`. Read the session through the framework binding in
 * AGENTS.md. Use the generated bond instead of another session store.
 */

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
 * import { createJWTAuthClient } from '@molecule/app-auth'
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
 * const authClient = createJWTAuthClient<AppUser>(authConfig)
 *
 * // In app logic: `user` is `AppUser | null`.
 * const user = authClient.getUser()
 * // Pass AppUser to the project's framework session binding too.
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
 * import { createJWTAuthClient } from '@molecule/app-auth'
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
 * const authClient = createJWTAuthClient<Account>(authConfig)
 *
 * // In app logic: `user` is `Account | null` — `user?.handle` is typed.
 * const user = authClient.getUser()
 * // Pass Account to the project's framework session binding too.
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
  // reads another one (some APIs read the bare `Token` scheme). Both read THIS value —
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
  // The auth factory defaults to its own browser storage adapter. The generated bond
  // passes this config through, so an explicit `storage` choice takes precedence.
  // To keep a bearer out of script-reachable storage with an HttpOnly session cookie,
  // set `storage: 'memory'`. Set `cookieRestore: 'always'` to probe an external cookie
  // without a readable hint. The default `cookieRestore: 'hint'` needs the server's
  // readable `mol_auth=1` cookie.
  // An external contract that reads the token at its own key (an e2e suite's
  // `localStorage.getItem('app.jwt')`) needs `tokenKey: 'app.jwt'` here, paired with the
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
