import type { ReactNode } from 'react'
import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SafeLink } from './SafeLink.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

interface Crumb {
  label: string
  to?: string
}

interface SiftCrumbsProps {
  /** Override breadcrumbs shown in the top bar. */
  crumbs?: Crumb[]
}

/**
 * Breadcrumb trail — rendered as the `brand` slot of the shell TopBar.
 * The hamburger trigger is GONE: `ResponsiveAppShell.TopBar` renders the
 * mobile menu trigger itself when a Drawer is part of the composition.
 */
export function SiftCrumbs({ crumbs }: SiftCrumbsProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const trail = crumbs && crumbs.length > 0 ? crumbs : inferCrumbs(pathname, t)

  return (
    <nav
      className={cm.cn(
        cm.flex({ align: 'center' }),
        'gap-2 text-sm font-medium font-inter min-w-0',
      )}
      aria-label={t('topbar.breadcrumbs', {}, { defaultValue: 'Breadcrumbs' })}
    >
      {trail.map((crumb, idx) => {
        const isLast = idx === trail.length - 1
        return (
          <span key={`${crumb.label}-${idx}`} className={cm.flex({ align: 'center' })}>
            {idx > 0 && <span className={cm.cn('mx-2 text-foreground-tertiary')}>/</span>}
            {!isLast && crumb.to ? (
              <SafeLink
                to={crumb.to}
                className={cm.cn(
                  'text-foreground-secondary hover:text-primary transition-colors whitespace-nowrap',
                )}
              >
                {crumb.label}
              </SafeLink>
            ) : (
              <span
                className={cm.cn(
                  'text-primary font-bold border-b-2 border-primary pb-5 truncate max-w-[38vw] md:max-w-none',
                )}
              >
                {crumb.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

interface SiftTopBarActionsProps {
  /** Right-side actions (e.g. filter toggle, "New rule" button). */
  actions?: ReactNode
  /** Show the search input on the left of actions. */
  showSearch?: boolean
}

/**
 * Trailing top-bar content — search, page actions, notifications, theme and
 * user menu — rendered as the `actions` slot of the shell TopBar.
 */
export function SiftTopBarActions({ actions, showSearch = true }: SiftTopBarActionsProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')

  return (
    <>
      {showSearch && (
        <form
          role="search"
          className={cm.cn('relative hidden md:block')}
          onSubmit={(event) => {
            event.preventDefault()
            const q = query.trim()
            navigate(q ? `/queue?q=${encodeURIComponent(q)}` : '/queue')
          }}
        >
          <span
            aria-hidden="true"
            className={cm.cn(
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary text-[20px] pointer-events-none',
            )}
          >
            search
          </span>
          <input
            type="search"
            data-mol-id="topbar-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t(
              'topbar.searchHint',
              {},
              { defaultValue: 'Search queue, rules, users…' },
            )}
            aria-label={t('common.search', {}, { defaultValue: 'Search' })}
            className={cm.cn(
              'pl-10 pr-4 py-2 bg-surface-container-low border-b-2 border-transparent focus:border-primary outline-none text-sm w-40 lg:w-64 transition-colors font-inter text-on-surface rounded-md',
            )}
          />
        </form>
      )}
      {actions}
      <SafeLink
        to="/notifications"
        data-mol-id="nav-notifications"
        className={cm.cn('text-foreground-secondary hover:text-primary transition-colors p-1')}
        aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
      >
        <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-[22px]')}>
          notifications
        </span>
      </SafeLink>
      <ThemeToggle />
      <UserMenu />
    </>
  )
}

function inferCrumbs(pathname: string, t: ReturnType<typeof useTranslation>['t']): Crumb[] {
  const root: Crumb = {
    label: t('sidebar.brand', { appName: APP_NAME }, { defaultValue: '{{appName}} Console' }),
    to: '/dashboard',
  }
  if (pathname === '/dashboard') {
    return [root, { label: t('nav.dashboard', {}, { defaultValue: 'Dashboard' }) }]
  }
  if (pathname.startsWith('/queue')) {
    const trail: Crumb[] = [
      root,
      { label: t('sidebar.queue', {}, { defaultValue: 'Queue' }), to: '/queue' },
    ]
    if (pathname !== '/queue') {
      trail.push({
        label: t('topbar.review', {}, { defaultValue: 'Review' }),
      })
    }
    return trail
  }
  if (pathname.startsWith('/rules')) {
    return [root, { label: t('sidebar.rules', {}, { defaultValue: 'Rules' }) }]
  }
  if (pathname.startsWith('/analytics')) {
    return [root, { label: t('nav.analytics', {}, { defaultValue: 'Analytics' }) }]
  }
  if (pathname.startsWith('/settings')) {
    return [root, { label: t('nav.settings', {}, { defaultValue: 'Settings' }) }]
  }
  if (pathname.startsWith('/profile')) {
    return [root, { label: t('nav.profile', {}, { defaultValue: 'Profile' }) }]
  }
  if (pathname.startsWith('/notifications')) {
    return [root, { label: t('settings.notifications', {}, { defaultValue: 'Notifications' }) }]
  }
  return [root]
}
