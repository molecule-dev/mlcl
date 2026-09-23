import { Link, useLocation } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Template-local mobile navigation — the fleet's mobile-shell pattern.
 *
 * The shared AppHeader renders only brand + actions (theme, language, user
 * menu): it has NO nav links at any breakpoint, and section moves (search →
 * sessions → messages → account) otherwise depend on in-page links that
 * disappear once you leave a page. Below `md` (768px) this renders a
 * horizontally scrollable chip row pinned under the fixed 50px header; on
 * `md`+ the flagship pages carry their own in-content navigation, so it
 * hides. Authed destinations only appear once a user is signed in — the
 * AuthGuard would bounce an anonymous visitor to /login anyway.
 */

type NavItem = {
  to: string
  labelKey: string
  label: string
  icon: string
  auth?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/search', labelKey: 'nav.search', label: 'Search', icon: 'search' },
  {
    to: '/dashboard',
    labelKey: 'nav.dashboard',
    label: 'Dashboard',
    icon: 'space_dashboard',
    auth: true,
  },
  {
    to: '/sessions',
    labelKey: 'nav.sessions',
    label: 'Sessions',
    icon: 'event_available',
    auth: true,
  },
  { to: '/messages', labelKey: 'nav.messages', label: 'Messages', icon: 'chat', auth: true },
  { to: '/pricing', labelKey: 'nav.pricing', label: 'Pricing', icon: 'sell' },
]

export function MobileNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const location = useLocation()
  const items = NAV_ITEMS.filter((item) => !item.auth || !!user)
  if (items.length === 0) return null
  return (
    <nav
      aria-label={t('nav.primary', {}, { defaultValue: 'Primary' })}
      data-mol-id="mobile-nav"
      className={cm.cn(
        'md:hidden sticky top-0 z-30 bg-surface-container/95 backdrop-blur border-b border-outline-variant/20',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          'overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {items.map((item) => {
          const active =
            location.pathname === item.to || location.pathname.startsWith(item.to + '/')
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'shrink-0 items-center rounded-full px-4 min-h-[40px] whitespace-nowrap transition-colors',
                active
                  ? 'text-on-primary'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface',
              )}
              style={active ? { backgroundColor: 'var(--mol-color-primary)' } : undefined}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-lg')}>
                {item.icon}
              </span>
              {t(item.labelKey, {}, { defaultValue: item.label })}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
