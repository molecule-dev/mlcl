import { useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SafeLink } from './SafeLink.js'

interface NavItem {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
}

const ITEMS: NavItem[] = [
  { to: '/plan', icon: 'calendar_month', labelKey: 'simmer.nav.plan', defaultLabel: 'This Week' },
  {
    to: '/recipes',
    icon: 'menu_book',
    labelKey: 'simmer.nav.recipes',
    defaultLabel: 'Recipes',
  },
  {
    to: '/groceries',
    icon: 'shopping_cart',
    labelKey: 'simmer.nav.groceries',
    defaultLabel: 'Grocery',
  },
  { to: '/pantry', icon: 'kitchen', labelKey: 'simmer.nav.pantry', defaultLabel: 'Pantry' },
]

/**
 * Bottom tab bar for Simmer's signed-in surfaces on small screens.
 *
 * The brand sidebar is `hidden md:flex`, so without this bar a phone has no
 * path to /plan, /groceries, or /pantry at all. Mirrors SimmerSidebar's
 * primary items with `data-mol-id="mobile-nav-…"` (distinct from the
 * sidebar's `nav-…` so locators never double-count across both bars).
 */
export function SimmerMobileNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`)

  return (
    <nav
      aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
      className={cm.cn(
        cm.flex({ align: 'center' }),
        cm.sp('px', 2),
        'fixed bottom-0 inset-x-0 z-30 md:hidden bg-surface-secondary/95 backdrop-blur border-t border-primary-container pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <ul className={cm.cn(cm.flex({ align: 'center' }), 'list-none w-full')}>
        {ITEMS.map((item) => {
          const active = isActive(item.to)
          return (
            <li key={item.to} className={cm.cn('flex-1')}>
              <SafeLink
                to={item.to}
                data-mol-id={`mobile-nav-${item.to.replace(/\//g, '')}`}
                aria-current={active ? 'page' : undefined}
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('py', 2),
                  'rounded-xl transition-colors duration-200 active:scale-95 min-h-[3.5rem]',
                  active
                    ? 'text-primary font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface',
                )}
              >
                <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-xl')}>
                  {item.icon}
                </span>
                <span className={cm.cn(cm.textSize('xs'))}>
                  {t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
                </span>
              </SafeLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
