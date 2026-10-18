import { inject } from '@angular/core'
import { type CanActivateFn, Router } from '@angular/router'
import { MoleculeAuthService } from '@molecule/app-angular'
import { first, map } from 'rxjs'

/**
 * Wait only while the session has no decision yet (`status === 'loading'` — no
 * stored user, a cookie restore in flight), then redirect an unauthenticated
 * visitor. The client restores a stored token AND user synchronously
 * ('authenticated' on the first render), so a protected page never waits for a
 * background verification.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(MoleculeAuthService)
  const router = inject(Router)
  return authService.state$.pipe(
    first((state) => state.status !== 'loading'),
    map((state) => (state.authenticated ? true : router.createUrlTree(['/login']))),
  )
}
