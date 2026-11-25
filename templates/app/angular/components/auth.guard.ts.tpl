import { Component, computed } from '@angular/core'
import { RouterOutlet } from '@angular/router'

import { useAuth, useAuthClient, useTranslation } from '@molecule/app-angular'
import { AuthGuard, LoadErrorBanner } from '@molecule/app-ui-angular'

export { AuthGuard } from '@molecule/app-ui-angular'

/**
 * Keep the shared guard: it holds the restore window that a hand-written
 * `!isAuthenticated` redirect mistakes for signed out.
 *
 * Route: `component: AuthGuardComponent` wrapping the private routes; the
 * rendered page arrives through the wrapped `<router-outlet />`.
 * For a custom in-page check, hold only while `status === 'loading'`, redirect
 * only on `status === 'unauthenticated'`, and let `'unavailable'` render without
 * treating it as confirmed sign-in. Keep public sections outside the guard for signed-out visitors.
 * The application shell passes `awaitSession` to `provideMolecule`, so a public page's
 * signed-in action (Follow, Favorite) reads the restored user when restoration
 * succeeds. An unavailable session may still have a null user; handle that status
 * separately from sign-out. Keep that prop.
 * Prefer router navigation to full-page loads so clicks do not restart restore.
 */

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
 *
 * In this template the policy is applied by the ROUTE TREE in `src/main.ts`:
 * the public views below are the top-level routes, and every route nested
 * under `AuthGuardComponent` requires sign-in — a new route is private until it
 * is added at the top level, exactly the default-deny rule `publicViews`
 * encodes on the React side.
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

/**
 * Route-tree boundary: enforce the application's private views before any page
 * can mount.
 *
 * While the session status is `'unavailable'` — a retained candidate the server
 * could not confirm — the load-error banner replaces the guard (an unavailable
 * session is not sign-out: keep the requested private view selected, show its
 * real session error, and prevent a page from substituting public data just
 * because its user has not been confirmed). Otherwise the shared `AuthGuard`
 * holds the page while the status is `'loading'` and redirects an
 * unauthenticated visitor to `/login`, carrying the attempted location in
 * navigation state `from` for the login page to return to.
 */
@Component({
  selector: 'app-auth-guard',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [AuthGuard, LoadErrorBanner, RouterOutlet],
  template: `
    @if (unavailable()) {
      <div mol-load-error-banner [onRetry]="retry">
        <span slot="message">{{ unavailableMessage }}</span>
      </div>
    } @else {
      <mol-auth-guard loginPath="/login">
        <router-outlet />
      </mol-auth-guard>
    }
  `,
})
export class AuthGuardComponent {
  private readonly auth = useAuth()
  private readonly client = useAuthClient()
  private readonly i18n = useTranslation()

  /** The reactive translation function (re-evaluates on locale change). */
  protected readonly t = this.i18n.t

  /** Whether the session is a retained candidate the server could not confirm. */
  protected readonly unavailable = computed(() => this.auth.status() === 'unavailable')

  /**
   * The real session error, or the translated fallback when the client
   * published none.
   */
  protected get unavailableMessage(): string {
    return (
      this.auth.state().error ??
      this.t('auth.sessionUnavailable', {}, { defaultValue: 'Could not confirm your session.' })
    )
  }

  /** Re-runs the auth client's session validation (the banner's Retry). */
  protected readonly retry = (): Promise<unknown> | undefined => this.client.validateSession?.()
}
