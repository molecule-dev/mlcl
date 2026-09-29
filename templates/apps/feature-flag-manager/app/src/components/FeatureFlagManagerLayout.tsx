import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

/**
 * Top nav + sidebar + main shell shared by every authenticated Pennant
 * page — the shared `ResponsiveAppShell` composed the fleet-canonical way:
 * the brand leads the desktop Sidebar, the mobile-only TopBar carries the
 * small brand + the drawer menu trigger (rendered by the shell), and the
 * SAME nav element is passed to `.Sidebar` and `.Drawer` so only the
 * mounted breakpoint's copy ever instantiates (no duplicate `nav-*`
 * data-mol-ids or landmarks). The drawer is the shell's full APG dialog
 * (focus trap, Escape/backdrop close, scroll lock, auto-close on
 * navigation) — the former hand-rolled mobile chip-row nav is deleted with
 * it. Pennant's darker rail is preserved through the sanctioned
 * tailwind-merge className extension point; the desktop search header
 * stays as content-column chrome (`hidden md:flex` — the drawer carries
 * search on mobile, a non-duplicating surface swap).
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

/** Pennant's sidebar rail — one step lighter than the page canvas. */
const RAIL_BG = 'bg-[var(--color-background-secondary)]'

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

  const navLabel = t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })

  // ONE nav element for both breakpoints — the Sidebar (≥768px) and the
  // Drawer (<768px) each render it, but only the mounted breakpoint's copy
  // instantiates. The drawer closes itself on navigation (shell-owned), so
  // links carry no onClick close.
  const nav = (
    <div className={cm.cn('flex flex-col gap-0.5 py-4')}>
      {NAV_ITEMS.map((item) => {
        const active = item.match(pathname)
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={cm.cn(
              'mx-3 flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2 font-mono text-xs uppercase tracking-widest transition-colors',
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
            aria-current={active ? 'page' : undefined}
            data-mol-id={`nav-${item.to.slice(1).replace(/\//g, '-')}`}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
              {item.icon}
            </span>
            {t(`layout.${item.labelKey}`, {}, { defaultValue: item.defaultLabel })}
          </NavLink>
        )
      })}
    </div>
  )

  // Brand — the bordered wordmark leads the desktop Sidebar and rides the
  // Drawer header; the compact mark lives in the mobile-only TopBar.
  // Breakpoint-exclusive mounts, so never duplicated.
  const sidebarBrand = (
    <Link
      to="/dashboard"
      className={cm.cn('flex items-center gap-2 px-5 py-5 border-b')}
      style={{ borderColor: 'rgba(30, 41, 59, 0.7)' }}
    >
      <BrandWordmark as="span" size="md" pulse />
    </Link>
  )

  const mobileBrand = (
    <Link to="/dashboard" className={cm.cn('flex items-center')}>
      <BrandWordmark as="span" size="sm" />
    </Link>
  )

  // Search — the desktop header carries the field (the `/` hotkey targets
  // it); the drawer renders its own drawer-only form, so exactly one search
  // input is visible per width and the ref never has two owners.
  const searchField = (
    <div className={cm.cn('relative w-full')}>
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
        className={cm.cn('h-8 w-full rounded-md pl-9 pr-12 font-mono text-sm transition-colors')}
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
          'absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded px-1.5 py-0.5 font-mono text-[10px] font-bold',
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
  )

  // Drawer-only search — the drawer mounts only while open (<768px), where
  // the desktop header field is display:none, so the two never compete.
  const drawerSearch = (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        submitSearch(searchQuery)
      }}
      className={cm.cn('mx-3 mb-3 flex items-center gap-2 rounded-md px-3')}
      style={{
        backgroundColor: 'var(--color-background-tertiary)',
        border: '1px solid rgba(30, 41, 59, 0.8)',
      }}
    >
      <span
        className={cm.cn('material-symbols-outlined text-base text-on-surface-variant')}
        aria-hidden="true"
      >
        search
      </span>
      <input
        type="search"
        placeholder={t(
          'layout.searchPlaceholder',
          {},
          { defaultValue: 'Search flags by key or name...' },
        )}
        className={cm.cn('h-10 w-full bg-transparent font-mono text-sm outline-none')}
        aria-label={t('layout.searchAria', {}, { defaultValue: 'Search flags' })}
        data-mol-id="drawer-search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </form>
  )

  const newFlagLink = (
    <Link
      to="/flags/new"
      className={cm.cn(
        'hidden items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-bold transition-colors sm:inline-flex',
      )}
      style={{
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-on-primary-cta)',
      }}
      data-mol-id="layout-new-flag"
    >
      <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
        add
      </span>
      {t('layout.newFlag', {}, { defaultValue: 'New flag' })}
    </Link>
  )

  // Pinned recent flags — sourced from live /api/flags so links never 404.
  // Desktop-only (Sidebar footer); the pre-migration mobile shell never
  // carried it either.
  const pinnedSection =
    pinnedFlags.length > 0 ? (
      <div className={cm.cn('mb-2')}>
        <p
          className={cm.cn(
            'mb-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
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
                  'flex min-h-[28px] items-center gap-2 font-mono text-xs text-on-surface hover:text-primary transition-colors min-w-0',
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
    ) : null

  const userCard = (
    <div className={cm.cn('flex items-center gap-3')}>
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
        <span className={cm.cn('block truncate text-sm font-medium')}>{userEmail}</span>
        <span className={cm.cn('font-mono text-[10px] text-on-surface-variant')}>
          {t('layout.adminRole', {}, { defaultValue: 'Admin · acme' })}
        </span>
      </div>
      <UserMenu />
    </div>
  )

  return (
    <ResponsiveAppShell
      sidebarWidth={260}
      dataMolId="feature-flag-manager-layout"
      className={cm.cn('antialiased font-body')}
    >
      {/*
        Mobile top bar (<768px): the shell renders the 44px menu trigger
        itself; brand + New-flag CTA keep their pre-migration slots. On
        desktop this bar does not mount — the sidebar carries the chrome.
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        className={cm.cn(RAIL_BG)}
        brand={mobileBrand}
        actions={newFlagLink}
      />

      {/*
        Desktop sidebar (≥768px): the bordered brand row leads the nav column
        (the shared Sidebar has no header slot, so it rides inside `children`),
        with pinned flags + the user card in the bordered footer row.
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        className={cm.cn(RAIL_BG)}
        footer={
          <>
            {pinnedSection}
            {userCard}
          </>
        }
      >
        {sidebarBrand}
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): the full dialog panel (focus trap, Escape,
        backdrop click, body-scroll lock) over the same nav, with the search
        above it and the user affordances in the footer.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navLabel}
        className={cm.cn(RAIL_BG)}
        header={mobileBrand}
        footer={
          <span className={cm.cn('inline-flex [&_button]:min-h-[44px] [&_button]:min-w-[44px]')}>
            {userCard}
          </span>
        }
      >
        <div className={cm.cn('pt-3')}>{drawerSearch}</div>
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        {/*
          Desktop search header — content-column chrome the drawer replaces
          on mobile (non-duplicating CSS swap: exactly one search field is
          visible per width).
        */}
        <header
          className={cm.cn(
            'sticky top-0 z-10 hidden h-12 items-center gap-3 px-5 backdrop-blur-md md:flex',
          )}
          style={{
            backgroundColor: 'rgba(17, 24, 39, 0.85)',
            borderBottom: '1px solid rgba(30, 41, 59, 0.7)',
          }}
        >
          <div className={cm.cn('max-w-xl flex-1')}>{searchField}</div>
          {newFlagLink}
        </header>

        {/* Page padding wraps the routed content — `.Content` stays a bare <main>. */}
        <div className={cm.cn('px-5 py-6 md:px-8 md:py-8')}>{children ?? <Outlet />}</div>
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
