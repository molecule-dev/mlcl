import { ChangeDetectorRef, Component, inject, type OnDestroy, type OnInit } from '@angular/core'
import { Router, RouterOutlet } from '@angular/router'
import { MoleculeAuthService, t } from '@molecule/app-angular'
import type { Subscription } from 'rxjs'

/**
 * Route guard for the authenticated section of the app.
 *
 * Port of `@molecule/app-ui-react`'s `AuthGuard` route element:
 * - while the session status is `'loading'` (no decision yet) it renders the
 *   `auth-guard-loading` tag instead of the page;
 * - `'unauthenticated'` redirects to `/login`, carrying the attempted path in
 *   navigation `state.from` so the login page can return there;
 * - `'authenticated'` and `'unavailable'` render the routed page. `'unavailable'`
 *   is a retained candidate the server could not confirm — it still renders and
 *   lets the API decide, exactly like the shared guard.
 *
 * `provideMolecule({ awaitSession: true })` holds bootstrap while the initial
 * status is `'loading'`, so the loading tag is only ever reached by a late
 * status change.
 */
@Component({
  selector: 'app-auth-guard',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    @if (status === 'loading') {
      <div data-mol-id="auth-guard-loading">
        {{ t('common.loading', {}, { defaultValue: 'Loading...' }) }}
      </div>
    } @else {
      <router-outlet />
    }
  `,
})
export class AuthGuardComponent implements OnInit, OnDestroy {
  private readonly authService = inject(MoleculeAuthService)
  private readonly router = inject(Router)
  private readonly cdr = inject(ChangeDetectorRef)
  private subscription?: Subscription

  /** The current translation function. */
  t = t

  /** The current session status. */
  status = this.authService.state.status

  ngOnInit(): void {
    this.subscription = this.authService.state$.subscribe((state) => {
      this.status = state.status
      if (state.status === 'unauthenticated') {
        const pathname = this.router.url.split(/[?#]/)[0] || '/'
        if (pathname !== '/login') {
          void this.router.navigate(['/login'], { state: { from: { pathname } } })
        }
      }
      this.cdr.markForCheck()
    })
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe()
  }
}
