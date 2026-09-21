import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { SidebarUserCard, usePanelClose } from '@molecule/app-ui-react'

import { CommandHint } from './CommandHint.js'
import { QuarryBrandMark } from './QuarryBrandMark.js'
import { SettingsPanel } from './SettingsPanel.js'
import { StatusDot } from './StatusDot.js'

/**
 * Top nav + sidebar + main + status-bar shell shared by every
 * authenticated Quarry page (`Connections`, `QueryEditor`, `TableBrowser`,
 * `SchemaExplorer`, `QueryHistory`, `Monitoring`, `Settings`,
 * `NewConnection`, `EditConnection`, `SavedQueryDetail`).
 *
 * Translated from the verbatim design baseline (top-nav: search +
 * action / sidebar: Quarry brand + nav links + pinned connections + user
 * card / status-bar: ⌘K hints) into a single reusable layout so each
 * page owns only its workspace content. The sidebar user card opens the
 * account drawer (`SettingsPanel`) via the shared `SidebarUserCard`.
 *
 * MOBILE (< 768px): the 280px sidebar would crush a phone's content
 * column, so the desktop chrome is conditionally NOT rendered and a
 * template-local mobile shell takes over — a sticky top bar (hamburger +
 * brand + action) and a slide-in nav drawer (fleet pattern: rendered via
 * matchMedia, not CSS-hidden, so nav `data-mol-id`s are never duplicated
 * in the DOM and every tap target stays ≥ 44px).
 */

const DESKTOP_QUERY = '(min-width: 768px)'

/** Reactive matchMedia check so breakpoint crossings re-render the shell. */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window === 'undefined' || window.matchMedia(DESKTOP_QUERY).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

interface NavLink {
  to: string
  label: string
  icon: string
  match: (path: string) => boolean
}

interface DatabaseAdminLayoutProps {
  /** Action button rendered to the right of the global search bar. */
  topAction?: ReactNode
  /** Placeholder for the global command/search input in the top nav. */
  searchPlaceholder?: string
  /** Optional contextual sidebar slot (Schema-tree, History list, etc.). */
  sidebarExtra?: ReactNode
  children: ReactNode
}

function UserMenuPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

