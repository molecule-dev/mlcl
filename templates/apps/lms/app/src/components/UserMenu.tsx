import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-react'

import { SettingsPanel } from './SettingsPanel.js'

function UserMenuPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

/**
 * Thin wrapper around the shared `UserMenu` that injects this app's
 * own `SettingsPanel` as the drawer body. Public pages (Pricing, About,
 * Terms, Privacy) share the same header — logged-out visitors get auth
 * entry points instead of the signed-in panel.
 *
 * `dataMolId` lets hosts disambiguate multiple mounted menus (e.g. the
 * mobile bar's `user-menu-mobile` next to the desktop TopNavBar's).
 */
export function UserMenu({ dataMolId }: { dataMolId?: string } = {}) {
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
    <MoleculeUserMenu dataMolId={dataMolId}>
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
