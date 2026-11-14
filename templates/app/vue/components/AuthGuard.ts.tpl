/**
 * Keep the shared guard: it holds the restore window that a hand-written
 * `!isAuthenticated` redirect mistakes for signed out.
 *
 * Route: the private route subtree renders under `<AuthGuard>` (RouteAccess mounts
 * it for private views); in-page section: `<AuthGuard><SignedInSection /></AuthGuard>`.
 * For a custom in-page check, hold only while `status === 'loading'`, redirect
 * only on `status === 'unauthenticated'`, and let `'unavailable'` render without
 * treating it as confirmed sign-in. Keep public sections outside the guard for signed-out visitors.
 * The application shell holds every page until the session is decided
 * (`SessionReady` in App.vue), so a public page's
 * signed-in action (Follow, Favorite) reads the restored user when restoration
 * succeeds. An unavailable session may still have a null user; handle that status
 * separately from sign-out.
 * Prefer router navigation to full-page loads so clicks do not restart restore.
 */
import { defineComponent, h, type PropType, type SetupContext, type VNodeChild } from 'vue'

import { matchRoutePattern } from '@molecule/app-routing'
import { AuthGuard, LoadErrorBanner } from '@molecule/app-ui-vue'
import { useAuth, useAuthClient, useLocation, useTranslation } from '@molecule/app-vue'

export { AuthGuard } from '@molecule/app-ui-vue'

/** A path, optionally restricted to a query-selected view on that path. */
export interface RouteView {
  /** Route path pattern. Matching includes the whole pathname. */
  path: string
  /** Every declared query value must match. Unrelated parameters are allowed. */
  query?: Readonly<Record<string, string>>
}

/**
 * Application-owned public access policy. New routes require sign-in until declared
 * here. Add public reader pages here rather than removing the route-tree boundary.
 */
export const publicViews: readonly RouteView[] = [
  { path: '/login' },
  { path: '/signup' },
  { path: '/about' },
  { path: '/forgot-password' },
  { path: '/reset-password' },
]

/** Private query-selected views override a matching public path. */
export const privateViews: readonly RouteView[] = []

/** Props for the route-tree boundary. */
export interface RouteAccessProps {
  /** Private exceptions within a public path. These take precedence. */
  views?: readonly RouteView[]
  /** Only these paths/views are public; every other route requires sign-in. */
  publicViews?: readonly RouteView[]
}

/**
 * Enforce the application's private views before any page or list can mount.
 * The guarded content goes through the default slot, the way React's `RouteAccess`
 * takes `children`.
 */
export const RouteAccess = defineComponent({
  name: 'RouteAccess',
  props: {
    /** Private exceptions within a public path. These take precedence. */
    views: { type: Array as PropType<readonly RouteView[]>, default: undefined },
    /** Only these paths/views are public; every other route requires sign-in. */
    publicViews: { type: Array as PropType<readonly RouteView[]>, default: undefined },
  },
  setup(props: RouteAccessProps, { slots }: SetupContext): () => VNodeChild {
    const location = useLocation()
    const { status, state } = useAuth()
    const client = useAuthClient()
    const { t } = useTranslation()
    return () => {
      const current = location.value
      const query = new URLSearchParams(current.search)
      const matches = (view: RouteView): boolean =>
        matchRoutePattern(view.path, current.pathname) !== null &&
        Object.entries(view.query ?? {}).every(([name, value]) => query.get(name) === value)
      const views = props.views ?? privateViews
      const publicPolicy = props.publicViews ?? publicViews
      const isPrivate = views.some(matches) || !publicPolicy.some(matches)
      // An unavailable session is not sign-out. Keep the requested private view
      // selected, show its real session error, and prevent a page from substituting
      // public data just because its user has not been confirmed.
      if (isPrivate && status.value === 'unavailable') {
        return h(LoadErrorBanner, {
          message:
            state.value.error ??
            t('auth.sessionUnavailable', {}, { defaultValue: 'Could not confirm your session.' }),
          onRetry: client.validateSession?.bind(client),
        })
      }
      return isPrivate ? h(AuthGuard, () => slots.default?.()) : slots.default?.()
    }
  },
})
