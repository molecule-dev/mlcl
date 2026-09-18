import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PennantBrandMark } from './PennantBrandMark.js'
import { UserMenu } from './UserMenu.js'

/**
 * Top nav + sidebar + main shell shared by every authenticated Pennant
 * page. Mirrors database-admin's DatabaseAdminLayout terminal-aesthetic
 * shape (dark sidebar with mono nav links + active emerald accent +
 * top action / search bar) recoloured to Pennant emerald per
 * DESIGN.md "Side Navigation".
 */

interface NavItem {
  to: string
  labelKey: string
  defaultLabel: string
  icon: string
  match: (path: string) => boolean
}

const NAV_ITEMS: readonly NavItem[] = [
  {
    to: '/dashboard',
    labelKey: 'nav.dashboard',
    defaultLabel: 'Dashboard',
    icon: 'dashboard',
    match: (p) => p.startsWith('/dashboard'),
  },
  {
    to: '/flags',
    labelKey: 'nav.flags',
    defaultLabel: 'Flags',
    icon: 'flag',
    match: (p) => p.startsWith('/flags'),
  },
  {
    to: '/segments',
    labelKey: 'nav.segments',
    defaultLabel: 'Segments',
    icon: 'group',
    match: (p) => p.startsWith('/segments'),
  },
  {
    to: '/environments',
    labelKey: 'nav.environments',
    defaultLabel: 'Environments',
    icon: 'cloud',
    match: (p) => p.startsWith('/environments'),
  },
  {
    to: '/audit',
    labelKey: 'nav.audit',
    defaultLabel: 'Audit log',
    icon: 'history',
    match: (p) => p.startsWith('/audit'),
  },
  {
    to: '/settings',
    labelKey: 'nav.settings',
    defaultLabel: 'Settings',
    icon: 'settings',
    match: (p) => p.startsWith('/settings'),
  },
] as const

interface LayoutProps {
  /** Optional override for the inline route content (defaults to <Outlet />). */
  children?: ReactNode
}

