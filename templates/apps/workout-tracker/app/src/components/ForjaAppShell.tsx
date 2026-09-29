import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_TAGLINE } from '../branding.js'
import { useWeightPreference } from '../lib/weight.js'
import { BrandWordmark } from './BrandWordmark.js'

interface NavItem {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
  filledIcon?: boolean
}

const PRIMARY_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    icon: 'dashboard',
    labelKey: 'forja.nav.dashboard',
    defaultLabel: 'Dashboard',
  },
  {
    to: '/workout/active',
    icon: 'fitness_center',
    labelKey: 'forja.nav.activeWorkout',
    defaultLabel: 'Active Workout',
    filledIcon: true,
  },
  {
    to: '/exercises',
    icon: 'sports_gymnastics',
    labelKey: 'forja.nav.exercises',
    defaultLabel: 'Exercises',
  },
  {
    to: '/templates',
    icon: 'list_alt',
    labelKey: 'forja.nav.templates',
    defaultLabel: 'Templates',
  },
  { to: '/history', icon: 'event_note', labelKey: 'forja.nav.history', defaultLabel: 'History' },
  { to: '/records', icon: 'emoji_events', labelKey: 'forja.nav.records', defaultLabel: 'Records' },
  {
    to: '/measurements',
    icon: 'monitor_weight',
    labelKey: 'forja.nav.measurements',
    defaultLabel: 'Measurements',
  },
]

const SECONDARY_ITEMS: NavItem[] = [
  { to: '/settings', icon: 'settings', labelKey: 'forja.nav.settings', defaultLabel: 'Settings' },
]

/**
 * A Forja nav link list (primary or secondary) — the SAME element serves the
 * desktop Sidebar (≥768px) and the mobile Drawer (<768px); only the mounted
 * breakpoint instantiates it, so the links are never duplicated in the DOM.
 * Marking the current item is the consumer's job: `aria-current="page"` on
 * the active route (exact or child-prefix match).
 */
function ForjaNavLinks({ items }: { items: NavItem[] }) {
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
            <Link
              to={item.to}
              data-mol-id={`mobile-nav-${item.icon}`}
              aria-current={active ? 'page' : undefined}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl transition-colors duration-200 active:scale-95',
                active
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'text-white/80 font-medium hover:bg-surface/5 hover:text-white',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn('material-symbols-outlined text-[22px] shrink-0')}
                style={item.filledIcon ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span>{t(item.labelKey, {}, { defaultValue: item.defaultLabel })}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * The Forja wordmark + tagline — the Sidebar's brand block and the Drawer's
 * header row (only the mounted breakpoint instantiates it). The wordmark
 * itself renders through the shared BrandWordmark.
 */
function ForjaBrand() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <Link to="/dashboard" className={cm.cn(cm.sp('px', 2), cm.sp('mb', 6), 'block')}>
      <BrandWordmark as="span" size="lg" invert />
      <span
        className={cm.cn(
          cm.textSize('xs'),
          'block text-white/60 font-bold tracking-[0.18em] uppercase mt-1',
        )}
      >
        {t('forja.nav.tagline', {}, { defaultValue: APP_TAGLINE })}
      </span>
    </Link>
  )
}

/**
 * Layout wrapper for Forja's signed-in routes — the shared
 * `ResponsiveAppShell`. It owns the breakpoint split: the Sidebar mounts only
 * ≥768px (brand + primary nav, Settings in the footer row), the mobile Drawer
 * (same nav element, full dialog contract — focus trap, Escape/backdrop
 * close, scroll lock, auto-close on navigation) only below it, and the
 * mobile-only TopBar renders the menu trigger itself. Desktop keeps Forja's
 * charcoal accent chrome; pages render their own ForjaTopBar inside the
 * canvas with their own title and actions.
 */
export function ForjaAppShell() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navLabel = t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })
  // Load the weight-unit preference once for the whole signed-in tree; this
  // re-renders the pages when it resolves so kg/lbs displays pick it up.
  useWeightPreference()

  return (
    <ResponsiveAppShell
      sidebarWidth={260}
      className={cm.cn('bg-background text-on-surface antialiased')}
    >
      {/* Mobile-only: carries the drawer trigger + wordmark; the desktop brand
          lives in the Sidebar and pages render their own headers. */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        className={cm.cn('bg-accent text-white shadow-sm')}
        brand={<BrandWordmark to="/dashboard" size="sm" invert />}
      />
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        className={cm.cn('bg-accent text-white')}
        footer={<ForjaNavLinks items={SECONDARY_ITEMS} />}
      >
        <ForjaBrand />
        <ForjaNavLinks items={PRIMARY_ITEMS} />
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer
        navLabel={navLabel}
        header={<ForjaBrand />}
        className={cm.cn('h-full bg-accent text-white')}
        footer={<ForjaNavLinks items={SECONDARY_ITEMS} />}
      >
        <ForjaNavLinks items={PRIMARY_ITEMS} />
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.sp('p', 4),
          'md:p-8 tabular-nums max-w-[1200px]',
        )}
      >
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
