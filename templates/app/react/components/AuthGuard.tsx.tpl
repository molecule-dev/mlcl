/**
 * Keep the shared guard: it holds the restore window that a hand-written
 * `!isAuthenticated` redirect mistakes for signed out.
 *
 * Route: `<Route element={<AuthGuard />}>...</Route>`; in-page section:
 * `<AuthGuard><SignedInSection /></AuthGuard>`.
 * For a custom in-page check, hold only while `status === 'loading'`, redirect
 * only on `status === 'unauthenticated'`, and let `'unavailable'` render without
 * treating it as confirmed sign-in. Keep public sections outside the guard for signed-out visitors.
 * The application shell passes `awaitSession` to `MoleculeProvider`, so a public page's
 * signed-in action (Follow, Favorite) reads the restored user when restoration
 * succeeds. An unavailable session may still have a null user; handle that status
 * separately from sign-out. Keep that prop.
 * Prefer router navigation to full-page loads so clicks do not restart restore.
 */
import type { ReactNode } from 'react'
import { matchPath, matchRoutes, type RouteObject, useLocation } from 'react-router'

import { useAuth, useAuthClient, useTranslation } from '@molecule/app-react'
import { AuthGuard, LoadErrorBanner } from '@molecule/app-ui-react'

export { AuthGuard } from '@molecule/app-ui-react'

/** A path, optionally restricted to a query-selected view on that path. */
export interface RouteView {
  /** React Router path pattern. Matching includes the whole pathname. */
  path: string
  /** Every declared query value must match. Unrelated parameters are allowed. */
  query?: Readonly<Record<string, string>>
}

/**
 * A rendered route and its access policy, declared together in App.tsx.
 * Every route, including layout and index routes, declares access. A private
 * ancestor protects all descendants. A public route can restrict its public
 * view to matching query values; other query values require sign-in.
 */
export type AppRoute = RouteObject & {
  /** Whether a signed-out visitor can open this route. */
  access: 'public' | 'private'
  /** Query values required for public access; unrelated parameters are allowed. */
  publicQuery?: Readonly<Record<string, string>>
  /** Omit to use the app shell; 'none' explicitly opts this branch into its own layout. */
  layout?: 'none'
  /** Nested routes, with their own explicit access declarations. */
  children?: AppRoute[]
}

/** Private query-selected views override a matching public path. */
export const privateViews: readonly RouteView[] = []

/** Props for the route-tree boundary. */
export interface RouteAccessProps {
  children: ReactNode
  /** The same route declaration passed to useRoutes; no separate path allowlist. */
  routes: AppRoute[]
  /** Private exceptions within a public path. These take precedence. */
  views?: readonly RouteView[]
}

/**
 * Enforce the application's private views before any page or list can mount.
 * @param props - Page routes and their application-owned access policy.
 * @returns Public routes, authenticated routes, or the session/redirect fallback.
 */
export function RouteAccess({
  children,
  routes,
  views = privateViews,
}: RouteAccessProps): ReactNode {
  const location = useLocation()
  const { status, state } = useAuth()
  const client = useAuthClient()
  const { t } = useTranslation()
  const query = new URLSearchParams(location.search)
  const matches = (view: RouteView): boolean =>
    matchPath(view.path, location.pathname) !== null &&
    Object.entries(view.query ?? {}).every(([name, value]) => query.get(name) === value)
  const branch = matchRoutes(routes, location)
  const isPrivate =
    views.some(matches) ||
    !branch?.every(
      ({ route }) =>
        route.access === 'public' &&
        Object.entries(route.publicQuery ?? {}).every(([name, value]) => query.get(name) === value),
    )
  // An unavailable session is not sign-out. Keep the requested private view
  // selected, show its real session error, and prevent a page from substituting
  // public data just because its user has not been confirmed.
  if (isPrivate && status === 'unavailable') {
    return (
      <LoadErrorBanner
        message={
          state.error ??
          t('auth.sessionUnavailable', {}, { defaultValue: 'Could not confirm your session.' })
        }
        onRetry={client.validateSession?.bind(client)}
      />
    )
  }
  return isPrivate ? <AuthGuard>{children}</AuthGuard> : children
}