/** Focus-visible ring shared by the mobile chrome's interactive elements. */
const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export function DatabaseAdminLayout({
  topAction,
  searchPlaceholder,
  sidebarExtra,
  children,
}: DatabaseAdminLayoutProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<{ email?: string }>()
  const { pathname } = useLocation()
  const isDesktop = useIsDesktop()
  const placeholder =
    searchPlaceholder ??
    t(
      'databaseAdminLayout.searchPlaceholder',
      {},
      { defaultValue: '⌘K Search commands, queries, tables…' },
    )

  const links: NavLink[] = [
    {
      to: '/connections',
      label: t('nav.connections', {}, { defaultValue: 'Connections' }),
      icon: 'link',
      match: (p) => p.startsWith('/connections'),
    },
    {
      to: '/history',
      label: t('databaseAdminLayout.queries', {}, { defaultValue: 'Queries' }),
      icon: 'terminal',
      match: (p) => p.startsWith('/query') || p.startsWith('/history'),
    },
    {
      to: '/monitoring',
      label: t('databaseAdminLayout.monitoring', {}, { defaultValue: 'Monitoring' }),
      icon: 'monitoring',
      match: (p) => p.startsWith('/monitoring'),
    },
    {
      to: '/settings',
      label: t('nav.settings', {}, { defaultValue: 'Settings' }),
      icon: 'settings',
      match: (p) => p.startsWith('/settings'),
    },
  ]

  const userEmail = user?.email ?? '—'
  const onNewConnectionPage = pathname === '/connections/new'

  if (!isDesktop) {
    return (
      <MobileShell
        links={links}
        userEmail={userEmail}
        topAction={topAction}
        showNewConnection={!topAction && !onNewConnectionPage}
      >
        {children}
      </MobileShell>
    )
  }

  return (
    <div
      data-mol-id="database-admin-layout"
      className={cm.cn(
        'h-screen overflow-hidden antialiased flex flex-col font-body bg-background text-text',
      )}
    >
      {/* Top nav */}
      <nav
        className={cm.cn(
          'z-20 flex h-10 w-full shrink-0 items-center justify-between border-b border-border bg-surface2 px-4',
        )}
      >
        <div className={cm.cn('mx-auto flex max-w-xl flex-1 items-center')}>
          <div className={cm.cn('relative w-full')}>
            <span
              aria-hidden="true"
              className={cm.cn(
                'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted',
              )}
            >
              search
            </span>
            <input
              type="text"
              placeholder={placeholder}
              aria-label={t(
                'databaseAdminLayout.commandPalette',
                {},
                { defaultValue: 'Command palette' },
              )}
              className={cm.cn(
                'h-7 w-full rounded-md border border-border bg-surface pl-9 pr-3 py-1 font-body text-sm text-text',
                'placeholder:font-mono placeholder:text-xs placeholder:text-muted/60',
                'transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              )}
            />
          </div>
        </div>
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'font-mono text-xs text-muted')}
        >
          {topAction ??
            (onNewConnectionPage ? null : (
              <Link
                to="/connections/new"
                data-mol-id="layout-new-connection"
                className={cm.cn(
                  'inline-flex h-7 items-center gap-1 rounded bg-primary px-3 py-1 font-headline font-bold text-on-primary',
                  'transition-colors hover:bg-primary/90',
                )}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                  add
                </span>
                {t('databaseAdminLayout.newConnection', {}, { defaultValue: 'New connection' })}
              </Link>
            ))}
        </div>
      </nav>

      <div className={cm.cn('flex flex-1 overflow-hidden')}>
        {/* Sidebar */}
        <aside
          className={cm.cn(
            'flex h-full w-[280px] shrink-0 flex-col border-r border-border bg-background',
          )}
        >
          <div className={cm.cn('border-b border-border/50 p-4')}>
            <Link to="/connections" className={cm.cn('inline-flex items-baseline')}>
              <QuarryBrandMark size="md" />
            </Link>
          </div>

          <div className={cm.cn('flex flex-col py-4 gap-1')}>
            {links.map((link) => {
              const active = link.match(pathname)
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cm.cn(
                    'flex items-center gap-3 border-l-2 px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors',
                    active
                      ? 'border-primary bg-primary/10 font-bold text-primary'
                      : 'border-transparent text-muted hover:bg-surface2 hover:text-text',
                  )}
                  data-mol-id={`nav-${link.to.slice(1)}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              )
            })}
          </div>

          {sidebarExtra ? (
            <div className={cm.cn('flex-1 overflow-y-auto px-4 py-2 custom-scrollbar')}>
              {sidebarExtra}
            </div>
          ) : (
            <div className={cm.cn('flex-1')} />
          )}

          <div className={cm.cn('mt-auto border-t border-border p-2')}>
            <SidebarUserCard
              secondaryLine={t('databaseAdminLayout.adminRole', {}, { defaultValue: 'Admin role' })}
            >
              <UserMenuPanel />
            </SidebarUserCard>
          </div>
        </aside>

        {/* Main */}
        <main className={cm.cn('flex h-full flex-1 flex-col overflow-hidden bg-background')}>
          {children}
        </main>
      </div>

      {/* Status bar */}
      <footer
        className={cm.cn(
          'flex h-6 w-full shrink-0 items-center justify-between border-t border-border bg-background px-3 font-mono text-[10px] leading-tight text-accent',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'text-muted min-w-0')}>
          <span className={cm.cn('truncate')}>
            {t('databaseAdminLayout.user', {}, { defaultValue: 'User' })}: {userEmail}
          </span>
          <span className={cm.cn('shrink-0')}>
            v1.0.4 | {t('databaseAdminLayout.ready', {}, { defaultValue: 'Ready' })} | UTF-8
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'text-muted shrink-0 pl-3')}>
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <StatusDot tone="connected" size={5} />
            <span>{t('settings.online', {}, { defaultValue: 'Online' })}</span>
          </span>
          <span aria-hidden="true">·</span>
          <CommandHint size="xs">⌘N</CommandHint>
          <span>{t('databaseAdminLayout.new', {}, { defaultValue: 'new' })}</span>
          <span aria-hidden="true">·</span>
          <CommandHint size="xs">⌘K</CommandHint>
          <span>{t('databaseAdminLayout.commands', {}, { defaultValue: 'commands' })}</span>
        </div>
      </footer>
    </div>
  )
}

interface MobileShellProps {
  links: NavLink[]
  userEmail: string
  topAction?: ReactNode
  showNewConnection: boolean
  children: ReactNode
}

/**
 * Mobile chrome for the layout: sticky top bar (hamburger + brand +
 * action) + slide-in nav drawer. Rendered only below 768px.
 */
function MobileShell({
  links,
  userEmail,
  topAction,
  showNewConnection,
  children,
}: MobileShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth<{ email?: string }>()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Any navigation closes the drawer.
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // While open: Escape closes, background scroll locks.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [drawerOpen])

  const onSignOut = useCallback(async () => {
    setDrawerOpen(false)
    try {
      await logout()
    } catch (_error) {
      /* ignore — logout failure is non-blocking; navigate to /login regardless */
    }
    navigate('/login')
  }, [logout, navigate])

  return (
    <div
      data-mol-id="database-admin-layout"
      className={cm.cn('flex min-h-screen flex-col antialiased font-body bg-background text-text')}
    >
      {/* Sticky top bar */}
      <header
        data-mol-id="mobile-topbar"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          'sticky top-0 z-40 h-12 w-full shrink-0 items-center border-b border-border bg-surface2 px-2',
        )}
      >
        <button
          type="button"
          data-mol-id="mobile-nav-toggle"
          aria-label={t('mobileNav.openMenu', {}, { defaultValue: 'Open navigation menu' })}
          aria-expanded={drawerOpen}
          aria-controls="quarry-nav-drawer"
          onClick={() => setDrawerOpen(true)}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-11 w-11 shrink-0 rounded-md text-muted hover:bg-surface hover:text-text',
            FOCUS_RING,
          )}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
            menu
          </span>
        </button>
        <Link to="/connections" className={cm.cn('inline-flex shrink-0 items-baseline px-1')}>
          <QuarryBrandMark size="sm" />
        </Link>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'end', gap: 'xs' }),
            'ml-auto min-w-0 flex-1',
          )}
        >
          <div className={cm.cn('relative w-full min-w-0 max-w-[180px]')}>
            <span
              aria-hidden="true"
              className={cm.cn(
                'material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted',
              )}
            >
              search
            </span>
            <input
              type="text"
              placeholder={t('mobileNav.search', {}, { defaultValue: 'Search…' })}
              aria-label={t(
                'databaseAdminLayout.commandPalette',
                {},
                { defaultValue: 'Command palette' },
              )}
              className={cm.cn(
                'h-8 w-full rounded-md border border-border bg-surface pl-8 pr-2 font-body text-xs text-text',
                'placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              )}
            />
          </div>
          {/* Page-supplied actions are desktop-sized; keep them on one line
              so they cannot wrap out of the h-12 bar. */}
          <span className={cm.cn('shrink-0 whitespace-nowrap')}>
            {topAction ??
              (showNewConnection ? (
                <Link
                  to="/connections/new"
                  data-mol-id="layout-new-connection"
                  aria-label={t(
                    'databaseAdminLayout.newConnection',
                    {},
                    { defaultValue: 'New connection' },
                  )}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-9 w-9 rounded bg-primary font-headline font-bold text-on-primary',
                    'transition-colors hover:bg-primary/90',
                    FOCUS_RING,
                  )}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                    add
                  </span>
                </Link>
              ) : null)}
          </span>
        </div>
      </header>

      {/* Main */}
      <main className={cm.cn('flex min-h-0 w-full flex-1 flex-col bg-background')}>{children}</main>

      {/* Status bar — the ⌘ hints and the user email are desktop chrome;
          on a phone they clipped the bar, so only the essentials remain. */}
      <footer
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          'h-7 w-full shrink-0 items-center border-t border-border bg-background px-3 font-mono text-[10px] leading-tight text-accent',
        )}
      >
        <span className={cm.cn('shrink-0 text-muted')}>
          v1.0.4 | {t('databaseAdminLayout.ready', {}, { defaultValue: 'Ready' })}
        </span>
        <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0 text-muted')}>
          <StatusDot tone="connected" size={5} />
          <span>{t('settings.online', {}, { defaultValue: 'Online' })}</span>
        </span>
      </footer>

      {/* Nav drawer */}
      {drawerOpen ? (
        <div className={cm.cn('fixed inset-0 z-50')}>
          {/* Backdrop: click to dismiss (not tab-reachable — Escape and the
              × button are the keyboard paths). */}
          <button
            type="button"
            tabIndex={-1}
            aria-label={t('mobileNav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
            onClick={() => setDrawerOpen(false)}
            className={cm.cn('absolute inset-0 h-full w-full cursor-default bg-black/50')}
          />
          <div
            id="quarry-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t('mobileNav.mainNavigation', {}, { defaultValue: 'Main navigation' })}
            data-mol-id="mobile-nav-drawer"
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto border-r border-border bg-background shadow-xl',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                'border-b border-border/50 p-3',
              )}
            >
              <QuarryBrandMark size="md" />
              <button
                type="button"
                aria-label={t('mobileNav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
                onClick={() => setDrawerOpen(false)}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-11 w-11 rounded-md text-muted hover:bg-surface2 hover:text-text',
                  FOCUS_RING,
                )}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
                  close
                </span>
              </button>
            </div>
            <nav
              aria-label={t('mobileNav.mainNavigation', {}, { defaultValue: 'Main navigation' })}
              className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'p-2')}
            >
              {links.map((link) => {
                const active = link.match(pathname)
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    data-mol-id={`mobile-nav-${link.to.slice(1)}`}
                    aria-current={active ? 'page' : undefined}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      'min-h-[44px] items-center rounded-md border-l-2 px-3 font-mono text-xs uppercase tracking-widest',
                      active
                        ? 'border-primary bg-primary/10 font-bold text-primary'
                        : 'border-transparent text-muted hover:bg-surface2 hover:text-text',
                      FOCUS_RING,
                    )}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                      {link.icon}
                    </span>
                    {link.label}
                  </Link>
                )
              })}
            </nav>
            <div
              className={cm.cn(
                'mt-auto border-t border-border p-3',
                cm.flex({ direction: 'col', gap: 'sm' }),
              )}
            >
              <span className={cm.cn('truncate font-mono text-xs text-muted')} title={userEmail}>
                {userEmail}
              </span>
              <button
                type="button"
                data-mol-id="mobile-nav-signout"
                onClick={() => void onSignOut()}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'min-h-[44px] w-full items-center rounded-md px-3 text-left text-sm text-muted hover:bg-surface2 hover:text-error',
                  FOCUS_RING,
                )}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                  logout
                </span>
                {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
