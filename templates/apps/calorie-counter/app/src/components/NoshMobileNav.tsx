import { useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type NavItem, PRIMARY_ITEMS } from './NoshSidebar.js'
import { SafeLink } from './SafeLink.js'

/**
 * Mobile navigation for Nosh's signed-in surfaces (<768px).
 *
 * The desktop left rail (NoshSidebar) is hidden below md, which left phones
 * with NO navigation at all. This fixed bottom tab bar is the fleet-standard
 * mobile shell for that gap: sticky, thumb-reachable, ~48px tap targets,
 * active route highlighted with aria-current, and safe-area padding so
 * home-indicator devices don't clip the labels.
 */
export function NoshMobileNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`)

  const renderItem = (item: NavItem) => {
    const active = isActive(item.to)
    return (
      <SafeLink
        key={item.to}
        to={item.to}
        aria-current={active ? 'page' : undefined}
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'xs' }),
          'flex-1 min-w-0 py-2 rounded-xl transition-colors active:scale-95',
          active ? 'text-primary font-semibold' : 'text-on-surface-variant font-medium',
        )}
      >
        <span
          aria-hidden="true"
          className={cm.cn('material-symbols-outlined text-2xl leading-none')}
          style={item.filledIcon ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          {item.icon}
        </span>
        <span className={cm.cn(cm.textSize('xs'), 'truncate max-w-full px-1')}>
          {t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
        </span>
      </SafeLink>
    )
  }

  return (
    <nav
      aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
      className={cm.cn(
        cm.flex({ align: 'stretch' }),
        cm.sp('px', 2),
        'fixed bottom-0 left-0 right-0 z-30 md:hidden bg-surface-secondary/95 backdrop-blur border-t border-primary-container pb-[env(safe-area-inset-bottom)]',
      )}
    >
      {PRIMARY_ITEMS.map(renderItem)}
    </nav>
  )
}
