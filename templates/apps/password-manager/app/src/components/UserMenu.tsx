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

/**
 * Thin wrapper around the shared `UserMenu` that injects this app's
 * own `SettingsPanel` as the drawer body. Public pages (Pricing, About,
 * Terms, Privacy) share the same header — logged-out visitors get auth
 * entry points instead of the signed-in panel.
 */
export function UserMenu({ side }: { side?: 'left' | 'right' }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  if (!isAuthenticated) {
    return (
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        <Link
          to="/login"
          data-mol-id="nav-sign-in"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-on-surface-variant hover:text-primary transition-colors',
          )}
        >
          {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </Link>
        <Link
          to="/signup"
          data-mol-id="nav-create-account"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-lg bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary-hover transition-colors',
          )}
        >
          {t('signup.heading', {}, { defaultValue: 'Create your vault' })}
        </Link>
      </div>
    )
  }

  return (
    <MoleculeUserMenu side={side}>
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
