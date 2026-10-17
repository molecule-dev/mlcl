/**
 * The browser store this app keeps its auth session in, so a page reload does not
 * sign the user out.
 *
 * `@molecule/app-auth` holds tokens in memory by default, which a reload destroys.
 * This adapter keeps them in the browser's Web Storage, which a reload reads back;
 * the auth bond (`src/bonds/auth-default.ts`) passes it as `AuthClientConfig.storage`.
 *
 * What that costs, and how to change it:
 *
 * - Web Storage is readable by any script on this origin, so an XSS can steal the
 *   bearer token and use it until it expires. **If this app's API sets an httpOnly
 *   session cookie at login, prefer that**: script cannot read the cookie, and
 *   `authClient.initialize()` restores the session from it. Swap by removing
 *   `storage` from the auth bond — the in-memory default is the stronger pairing
 *   with a cookie session.
 * - `kind: 'session'` keeps the session for this tab only: a reload still survives,
 *   a new tab starts signed out.
 * - Storage that is blocked or full falls back to memory for the life of the page
 *   instead of failing the login, so a successful `setItem` is not a promise of
 *   persistence.
 * - `@molecule/app-auth` exports this same adapter as `createBrowserStorageAdapter()`;
 *   use that (or any object with `getItem` / `setItem` / `removeItem`) once the
 *   installed version provides it.
 */

/** Which Web Storage area {@link createBrowserStorageAdapter} persists to. */
export type BrowserStorageKind = 'local' | 'session'

/** How {@link createBrowserStorageAdapter} picks the store it writes to. */
export interface BrowserStorageAdapterOptions {
  /** The Web Storage area to use (default `'local'`: survives a reload and the tab closing). */
  kind?: BrowserStorageKind
  /** A store to use instead of resolving `window.localStorage` / `window.sessionStorage`. */
  storage?: BrowserStorage
}

/** The three methods this adapter needs — `window.localStorage` satisfies it. */
export interface BrowserStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * A `StorageAdapter` over the browser's Web Storage, for `AuthClientConfig.storage`.
 *
 * @param options - Which Web Storage area to use, or a store to use directly.
 * @returns A synchronous adapter bound to that store.
 */
export function createBrowserStorageAdapter(
  options: BrowserStorageAdapterOptions = {},
): BrowserStorage {
  const { kind = 'local', storage } = options
  // The fallback store: one Map per adapter, so an unusable Web Storage area still
  // behaves like a store for the lifetime of the page.
  const memory = new Map<string, string>()
  /** The store once it has answered; `null` while it is unusable (re-probed each call). */
  let resolved: BrowserStorage | null | undefined
  /** An unusable store is worth naming once, not on every token read. */
  let warned = false

  const resolve = (): BrowserStorage | null => {
    if (storage) return storage
    if (resolved) return resolved
    try {
      const areas = globalThis as unknown as Record<string, BrowserStorage | undefined>
      const web = kind === 'session' ? areas.sessionStorage : areas.localStorage
      if (web) {
        // A store can be PRESENT and still unusable (a blocked third-party context,
        // a private mode): touching it throws, so probe before trusting it.
        const probe = '__browser_storage_probe__'
        web.setItem(probe, probe)
        web.removeItem(probe)
        resolved = web
        return web
      }
    } catch (error) {
      if (!warned) {
        warned = true
        console.warn(
          `The ${kind} Web Storage area is not usable; keeping auth tokens in memory`,
          error,
        )
      }
    }
    // Not cached: a store that appears later is still picked up by the next call.
    return null
  }

  return {
    getItem: (key) => {
      const store = resolve()
      if (!store) return memory.get(key) ?? null
      try {
        // A write that fell back to memory (a full or blocked store) is still this
        // session's value: the store simply never received it.
        return store.getItem(key) ?? memory.get(key) ?? null
      } catch (error) {
        console.warn('Reading a stored auth value failed; falling back to memory', error)
        return memory.get(key) ?? null
      }
    },
    setItem: (key, value) => {
      const store = resolve()
      if (!store) {
        memory.set(key, value)
        return
      }
      try {
        store.setItem(key, value)
        memory.delete(key)
      } catch (error) {
        // A quota-full or blocked store must not fail a login: keep the value for
        // this page's lifetime and say so. The session is lost on reload.
        console.warn('Storing an auth value failed; keeping it in memory for this page', error)
        memory.set(key, value)
      }
    },
    removeItem: (key) => {
      memory.delete(key)
      const store = resolve()
      if (!store) return
      try {
        store.removeItem(key)
      } catch (error) {
        console.warn('Clearing a stored auth value failed', error)
      }
    },
  }
}
