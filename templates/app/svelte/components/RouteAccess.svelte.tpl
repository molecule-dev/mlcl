<script lang="ts">
  // The application's access boundary, the port of the React scaffold's
  // RouteAccess: public routes render bare, every other route is held by the
  // shared AuthGuard (which owns the restore window and the /login redirect).
  // A Svelte component cannot export values, and SvelteKit's root layout
  // cannot read the context it sets itself, so the policy and the matcher live
  // in THIS component (the framework's counterpart of React's AuthGuard.tsx
  // RouteAccess half) instead of beside them.
  import type { Snippet } from 'svelte'

  import { matchPath } from '@molecule/app-routing'
  import { useAuth, useAuthClient, useLocation, useTranslation } from '@molecule/app-svelte'
  import { AuthGuard, LoadErrorBanner } from '@molecule/app-ui-svelte'

  import AppLayout from './AppLayout.svelte'

  let { children }: { children: Snippet } = $props()

  /** A path, optionally restricted to a query-selected view on that path. */
  interface RouteView {
    /** Route pattern. Matching includes the whole pathname. */
    path: string
    /** Every declared query value must match. Unrelated parameters are allowed. */
    query?: Readonly<Record<string, string>>
  }

  /**
   * Application-owned public access policy. New routes require sign-in until
   * declared here. Add public reader pages here rather than removing the
   * route-tree boundary. The routes NOT listed here render inside the app
   * shell (header + footer), exactly as the React scaffold nests them under
   * its AppLayout route element.
   */
{{#feature footer}}
  const publicViews: readonly RouteView[] = [
    { path: '/login' },
    { path: '/signup' },
    { path: '/about' },
{{#feature emails}}
    { path: '/forgot-password' },
    { path: '/reset-password' },
{{/feature}}
  ]
{{/feature}}
{{^feature footer}}
{{#feature emails}}
  const publicViews: readonly RouteView[] = [
    { path: '/login' },
    { path: '/signup' },
    { path: '/forgot-password' },
    { path: '/reset-password' },
  ]
{{/feature}}
{{^feature emails}}
  const publicViews: readonly RouteView[] = [{ path: '/login' }, { path: '/signup' }]
{{/feature}}
{{/feature}}

  /** Private query-selected views override a matching public path. */
  const privateViews: readonly RouteView[] = []

  const { status, state: authState } = useAuth()
  const client = useAuthClient()
  const { t } = useTranslation()
  const location = useLocation()

  const isPrivate = $derived.by(() => {
    const query = new URLSearchParams($location.search)
    const matches = (view: RouteView): boolean =>
      matchPath(view.path, $location.pathname) !== null &&
      Object.entries(view.query ?? {}).every(([name, value]) => query.get(name) === value)
    return privateViews.some(matches) || !publicViews.some(matches)
  })
</script>

<!-- An unavailable session is not sign-out. Keep the requested private view
     selected, show its real session error, and prevent a page from
     substituting public data just because its user has not been confirmed. -->
{#if isPrivate && $status === 'unavailable'}
  <LoadErrorBanner
    message={$authState.error ??
      t('auth.sessionUnavailable', {}, { defaultValue: 'Could not confirm your session.' })}
    onRetry={() => client.validateSession?.()}
  />
{:else if isPrivate}
  <!-- The guard holds the restore window that a hand-written !isAuthenticated
       redirect mistakes for signed out; the shell keeps the header/footer
       mounted while the page content swaps. -->
  <AuthGuard>
    <AppLayout>
      {@render children()}
    </AppLayout>
  </AuthGuard>
{:else}
  {@render children()}
{/if}
