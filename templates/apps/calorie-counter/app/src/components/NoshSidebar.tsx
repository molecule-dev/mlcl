import { useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SafeLink } from './SafeLink.js'

/** Shared signed-in nav model — the shell's sidebar and drawer render the same set. */
export interface NavItem {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
  filledIcon?: boolean
}

export const PRIMARY_ITEMS: NavItem[] = [
  { to: '/today', icon: 'calendar_today', labelKey: 'nosh.nav.today', defaultLabel: 'Today' },
  {
    to: '/log',
    icon: 'add_circle',
    labelKey: 'nosh.nav.logFood',
    defaultLabel: 'Log Food',
    filledIcon: true,
  },
  { to: '/progress', icon: 'leaderboard', labelKey: 'nosh.nav.progress', defaultLabel: 'Progress' },
  { to: '/goals', icon: 'flag', labelKey: 'nosh.nav.goals', defaultLabel: 'Goals' },
  { to: '/recipes', icon: 'menu_book', labelKey: 'nosh.nav.recipes', defaultLabel: 'Recipes' },
  { to: '/weight', icon: 'monitor_weight', labelKey: 'nosh.nav.weight', defaultLabel: 'Weight' },
]

const SECONDARY_ITEMS: NavItem[] = [
  { to: '/settings', icon: 'settings', labelKey: 'nosh.nav.settings', defaultLabel: 'Settings' },
]

interface NoshBrandProps {
  /** Hide the tagline line (slim spots: the mobile top bar and drawer header). */
  showTagline?: boolean
  /** Extra classes on the brand link. */
  className?: string
}

/**
 * The Nosh wordmark (+ tagline) linking home.
 *
 * Fleet-canonical placement: the brand lives in the shell's Sidebar on
 * desktop and in the mobile-only TopBar / drawer header on phones.
 */
export function NoshBrand({ showTagline = true, className }: NoshBrandProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <SafeLink to="/today" className={cm.cn(cm.sp('px', 2), 'block', className)}>
      <span className={cm.cn(cm.fontWeight('bold'), 'text-2xl text-primary tracking-tight block')}>
        {APP_NAME}
      </span>
      {showTagline ? (
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'block text-primary/70 font-medium tracking-wide uppercase mt-1',
          )}
        >
          {t('nosh.nav.tagline', {}, { defaultValue: 'Friendly tracking' })}
        </span>
      ) : null}
    </SafeLink>
  )
}

function NoshNavList({ items }: { items: NavItem[] }) {
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
              aria-current={active ? 'page' : undefined}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl transition-colors duration-200 active:scale-95',
                active
                  ? 'bg-primary text-white font-semibold shadow-sm'
                  : 'text-on-surface hover:bg-primary-container/50',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn('material-symbols-outlined')}
                style={item.filledIcon ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
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
 * The signed-in primary nav content shared by the responsive shell's desktop
 * Sidebar and mobile Drawer — pass the SAME element to both so only the
 * mounted breakpoint instantiates it. Marking the current item is the
 * consumer's job (`aria-current="page"`), handled here per route.
 */
export function NoshNav() {
  const cm = getClassMap()

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.sp('p', 4), 'h-full')}>
      <NoshNavList items={PRIMARY_ITEMS} />
    </div>
  )
}

/**
 * The below-nav footer content (Settings) for the shell's sidebar and drawer
 * footer slots — same active-state treatment as the primary list.
 */
export function NoshNavFooter() {
  return <NoshNavList items={SECONDARY_ITEMS} />
}
