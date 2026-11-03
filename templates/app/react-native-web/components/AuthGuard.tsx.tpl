import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth, useTranslation } from '@molecule/app-react'

export function AuthGuard() {
  const { status } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()

  // `status`, not `initialized`: a stored token AND user make the FIRST render
  // 'authenticated' (the client restores synchronously), so a protected page must
  // not wait for the background verification. Only 'loading' means no decision.
  if (status === 'loading') return <div>{t('common.loading')}</div>
  // An unavailable cookie-only candidate can have no user yet. Only a decided
  // signed-out status warrants redirecting it; let the API handle unavailable.
  if (status === 'unauthenticated') return <Navigate to="/login" state={{ from: location }} replace />

  return <Outlet />
}
