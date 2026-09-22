import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-react'

import { SettingsPanel } from './SettingsPanel.js'

function UserMenuPanel() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const close = usePanelClose()
  return (
    <>
      <div className={cm.cn(cm.sp('px', 6), cm.sp('pt', 6))}>
        <Link
          to="/settings"
          onClick={close}
          data-mol-id="user-menu-settings-link"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-primary hover:underline',
          )}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden>
            tune
          </span>
          {t('userMenu.marketplaceSettings', {}, { defaultValue: 'Marketplace settings' })}
        </Link>
      </div>
      <SettingsPanel onClose={close} />
    </>
  )
}

export function UserMenu() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  // Public pages (Catalog, product/vendor pages, About, Terms, Privacy)
  // share this header — give logged-out visitors auth entry points instead
  // of an account panel they can't use.
  if (!isAuthenticated) {
    return (
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        <Link
          to="/login"
          data-mol-id="nav-sign-in"
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'min-h-[40px] text-on-surface-variant hover:text-primary transition-colors',
          )}
        >
          {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </Link>
        <Link
          to="/signup"
          data-mol-id="nav-create-account"
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            cm.roundedFull,
            'min-h-[40px] bg-primary text-on-primary hover:bg-primary-dark transition-colors',
          )}
        >
          {t('landing.nav.signUp', {}, { defaultValue: 'Join' })}
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
