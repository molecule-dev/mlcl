import { useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SafeLink } from './SafeLink.js'

const ITEMS = [
  { to: '/dashboard', icon: 'dashboard', key: 'nav.dashboard', fallback: 'Dashboard' },
  { to: '/issues', icon: 'mail', key: 'sideNavBar.issues', fallback: 'Issues' },
  { to: '/subscribers', icon: 'group', key: 'sideNavBar.subscribers', fallback: 'Subscribers' },
  { to: '/settings', icon: 'settings', key: 'nav.settings', fallback: 'Settings' },
]

/**
 * MobileNavBar — bottom tab navigation shown ONLY below the md breakpoint,
 * where the fixed 240px SideNavBar is hidden (it would cover two thirds of a
 * 390px screen). Rendered alongside SideNavBar / SettingsSideNavBar so every
 * authed page keeps primary navigation reachable on phones; hidden on md+
 * where the sidebar takes over. Full-height SafeLink rows keep the tap
 * targets at 64px.
 */
function MobileNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  return (
    <nav
      aria-label={t('sideNavBar.primary', {}, { defaultValue: 'Primary' })}
      className={cm.cn(
        cm.flex({ align: 'center' }),
        'md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-surface/95 backdrop-blur-md border-t border-outline-variant',
      )}
    >
      {ITEMS.map((item) => {
        const active = item.to === '/issues' ? pathname.startsWith('/issues') : pathname === item.to
        return (
          <SafeLink
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
              cm.flex1,
              cm.h('full'),
              'gap-1',
              active ? 'text-primary' : 'text-on-surface-variant',
            )}
          >
            <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>
              {item.icon}
            </span>
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))}>
              {t(item.key, {}, { defaultValue: item.fallback })}
            </span>
          </SafeLink>
        )
      })}
    </nav>
  )
}

export default MobileNavBar
export { MobileNavBar }
