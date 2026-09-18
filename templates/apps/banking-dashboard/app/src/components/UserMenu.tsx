import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import {
  UserMenuPopover,
  UserMenuPopoverPanel,
  UserMenuPopoverSignOut,
  UserMenuPopoverTrigger,
} from '@molecule/app-ui-react'

/**
 * Sidebar user menu — composes the shared `UserMenuPopover` family: an
 * inline (non-modal) popover that auto-dismisses on route change,
 * `popstate`, outside click, and `Escape`, so it never leaves an overlay
 * covering the page after an SPA navigation.
 */
export function UserMenu() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navItemClass = cm.cn(
    cm.sp('px', 3),
    cm.sp('py', 2),
    cm.textSize('sm'),
    'block rounded-md hover:bg-surface-container',
  )
  return (
    <UserMenuPopover guestName={t('userMenu.guest', {}, { defaultValue: 'Account holder' })}>
      <UserMenuPopoverTrigger />
      <UserMenuPopoverPanel
        className={cm.cn(cm.sp('p', 3), 'left-0 right-0 bg-surface-container-lowest shadow-xl')}
      >
        <Link to="/settings" className={navItemClass}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </Link>
        <Link to="/audit" className={navItemClass}>
          {t('nav.auditLog', {}, { defaultValue: 'Audit log' })}
        </Link>
        <Link to="/pricing" className={navItemClass}>
          {t('nav.pricing', {}, { defaultValue: 'Pricing & plans' })}
        </Link>
        <UserMenuPopoverSignOut />
      </UserMenuPopoverPanel>
    </UserMenuPopover>
  )
}
