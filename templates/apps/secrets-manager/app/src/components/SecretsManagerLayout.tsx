import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ArcanumBrandMark } from './ArcanumBrandMark.js'
import { UserMenu } from './UserMenu.js'

/**
 * Top-bar + sidebar + main shell shared by every authenticated Arcanum
 * page (Vaults, VaultDetail, SecretDetail, AuditLog, Rotations,
 * Integrations, Team, ApiTokens, Notifications, Profile, Settings).
 *
 * Translated from database-admin's DatabaseAdminLayout.tsx (search +
 * sidebar nav with active-route bordering + user footer + status bar)
 * into Arcanum's brand idiom: ArcanumBrandMark in the sidebar header,
 * mono uppercase labels, environment switcher slot in the top bar, and
 * a status-bar with a `▮ ENCRYPTED` indicator instead of `Online`.
 */

interface NavLink {
  to: string
  label: string
  icon: string
  match: (path: string) => boolean
}

interface SecretsManagerLayoutProps {
  /** Optional action button rendered in the top-bar (e.g. "New vault"). */
  topAction?: ReactNode
  /** Optional environment switcher slot (DEV / STAGING / PROD pill row). */
  environmentSwitcher?: ReactNode
  /** Optional contextual sidebar slot (vault tree, recent secrets, etc.). */
  sidebarExtra?: ReactNode
  children: ReactNode
}

