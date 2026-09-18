import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth, useTranslation } from '@molecule/app-react'

export function AuthGuard() {
  const { isAuthenticated, state } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()

  if (!state.initialized) return <div>{t('common.loading')}</div>
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />

  return <Outlet />
}
