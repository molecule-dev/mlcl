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
 * Sidebar-resident account card — composes the shared `UserMenuPopover`
 * family (inline popover that auto-dismisses on route change, `popstate`,
 * outside click, and `Escape`).
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
    <UserMenuPopover guestName={t('userMenu.guestName', {}, { defaultValue: 'Analyst' })}>
      <UserMenuPopoverTrigger ariaLabelDefault="Open account menu" />
      <UserMenuPopoverPanel
        className={cm.cn(cm.sp('p', 5), 'left-0 w-72 bg-surface-container-low shadow-lg')}
      >
        <Link to="/settings" className={navItemClass}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </Link>
        <Link to="/datasets" className={navItemClass}>
          {t('userMenu.datasets', {}, { defaultValue: 'My datasets' })}
        </Link>
        <UserMenuPopoverSignOut />
      </UserMenuPopoverPanel>
    </UserMenuPopover>
  )
}

export default UserMenu
