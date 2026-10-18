import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth, useTranslation } from '@molecule/app-react'

export function AuthGuard() {
  const { isAuthenticated, status } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()

  // `status`, not `initialized`: a stored token AND user make the FIRST render
  // 'authenticated' (the client restores synchronously), so a protected page must
  // not wait for the background verification. Only 'loading' means no decision.
  if (status === 'loading') return <div>{t('common.loading')}</div>
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />

  return <Outlet />
}
