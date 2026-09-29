import { Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { SafeLink } from './SafeLink.js'

interface NavItem {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
}

const PRIMARY_ITEMS: NavItem[] = [
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

const SECONDARY_ITEMS: NavItem[] = [
  { to: '/settings', icon: 'settings', labelKey: 'simmer.nav.settings', defaultLabel: 'Settings' },
]

/**
 * Brand-consistent classes for Simmer's nav links — green pill for the active
 * route, hover tint otherwise.
 */
function navItemClass(cm: ReturnType<typeof getClassMap>, active: boolean): string {
  return cm.cn(
    cm.flex({ align: 'center', gap: 'sm' }),
    cm.sp('px', 4),
    cm.sp('py', 3),
    'rounded-xl transition-colors duration-200 active:scale-95',
    active
      ? 'bg-primary text-white font-semibold shadow-sm'
      : 'text-on-surface hover:bg-primary-container/50',
  )
}

/**
 * A nav link list (primary or secondary) — the same component element serves
 * the desktop Sidebar and the mobile Drawer; the shell mounts only the
 * breakpoint's copy, so the links are never duplicated in the DOM. Marking
 * the current item is the consumer's job: `aria-current="page"` on the
 * active route (exact or child-prefix match).
 */
function SimmerNavLinks({ items }: { items: NavItem[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`)

  return (
    <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'list-none')}>
      {items.map((item) => {
        const active = isActive(item.to)
        return (
          <li key={item.to}>
            <SafeLink
              to={item.to}
              data-mol-id={`mobile-nav-${item.to.replace(/\//g, '')}`}
              aria-current={active ? 'page' : undefined}
              className={navItemClass(cm, active)}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                {item.icon}
              </span>
              <span>{t(item.labelKey, {}, { defaultValue: item.defaultLabel })}</span>
            </SafeLink>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * The brand lockup + nav motto — the desktop Sidebar's brand block and the
 * mobile Drawer's header row (only the mounted breakpoint instantiates it).
 */
function SimmerBrand() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <SafeLink
      to="/plan"
      data-mol-id="nav-brand"
      className={cm.cn(cm.sp('px', 2), cm.sp('mb', 6), 'block')}
    >
      <BrandWordmark as="span" />
      <span
        className={cm.cn(
          cm.textSize('xs'),
          'block text-primary/70 font-medium tracking-wide uppercase mt-1',
        )}
      >
        {t('simmer.nav.tagline', {}, { defaultValue: 'Plan · Shop · Cook' })}
      </span>
    </SafeLink>
  )
}

/**
 * Layout wrapper for Simmer's signed-in routes — the shared
 * `ResponsiveAppShell`. It owns the breakpoint split: the Sidebar mounts only
 * ≥768px (brand + nav, Settings in the footer row), the mobile Drawer (same
 * nav element, full dialog contract — focus trap, Escape/backdrop close,
 * scroll lock, auto-close on navigation) only below it, and the mobile-only
 * TopBar renders the menu trigger itself. Page padding stays on the content
 * `<main>`; pages render their own SimmerTopBar inside the canvas.
 */
export function SimmerAppShell() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navLabel = t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })

  return (
    <ResponsiveAppShell sidebarWidth="md" className="text-on-surface antialiased">
      {/* Mobile-only: carries the drawer trigger + brand; the desktop brand
          lives in the Sidebar and pages render their own headers. */}
      <ResponsiveAppShell.TopBar mobileOnly brand={<BrandWordmark as="span" />} />
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        footer={<SimmerNavLinks items={SECONDARY_ITEMS} />}
      >
        <SimmerBrand />
        <SimmerNavLinks items={PRIMARY_ITEMS} />
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer
        navLabel={navLabel}
        header={<SimmerBrand />}
        footer={<SimmerNavLinks items={SECONDARY_ITEMS} />}
      >
        <SimmerNavLinks items={PRIMARY_ITEMS} />
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.sp('p', 4),
          'md:p-8 tabular-nums',
        )}
      >
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
