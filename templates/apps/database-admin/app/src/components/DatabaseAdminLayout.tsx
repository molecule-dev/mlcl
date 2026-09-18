import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'

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
 */

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
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'text-muted')}>
          <span>
            {t('databaseAdminLayout.user', {}, { defaultValue: 'User' })}: {userEmail}
          </span>
          <span>
            v1.0.4 | {t('databaseAdminLayout.ready', {}, { defaultValue: 'Ready' })} | UTF-8
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'text-muted')}>
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