export function SecretsManagerLayout({
  topAction,
  environmentSwitcher,
  sidebarExtra,
  children,
}: SecretsManagerLayoutProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<{ email?: string }>()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '')
  const searchRef = useRef<HTMLInputElement>(null)

  // Keep the search input in sync when the URL changes (e.g. user clicks
  // a different page or hits back). Without this, the box shows stale
  // text while the page is filtering by something else.
  useEffect(() => {
    setSearchQuery(searchParams.get('q') ?? '')
  }, [searchParams])

  // "/" focuses the search box from anywhere — matches the visible kbd
  // hint to the right of the input. Skip when typing in another field.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (target?.isContentEditable) return
      e.preventDefault()
      searchRef.current?.focus()
      searchRef.current?.select()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function applySearch(value: string) {
    const trimmed = value.trim()
    const url = trimmed ? `/vaults?q=${encodeURIComponent(trimmed)}` : '/vaults'
    navigate(url)
  }

  const links: NavLink[] = [
    {
      to: '/vaults',
      label: t('secretsManagerLayout.vaults', {}, { defaultValue: 'Vaults' }),
      icon: 'lock',
      match: (p) => p.startsWith('/vaults') || p.startsWith('/secrets'),
    },
    {
      to: '/rotations',
      label: t('secretsManagerLayout.rotations', {}, { defaultValue: 'Rotations' }),
      icon: 'autorenew',
      match: (p) => p.startsWith('/rotations'),
    },
    {
      to: '/audit',
      label: t('secretsManagerLayout.audit', {}, { defaultValue: 'Audit' }),
      icon: 'history',
      match: (p) => p.startsWith('/audit'),
    },
    {
      to: '/integrations',
      label: t('nav.integrations', {}, { defaultValue: 'Integrations' }),
      icon: 'cable',
      match: (p) => p.startsWith('/integrations'),
    },
    {
      to: '/team',
      label: t('nav.team', {}, { defaultValue: 'Team' }),
      icon: 'group',
      match: (p) => p.startsWith('/team'),
    },
    {
      to: '/tokens',
      label: t('secretsManagerLayout.tokens', {}, { defaultValue: 'API tokens' }),
      icon: 'key',
      match: (p) => p.startsWith('/tokens'),
    },
    {
      to: '/notifications',
      label: t('nav.inbox', {}, { defaultValue: 'Inbox' }),
      icon: 'inbox',
      match: (p) => p.startsWith('/notifications'),
    },
    {
      to: '/settings',
      label: t('nav.settings', {}, { defaultValue: 'Settings' }),
      icon: 'settings',
      match: (p) => p.startsWith('/settings'),
    },
  ]

  const userEmail = user?.email ?? 'admin@arcanum.dev'

  return (
    <div
      data-mol-id="secrets-manager-layout"
      className={cm.cn('flex min-h-screen flex-col font-body antialiased bg-background text-text')}
    >
      <nav
        className={cm.cn(
          'z-20 flex h-12 w-full shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4',
        )}
      >
        <div className={cm.cn('flex flex-1 items-center gap-3')}>
          <div className={cm.cn('relative w-full max-w-xl')}>
            <span
              aria-hidden="true"
              className={cm.cn(
                'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted',
              )}
            >
              search
            </span>
            <input
              ref={searchRef}
              type="text"
              data-mol-id="layout-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  applySearch(searchQuery)
                } else if (e.key === 'Escape') {
                  setSearchQuery('')
                  applySearch('')
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
              placeholder={t(
                'secretsManagerLayout.searchPlaceholder',
                {},
                { defaultValue: 'Search secrets by key, path, or tag…' },
              )}
              aria-label={t('secretsManagerLayout.search', {}, { defaultValue: 'Search secrets' })}
              className={cm.cn(
                'h-8 w-full rounded-md border border-border bg-background pl-9 pr-12 py-1 font-mono text-sm text-text',
                'placeholder:font-mono placeholder:text-xs placeholder:text-muted/60',
                'transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              )}
            />
            <kbd
              aria-hidden="true"
              className={cm.cn(
                'absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-surface-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted',
              )}
            >
              /
            </kbd>
          </div>
        </div>
        <div className={cm.cn('flex items-center gap-3')}>
          {environmentSwitcher}
          {topAction ?? (
            <Link
              to="/vaults"
              className={cm.cn(
                'inline-flex h-8 items-center gap-1 rounded bg-primary px-3 font-headline text-[12px] font-bold text-on-primary',
                'transition-colors hover:bg-primary/90',
              )}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                add
              </span>
              {t('secretsManagerLayout.newVault', {}, { defaultValue: 'New vault' })}
            </Link>
          )}
          <UserMenu />
        </div>
      </nav>

      <div className={cm.cn('flex flex-1 overflow-hidden')}>
        <aside
          className={cm.cn(
            'flex h-auto w-[260px] shrink-0 flex-col border-r border-border bg-background',
          )}
        >
          <div className={cm.cn('border-b border-border/50 p-4')}>
            <Link to="/vaults" className={cm.cn('inline-flex items-baseline')}>
              <ArcanumBrandMark size="md" />
            </Link>
          </div>

          <div className={cm.cn('flex flex-col py-3 gap-1')}>
            {links.map((link) => {
              const active = link.match(pathname)
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  data-mol-id={`nav-${link.to.slice(1)}`}
                  className={cm.cn(
                    'flex items-center gap-3 border-l-2 px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors',
                    active
                      ? 'border-primary bg-primary/10 font-bold text-primary'
                      : 'border-transparent text-muted hover:bg-surface hover:text-text',
                  )}
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
            <div className={cm.cn('flex-1 overflow-y-auto px-4 py-2')}>{sidebarExtra}</div>
          ) : (
            <div className={cm.cn('flex-1')} />
          )}

          <Link
            to="/profile"
            className={cm.cn(
              'mt-auto flex items-center gap-3 border-t border-border p-4 transition-colors hover:bg-surface',
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface font-mono text-sm font-bold text-primary',
              )}
            >
              {userEmail.charAt(0).toUpperCase()}
            </span>
            <div className={cm.cn(cm.flex({ direction: 'col' }))}>
              <span className={cm.cn('font-body text-sm font-medium text-text')}>{userEmail}</span>
              <span className={cm.cn('font-mono text-[10px] text-muted')}>
                {t(
                  'secretsManagerLayout.adminRole',
                  { appName: APP_NAME },
                  { defaultValue: 'Admin · {{appName}} workspace' },
                )}
              </span>
            </div>
          </Link>
        </aside>

        <main className={cm.cn('flex h-auto flex-1 flex-col overflow-y-auto bg-background')}>
          {children}
        </main>
      </div>

      <footer
        className={cm.cn(
          'sticky bottom-0 z-30 flex h-7 w-full items-center justify-between border-t border-border bg-background px-3 font-mono text-[10px] leading-tight text-muted',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            aria-hidden="true"
            className={cm.cn('inline-block h-1.5 w-1.5 rounded-full bg-primary')}
            style={{ boxShadow: '0 0 6px rgba(0, 217, 146, 0.6)' }}
          />
          <span className="text-primary">
            {t('secretsManagerLayout.encrypted', {}, { defaultValue: 'AES-256 · ENCRYPTED' })}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {t('secretsManagerLayout.user', {}, { defaultValue: 'User' })}: {userEmail}
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <kbd
            className={cm.cn('rounded border border-border/70 px-1.5 py-0.5 text-[9px] text-muted')}
          >
            ⌘K
          </kbd>
          <span>{t('secretsManagerLayout.commands', {}, { defaultValue: 'commands' })}</span>
          <span aria-hidden="true">·</span>
          <kbd
            className={cm.cn('rounded border border-border/70 px-1.5 py-0.5 text-[9px] text-muted')}
          >
            /
          </kbd>
          <span>{t('secretsManagerLayout.search', {}, { defaultValue: 'search' })}</span>
        </div>
      </footer>
    </div>
  )
}
