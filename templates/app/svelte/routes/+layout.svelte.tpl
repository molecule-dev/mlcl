<script lang="ts">
  import '../index.css'
  import '../theme.css'
  import { afterNavigate, goto, replaceState } from '$app/navigation'
  import { page } from '$app/stores'
  import { authClient, i18nProvider, themeProvider } from '$lib/bonds/index.js'
  import type { Snippet } from 'svelte'

  import { getClient as getHttpClient } from '@molecule/app-http'
  import { setRouter } from '@molecule/app-routing'
  import { createSvelteKitNavigation, createSvelteKitRouter } from '@molecule/app-routing-sveltekit'
  import { getProvider as getStorageProvider } from '@molecule/app-storage'
  import { createAuthStores, setMoleculeContext } from '@molecule/app-svelte'

  import RouteAccess from '../components/RouteAccess.svelte'

  let { children }: { children: Snippet } = $props()

  // One molecule Router over SvelteKit's navigation: `useRouter()` from
  // @molecule/app-svelte and every molecule package that calls `getRouter()`
  // navigate through it (SPA navigation, the entry's state kept), as React's
  // `BrowserRouter` does. `afterNavigate` must run during component
  // initialisation, which is why it is built here, in the root layout, once.
  const router = createSvelteKitRouter(
    createSvelteKitNavigation({ goto, replaceState, page, afterNavigate }),
  )
  setRouter(router)

  // Wire the bonded providers ONCE, at the root, so every route and component
  // below reads the same clients — the MoleculeProvider of the React scaffold.
  setMoleculeContext({
    auth: authClient,
    i18n: i18nProvider,
    theme: themeProvider,
    http: getHttpClient(),
    storage: getStorageProvider(),
    router,
  })

  // The routes are the SvelteKit files under `routes/` — one component per
  // route, registered by the file tree (the <Routes> list of the React
  // scaffold). They are imported statically for the same measured reason:
  // every page is small, a deferred route costs a serial chunk request after
  // the entry executes, and a full document load can land on ANY route here
  // (a deep link, or a session restored from storage by `authClient.initialize()`).
  //
  // The access policy lives in RouteAccess.svelte. `sessionReady` is the
  // `awaitSession` prop of the React scaffold's MoleculeProvider: it holds
  // every page until a returning visitor's session is restored (one request
  // after a full page load), so public pages read the restored user when that
  // request succeeds. An 'unavailable' session still renders and may have a
  // null user; RouteAccess handles that status separately from sign-out. A
  // visitor with no session to restore makes no request. Keep it.
  const { sessionReady } = createAuthStores()
</script>

{#if $sessionReady}
  <RouteAccess>
    {@render children()}
  </RouteAccess>
{/if}
