<script lang="ts">
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { page } from '$app/stores'
  import type { RouteIdWithSearchOrHash } from '$app/types'
  import type { Snippet } from 'svelte'

  import { createAuthStores } from '@molecule/app-svelte'

  import { createAppI18nStores } from '../lib/i18n.js'

  /**
   * Keep the shared guard: it holds the restore window that a hand-written
   * `!isAuthenticated` redirect mistakes for signed out.
   *
   * Route shell: wrap the protected children in `<AuthGuard>`; in-page
   * section: `<AuthGuard><SignedInSection /></AuthGuard>`.
   * For a custom in-page check, hold only while `status === 'loading'`,
   * redirect only on `status === 'unauthenticated'`, and let `'unavailable'`
   * render without treating it as confirmed sign-in. The layout passes
   * `awaitSession`, so on a public page a signed-in action reads the restored
   * user when restoration succeeds. An unavailable session may still have a
   * null user; handle that status separately from sign-out.
   * Prefer router navigation to full-page loads so clicks do not restart restore.
   */
  let {
    loadingKey = 'common.loading',
    loadingDefault = 'Loading...',
    loginPath = '/login',
    children,
  }: {
    /**
     * i18n key used for the default loading-tag text. Custom loading UI
     * replaces the default `<div data-mol-id="auth-guard-loading">` tag —
     * pass it through the loading snippet instead.
     */
    loadingKey?: string
    /** Fallback text if the i18n key is missing. */
    loadingDefault?: string
    /**
     * Path to redirect to when the status is `'unauthenticated'`. The current
     * location is preserved as `state.from` for post-login restoration.
     */
    loginPath?: RouteIdWithSearchOrHash
    children: Snippet
  } = $props()

  const { state: authState } = createAuthStores()
  const { t } = createAppI18nStores()

  let pathname = $derived($page.url.pathname)

  // While the status is 'loading' (no session decision yet) nothing renders
  // past the loading tag; 'unauthenticated' redirects carrying the attempted
  // location for post-login restoration. 'unavailable' still renders and lets
  // the API decide — it is not a confirmed-session boolean, so never redirect
  // on the `isAuthenticated` boolean or require a profile in this state.
  $effect(() => {
    // The pathname part of a login path (`/login?next=x` → `/login`).
    const loginPathname = loginPath.split(/[?#]/)[0] || '/'
    if ($authState.status === 'unauthenticated' && pathname !== loginPathname) {
      goto(resolve(loginPath), {
        replaceState: true,
        state: { from: { pathname: $page.url.pathname, search: $page.url.search } },
      })
    }
  })
</script>

{#if $authState.status === 'loading'}
  <div data-mol-id="auth-guard-loading">
    {$t(loadingKey, {}, { defaultValue: loadingDefault })}
  </div>
{:else}
  {@render children()}
{/if}
