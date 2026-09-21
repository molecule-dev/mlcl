import { NavLink, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Mobile navigation for the signed-in crowdfunding shell (<1024px).
 *
 * The navy creator sidebar is hidden below `lg`, which left phones with NO
 * navigation at all — the top bar only carries the brand + theme toggle +
 * user menu. This fixed bottom tab bar is the fleet-standard mobile shell
 * for that gap: sticky, thumb-reachable, ~48px tap targets, active route
 * marked with aria-current, and safe-area padding so home-indicator
 * devices don't clip the labels. Backers and Settings stay reachable on
 * phones via CampaignManage and the user menu respectively.
 */
const MOBILE_NAV = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/discover', key: 'discover', defaultLabel: 'Discover', icon: 'explore', end: true },
  {
    to: '/campaign/new',
    key: 'newCampaign',
    defaultLabel: 'New campaign',
    icon: 'add_circle',
    end: true,
  },
  { to: '/my-pledges', key: 'myPledges', defaultLabel: 'Pledges', icon: 'favorite', end: true },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Alerts',
    icon: 'notifications',
    end: true,
  },
] as const

export function CreatorMobileNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <nav
      aria-label={t('creatorSidebar.label', {}, { defaultValue: 'Creator navigation' })}
      className={cm.cn(
        cm.flex({ align: 'stretch' }),
        cm.sp('px', 2),
        'fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-surface/95 backdrop-blur border-t border-outline-variant pb-[env(safe-area-inset-bottom)]',
      )}
      data-mol-id="creator-mobile-nav"
    >
      {MOBILE_NAV.map((item) => {
        const active = item.end ? pathname === item.to : pathname.startsWith(`${item.to}/`)
        return (
          <NavLink
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'xs' }),
              'flex-1 min-w-0 py-2 rounded-xl transition-colors active:scale-95',
              active ? 'text-primary font-semibold' : 'text-on-surface-variant font-medium',
            )}
            data-mol-id={`mobile-nav-${item.key}`}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-2xl leading-none')}
            >
              {item.icon}
            </span>
            <span className={cm.cn(cm.textSize('xs'), 'truncate max-w-full px-1')}>
              {t(`creatorSidebar.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}
