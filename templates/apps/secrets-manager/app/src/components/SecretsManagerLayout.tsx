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
  // Mobile drawer nav — the fixed 260px sidebar is hidden below md (768px);
  // the same links render in a slide-over drawer opened from the top bar.
  const [menuOpen, setMenuOpen] = useState(false)

  // Keep the search input in sync when the URL changes (e.g. user clicks
  // a different page or hits back). Without this, the box shows stale
  // text while the page is filtering by something else.
  useEffect(() => {
    setSearchQuery(searchParams.get('q') ?? '')
  }, [searchParams])

  // Close the mobile drawer whenever the route changes (nav link tap) or
  // Escape is pressed while it is open.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

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
          'sticky top-0 z-20 flex h-12 w-full shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-3 sm:gap-4 sm:px-4',
        )}
      >
        <div className={cm.cn('flex flex-1 items-center gap-2 sm:gap-3')}>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            data-mol-id="layout-menu-button"
            aria-label={t(
              'secretsManagerLayout.openMenu',
              {},
              { defaultValue: 'Open navigation menu' },
            )}
            aria-expanded={menuOpen}
            className={cm.cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted transition-colors hover:border-primary hover:text-primary md:hidden',
            )}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
              menu
            </span>
          </button>
          <div className={cm.cn('relative min-w-0 flex-1 max-w-xl')}>
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
        <div className={cm.cn('flex shrink-0 items-center gap-2 sm:gap-3')}>
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
              <span className="hidden sm:inline">
                {t('secretsManagerLayout.newVault', {}, { defaultValue: 'New vault' })}
              </span>
              <span className="sm:hidden" aria-hidden="true">
                {t('secretsManagerLayout.newVaultShort', {}, { defaultValue: 'New' })}
              </span>
            </Link>
          )}
          <UserMenu />
        </div>
      </nav>

      {/* Mobile drawer nav + backdrop (hidden at md+, where the sidebar shows). */}
      {menuOpen ? (
        <div className={cm.cn('md:hidden')} data-mol-id="layout-mobile-nav">
          <div
            role="presentation"
            onClick={() => setMenuOpen(false)}
            className={cm.cn('fixed inset-0 z-30 bg-black/60 backdrop-blur-sm')}
          />
          <aside
            aria-label={t(
              'secretsManagerLayout.navLabel',
              {},
              { defaultValue: 'Primary navigation' },
            )}
            className={cm.cn(
              'fixed inset-y-0 left-0 z-40 flex w-[280px] max-w-[85vw] flex-col border-r border-border bg-background shadow-2xl',
            )}
          >
            <div
              className={cm.cn('flex items-center justify-between border-b border-border/50 p-4')}
            >
              <Link to="/vaults" className={cm.cn('inline-flex items-baseline')}>
                <ArcanumBrandMark size="md" />
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label={t(
                  'secretsManagerLayout.closeMenu',
                  {},
                  { defaultValue: 'Close navigation menu' },
                )}
                className={cm.cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted transition-colors hover:border-primary hover:text-primary',
                )}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>

            <div className={cm.cn('flex flex-1 flex-col gap-1 overflow-y-auto py-3')}>
              {links.map((link) => {
                const active = link.match(pathname)
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    data-mol-id={`mnav-${link.to.slice(1)}`}
                    aria-current={active ? 'page' : undefined}
                    className={cm.cn(
                      'mx-2 flex items-center gap-3 rounded-md px-3 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors',
                      active
                        ? 'bg-primary/10 font-bold text-primary'
                        : 'text-muted hover:bg-surface hover:text-text',
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

            <Link
              to="/profile"
              className={cm.cn(
                'flex items-center gap-3 border-t border-border p-4 transition-colors hover:bg-surface',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn(
                  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface font-mono text-sm font-bold text-primary',
                )}
              >
                {userEmail.charAt(0).toUpperCase()}
              </span>
              <div className={cm.cn('flex min-w-0 flex-col')}>
                <span className={cm.cn('truncate font-body text-sm font-medium text-text')}>
                  {userEmail}
                </span>
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
        </div>
      ) : null}

      <div className={cm.cn('flex flex-1 overflow-hidden')}>
        <aside
          className={cm.cn(
            'hidden h-auto w-[260px] shrink-0 flex-col border-r border-border bg-background md:flex',
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
          'sticky bottom-0 z-30 flex h-7 w-full items-center justify-between gap-3 border-t border-border bg-background px-3 font-mono text-[10px] leading-tight text-muted',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }) + ' min-w-0 flex-1 overflow-hidden',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary')}
            style={{ boxShadow: '0 0 6px rgba(0, 217, 146, 0.6)' }}
          />
          <span className="shrink-0 text-primary">
            {t('secretsManagerLayout.encrypted', {}, { defaultValue: 'AES-256 · ENCRYPTED' })}
          </span>
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <span className={cm.cn('truncate')}>
            {t('secretsManagerLayout.user', {}, { defaultValue: 'User' })}: {userEmail}
          </span>
        </div>
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }) + ' hidden shrink-0 lg:flex')}
        >
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
