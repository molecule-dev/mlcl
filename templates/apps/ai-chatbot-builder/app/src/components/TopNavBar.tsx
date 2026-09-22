import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import MobileNavMenu, { useMainNavItems } from './MobileNavMenu.js'
import UserMenu from './UserMenu.js'
function TopNavBar() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const navItems = useMainNavItems()
  const { pathname } = useLocation()
  // Label for the section the visitor is currently on — TopNavBar is
  // shared by the dashboard and the public/content pages.
  const sectionLabels: Array<[string, string, string]> = [
    ['/notifications', 'settings.notifications', 'Notifications'],
    ['/help', 'help.title', 'Help & support'],
    ['/about', 'nav.about', 'About'],
    ['/pricing', 'nav.pricing', 'Pricing'],
    ['/terms', 'nav.terms', 'Terms'],
    ['/privacy', 'nav.privacy', 'Privacy'],
    ['/plan-updated', 'settings.billing', 'Billing'],
  ]
  const section = sectionLabels.find(([prefix]) => pathname.startsWith(prefix))
  const currentLabel = section
    ? t(section[1], {}, { defaultValue: section[2] })
    : t('nav.dashboard', {}, { defaultValue: 'Dashboard' })
  return (
    <header
      className={cm.cn(
        cm.h(16),
        cm.w('full'),
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        'sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4 min-w-0')}>
        {/* Mobile hamburger + drawer (fleet pattern) */}
        <MobileNavMenu items={navItems} />
        <Link
          to="/"
          className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground truncate')}
        >
          {t('topNavBar.brand', { appName: APP_NAME }, { defaultValue: '{{appName}} AI' })}
        </Link>
        <span className={cm.cn(cm.h(4), 'w-px', 'bg-outline-variant/30 hidden sm:block')}></span>
        <span
          aria-current="page"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.sp('py', 1),
            'tracking-wide text-indigo-600 border-b-2 border-indigo-600 truncate hidden sm:block',
          )}
        >
          {currentLabel}
        </span>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-6 shrink-0')}>
        <Link
          className={cm.cn(
            'px-4 py-1.5 text-sm font-semibold text-primary hover:bg-primary/5 rounded-lg transition-all hidden sm:block',
          )}
          to="/test-chat"
        >
          {t('topNavBar.test', {}, { defaultValue: 'Test' })}
        </Link>
        <Link
          className={cm.cn(
            'px-5 py-1.5 text-sm font-bold bg-gradient-to-r from-primary to-primary-container text-white rounded-lg shadow-sm hover:shadow-md transition-all',
          )}
          to="/bots"
        >
          {t('topNavBar.deploy', {}, { defaultValue: 'Deploy' })}
        </Link>
        <UserMenu />
      </div>
    </header>
  )
}

export default TopNavBar
export { TopNavBar }
