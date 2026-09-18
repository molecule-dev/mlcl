import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-react'

import { SettingsPanel } from './SettingsPanel.js'

function UserMenuPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

/** Sign in / Create account links shown to signed-out visitors on public pages. */
function SignedOutLinks() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
      <Link
        to="/login"
        data-mol-id="nav-sign-in"
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'rounded-lg text-on-surface-variant hover:text-on-surface transition-colors',
        )}
      >
        {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
      </Link>
      <Link
        to="/signup"
        data-mol-id="nav-create-account"
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          'rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity',
        )}
      >
        {t('login.createAccount', {}, { defaultValue: 'Create a workspace' })}
      </Link>
    </div>
  )
}

export function UserMenu() {
  const isAuthenticated = useIsAuthenticated()
  if (!isAuthenticated) return <SignedOutLinks />
  return (
    <MoleculeUserMenu>
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