export function FeatureFlagManagerLayout({ children }: LayoutProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<{ email?: string; name?: string }>()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [pinnedFlags, setPinnedFlags] = useState<readonly string[]>([])
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Hydrate the header search box from the URL when navigating to /flags
  // with a `?q=` so the visible value reflects the active filter.
  useEffect(() => {
    const params = new URLSearchParams(search)
    const q = params.get('q') ?? ''
    setSearchQuery(q)
  }, [search])

  // "/" focuses the header search input (matches the `/` hint badge).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/') return
      const target = e.target as HTMLElement | null
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target?.isContentEditable ?? false)
      if (isEditable) return
      e.preventDefault()
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const submitSearch = (q: string) => {
    const trimmed = q.trim()
    const target = trimmed ? `/flags?q=${encodeURIComponent(trimmed)}` : '/flags'
    navigate(target)
  }

  // Pinned flags are the most-recently-updated 3 flag keys. We pull the
  // live list from /api/flags so this section never points at flags
  // that don't exist (the previous hardcoded list could 404).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await http.get<Array<{ key: string; updated_at?: string }>>('/api/flags')
        if (cancelled) return
        const arr = Array.isArray(res.data) ? res.data : []
        const sorted = [...arr].sort((a, b) => {
          const ta = a.updated_at ? Date.parse(a.updated_at) : 0
          const tb = b.updated_at ? Date.parse(b.updated_at) : 0
          return tb - ta
        })
        setPinnedFlags(sorted.slice(0, 3).map((f) => f.key))
      } catch (_error) {
        // The sidebar should never block render if /api/flags is
        // momentarily unreachable — leave the section empty.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, pathname])

  const userEmail = user?.email ?? user?.name ?? 'admin@acme.com'

  return (
    <div
      data-mol-id="feature-flag-manager-layout"
      className={cm.cn('flex min-h-screen antialiased font-body')}
      style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text-code)' }}
    >
      {/* Sidebar */}
      <aside
        className={cm.cn('hidden md:flex flex-col shrink-0 sticky top-0 h-screen')}
        style={{
          width: 260,
          backgroundColor: 'var(--color-background-secondary)',
          borderRight: '1px solid rgba(30, 41, 59, 0.7)',
        }}
      >
        <Link
          to="/dashboard"
          className={cm.cn('flex items-center gap-2 px-5 py-5 border-b')}
          style={{ borderColor: 'rgba(30, 41, 59, 0.7)' }}
        >
          <PennantBrandMark size="md" showPulse />
        </Link>

        <nav
          className={cm.cn('flex flex-col py-4 gap-0.5')}
          aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
        >
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cm.cn(
                  'mx-3 flex items-center gap-3 rounded-md px-3 py-2 font-mono text-xs uppercase tracking-widest transition-colors',
                  active
                    ? 'font-bold'
                    : 'text-on-surface-variant hover:bg-surface/5 hover:text-on-surface',
                )}
                style={
                  active
                    ? {
                        backgroundColor: 'var(--color-emerald-chip-bg)',
                        color: 'var(--color-env-filter-active-text)',
                      }
                    : undefined
                }
                data-mol-id={`nav-${item.to.slice(1).replace(/\//g, '-')}`}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                  {item.icon}
                </span>
                {t(`layout.${item.labelKey}`, {}, { defaultValue: item.defaultLabel })}
              </NavLink>
            )
          })}
        </nav>

        <div className={cm.cn('flex-1')} />

        {/* Pinned recent flags — sourced from live /api/flags so links never 404. */}
        {pinnedFlags.length > 0 && (
          <div
            className={cm.cn('px-5 py-4 border-t')}
            style={{ borderColor: 'rgba(30, 41, 59, 0.7)' }}
          >
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
              )}
            >
              {t('layout.pinned', {}, { defaultValue: 'Pinned' })}
            </p>
            <ul className={cm.cn('space-y-1.5')}>
              {pinnedFlags.map((flag) => (
                <li key={flag}>
                  <Link
                    to={`/flags/${flag}`}
                    className={cm.cn(
                      'flex items-center gap-2 font-mono text-xs text-on-surface hover:text-primary transition-colors min-w-0',
                    )}
                  >
                    <span
                      className={cm.cn('h-1.5 w-1.5 rounded-full shrink-0')}
                      style={{
                        backgroundColor: 'var(--color-primary)',
                        boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
                      }}
                      aria-hidden="true"
                    />
                    <span className={cm.cn('truncate')}>{flag}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div
          className={cm.cn('flex items-center gap-3 px-5 py-4 border-t')}
          style={{ borderColor: 'rgba(30, 41, 59, 0.7)' }}
        >
          <span
            className={cm.cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-bold shrink-0',
            )}
            style={{
              backgroundColor: 'var(--color-env-filter-active-bg)',
              color: 'var(--color-primary-hover)',
            }}
            aria-hidden="true"
          >
            {userEmail.charAt(0).toUpperCase()}
          </span>
          <div className={cm.cn('min-w-0 flex-1')}>
            <span className={cm.cn('block text-sm font-medium truncate')}>{userEmail}</span>
            <span className={cm.cn('font-mono text-[10px] text-on-surface-variant')}>
              {t('layout.adminRole', {}, { defaultValue: 'Admin · acme' })}
            </span>
          </div>
          <UserMenu />
        </div>
      </aside>

      {/* Main column */}
      <div className={cm.cn('flex flex-1 flex-col min-w-0')}>
        <header
          className={cm.cn('sticky top-0 z-10 flex h-12 items-center gap-3 px-5 backdrop-blur-md')}
          style={{
            backgroundColor: 'rgba(17, 24, 39, 0.85)',
            borderBottom: '1px solid rgba(30, 41, 59, 0.7)',
          }}
        >
          <div className={cm.cn('md:hidden')}>
            <PennantBrandMark size="sm" />
          </div>
          <div className={cm.cn('relative flex-1 max-w-xl')}>
            <span
              className={cm.cn(
                'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base',
              )}
              aria-hidden="true"
            >
              search
            </span>
            <input
              ref={searchInputRef}
              type="search"
              placeholder={t(
                'layout.searchPlaceholder',
                {},
                { defaultValue: 'Search flags by key or name...' },
              )}
              className={cm.cn(
                'h-8 w-full rounded-md pl-9 pr-12 font-mono text-sm transition-colors',
              )}
              style={{
                backgroundColor: 'var(--color-background-tertiary)',
                border: '1px solid rgba(30, 41, 59, 0.8)',
                color: 'var(--color-text-code)',
              }}
              aria-label={t('layout.searchAria', {}, { defaultValue: 'Search flags' })}
              data-mol-id="layout-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submitSearch(searchQuery)
                } else if (e.key === 'Escape') {
                  setSearchQuery('')
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
            />
            <span
              className={cm.cn(
                'absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded font-mono text-[10px] font-bold px-1.5 py-0.5',
              )}
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                color: 'var(--color-text-secondary)',
              }}
              aria-hidden="true"
            >
              /
            </span>
          </div>
          <Link
            to="/flags/new"
            className={cm.cn(
              'hidden sm:inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-bold transition-colors',
            )}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-on-primary-cta)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
              add
            </span>
            {t('layout.newFlag', {}, { defaultValue: 'New flag' })}
          </Link>
        </header>

        <main className={cm.cn('flex-1 px-5 py-6 md:px-8 md:py-8')}>{children ?? <Outlet />}</main>
      </div>
    </div>
  )
}
