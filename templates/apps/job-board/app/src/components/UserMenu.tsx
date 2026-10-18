import { lazy, Suspense } from 'react'

import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-react'

const SettingsPanel = lazy(() =>
  import('./SettingsPanel.js').then((m) => ({ default: m.SettingsPanel })),
)

function UserMenuPanel() {
  return (
    <Suspense fallback={null}>
      <SettingsPanel onClose={usePanelClose()} />
    </Suspense>
  )
}

export function UserMenu() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  // Public pages (Pricing, About, Terms, Privacy) share this header — give
  // logged-out visitors auth entry points instead of the signed-in panel.
  if (!isAuthenticated) {
    return (
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        <Link
          to="/login"
          data-mol-id="nav-sign-in"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-on-surface-variant hover:text-on-surface transition-colors',
          )}
        >
          {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </Link>
        <Link
          to="/signup"
          data-mol-id="nav-get-started"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-lg bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity',
          )}
        >
          {t('common.getStarted', {}, { defaultValue: 'Get started' })}
        </Link>
      </div>
    )
  }

  return (
    <MoleculeUserMenu>
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
