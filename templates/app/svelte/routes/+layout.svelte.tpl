<script lang="ts">
  import '../index.css'
  import '../theme.css'
  import { page } from '$app/stores'
  import { authClient, i18nProvider, themeProvider } from '$lib/bonds/index.js'
  import type { Snippet } from 'svelte'

  import { getClient as getHttpClient } from '@molecule/app-http'
  import { getProvider as getStorageProvider } from '@molecule/app-storage'
  import { createAuthStores, setMoleculeContext } from '@molecule/app-svelte'

  import AppLayout from '../components/AppLayout.svelte'
  import AuthGuard from '../components/AuthGuard.svelte'

  let { children }: { children: Snippet } = $props()

  // Wire the bonded providers ONCE, at the root, so every route and component
  // below reads the same clients — the MoleculeProvider of the React scaffold.
  setMoleculeContext({
    auth: authClient,
    i18n: i18nProvider,
    theme: themeProvider,
    http: getHttpClient(),
    storage: getStorageProvider(),
  })

  const { sessionReady } = createAuthStores()

  // The routes the React scaffold registers OUTSIDE the auth guard: they
  // render with no header/footer chrome, exactly as their <Route> entries do.
  const publicRoutes = ['/login', '/signup', '/about', '/forgot-password', '/reset-password']

  let isPublicRoute = $derived(publicRoutes.includes($page.url.pathname))
</script>

<!-- Hold every page while the initial session status is 'loading', so public
     actions see the restored user when restoration succeeds. 'unavailable'
     also renders and may have a null user. Without a session hint, an anonymous
     visitor settles in microtasks without a request. The hold renders NOTHING
     while it waits, exactly as the React scaffold's `awaitSession` does
     (SessionReady's default fallback is null). -->
{#if $sessionReady}
  {#if isPublicRoute}
    {@render children()}
  {:else}
    <!-- The guard holds the restore window that a hand-written
         !isAuthenticated redirect mistakes for signed out; the layout shell
         keeps the header/footer mounted while the page content swaps. -->
    <AuthGuard>
      <AppLayout>
        {@render children()}
      </AppLayout>
    </AuthGuard>
  {/if}
{/if}
