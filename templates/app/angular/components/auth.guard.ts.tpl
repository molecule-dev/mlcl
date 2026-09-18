import { inject } from '@angular/core'
import { type CanActivateFn, Router } from '@angular/router'
import { MoleculeAuthService } from '@molecule/app-angular'

export const authGuard: CanActivateFn = () => {
  const authService = inject(MoleculeAuthService)
  if (authService.isAuthenticated) return true
  const router = inject(Router)
  return router.createUrlTree(['/login'])
}
