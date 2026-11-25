/**
 * Keep the shared guard: it holds the restore window that a hand-written
 * `!isAuthenticated()` redirect mistakes for signed out.
 *
 * Route: `<Route component={AuthGuard}>...</Route>`; in-page section:
 * `<AuthGuard><SignedInSection /></AuthGuard>`.
 * For a custom in-page check, hold only while `status() === 'loading'`, redirect
 * only on `status() === 'unauthenticated'`, and let `'unavailable'` render without
 * treating it as confirmed sign-in. Keep public sections outside the guard for signed-out visitors.
 * The application shell passes `awaitSession` to `MoleculeProvider`, so a public page's
 * signed-in action (Follow, Favorite) reads the restored user when restoration
 * succeeds. An unavailable session may still have a null user; handle that status
 * separately from sign-out. Keep that prop.
 * Prefer router navigation to full-page loads so clicks do not restart restore.
 */
import { type JSX, Show } from 'solid-js'

import {
  useAuth,
  useAuthClient,
  useLocation,
  useRouterInstance,
  useTranslation,
} from '@molecule/app-solid'
import { AuthGuard, LoadErrorBanner } from '@molecule/app-ui-solid'

export { AuthGuard } from '@molecule/app-ui-solid'

/** A path, optionally restricted to a query-selected view on that path. */
export interface RouteView {
  /** Router path pattern. Matching includes the whole pathname. */
  path: string
  /** Every declared query value must match. Unrelated parameters are allowed. */
  query?: Readonly<Record<string, string>>
}

/**
 * Application-owned public access policy. New routes require sign-in until declared
 * here. Add public reader pages here rather than removing the route-tree boundary.
 */
{{#feature footer}}
export const publicViews: readonly RouteView[] = [
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
export const publicViews: readonly RouteView[] = [
  { path: '/login' },
  { path: '/signup' },
  { path: '/forgot-password' },
  { path: '/reset-password' },
]
{{/feature}}
{{^feature emails}}
export const publicViews: readonly RouteView[] = [{ path: '/login' }, { path: '/signup' }]
{{/feature}}
{{/feature}}

/** Private query-selected views override a matching public path. */
export const privateViews: readonly RouteView[] = []

/** Props for the route-tree boundary. */
export interface RouteAccessProps {
  children: JSX.Element
  /** Private exceptions within a public path. These take precedence. */
  views?: readonly RouteView[]
  /** Only these paths/views are public; every other route requires sign-in. */
  publicViews?: readonly RouteView[]
}

/**
 * Enforce the application's private views before any page or list can mount.
 * @param props - Page routes and their application-owned access policy.
 * @returns Public routes, authenticated routes, or the session/redirect fallback.
 */
export function RouteAccess(props: RouteAccessProps): JSX.Element {
  const location = useLocation()
  const { status, state } = useAuth()
  const client = useAuthClient()
  const { t } = useTranslation()
  const router = useRouterInstance()
  const views = (): readonly RouteView[] => props.views ?? privateViews
  const publicPolicy = (): readonly RouteView[] => props.publicViews ?? publicViews
  const query = (): URLSearchParams => new URLSearchParams(location().search)
  const matches = (view: RouteView): boolean =>
    router.matchPath(view.path, location().pathname) !== null &&
    Object.entries(view.query ?? {}).every(([name, value]) => query().get(name) === value)
  const isPrivate = (): boolean => views().some(matches) || !publicPolicy().some(matches)
  // An unavailable session is not sign-out. Keep the requested private view
  // selected, show its real session error, and prevent a page from substituting
  // public data just because its user has not been confirmed.
  return (
    <Show
      when={!(isPrivate() && status() === 'unavailable')}
      fallback={
        <LoadErrorBanner
          message={
            state().error ??
            t('auth.sessionUnavailable', {}, { defaultValue: 'Could not confirm your session.' })
          }
          onRetry={client.validateSession?.bind(client)}
        />
      }
    >
      <Show when={!isPrivate()} fallback={<AuthGuard>{props.children}</AuthGuard>}>
        {props.children}
      </Show>
    </Show>
  )
}
