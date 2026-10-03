import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell, useIsDesktop } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { ArcanumBrandMark } from './ArcanumBrandMark.js'
import { UserMenu } from './UserMenu.js'

/**
 * Shell for every authenticated Arcanum page (Vaults, VaultDetail,
 * SecretDetail, AuditLog, Rotations, Integrations, Team, ApiTokens,
 * Notifications, Profile, Settings) — the SHARED `ResponsiveAppShell` from
 * `@molecule/app-ui-react`, composed to Arcanum's idiom: a full-width search
 * top bar (with `/` focus shortcut), the mono-uppercase sidebar nav in a
 * bordered rail, environment-switcher slot, and the `▮ ENCRYPTED` status
 * footer.
 *
 * The shell owns the breakpoint split (768px, one chrome mounted per
 * breakpoint): the desktop Sidebar and the mobile Drawer (full APG dialog —
 * focus trap, Escape/backdrop close, scroll lock, auto-close on navigation)
 * receive the SAME nav element, and the mobile-only menu trigger is rendered
 * by the shell's TopBar itself. The former hand-rolled hamburger + portal
 * drawer pair is deleted with the migration.
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
  const navLabel = t('secretsManagerLayout.navLabel', {}, { defaultValue: 'Primary navigation' })

  // One nav element for BOTH mounts — the shell instantiates only the
  // breakpoint's copy, so the nav links are never in the DOM twice.
  const nav = (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('px', 2), 'py-3')}>
      {links.map((link) => {
        const active = link.match(pathname)
        return (
          <Link
            key={link.to}
            to={link.to}
            data-mol-id={`nav-${link.to.slice(1)}`}
            aria-current={active ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              'min-h-[44px] mx-2 rounded-md border-l-2 px-3 py-2 font-mono text-xs uppercase tracking-widest transition-colors',
              active
                ? 'border-primary bg-primary/10 font-bold text-primary'
                : 'border-transparent text-muted hover:bg-surface hover:text-text',
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-lg shrink-0')}
            >
              {link.icon}
            </span>
            {link.label}
          </Link>
        )
      })}
    </div>
  )

  // Profile row — the sidebar/drawer footer (was a bare Link in both).
  const profileFooter = (
    <Link
      to="/profile"
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        'w-full transition-colors hover:bg-surface',
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
      <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
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
  )

  // Search box — the top bar's leading slot on BOTH breakpoints (the shell
  // renders its menu trigger before it below 768px).
  const searchBox = (
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
          'h-9 w-full rounded-md border border-border bg-background pl-9 pr-10 py-1 font-mono text-sm text-text',
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
  )

  // Desktop top strip — the shell's TopBar is mobile-only (a non-mobileOnly
  // TopBar becomes a squeezed flex-row COLUMN on desktop; the shared shell's
  // documented composition is mobileOnly + sidebar/desktop chrome). The same
  // search + action cluster therefore renders as the content column's header
  // strip on desktop. Only one copy mounts per breakpoint.
  const topActions = (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'shrink-0')}>
      {environmentSwitcher}
      {topAction ?? (
        <Link
          to="/vaults"
          className={cm.cn(
            'inline-flex h-8 items-center gap-1 rounded bg-primary px-3 font-headline text-[12px] font-bold text-on-primary',
            'transition-colors hover:bg-primary/90',
          )}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-sm">
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
  )
  const isDesktop = useIsDesktop()

  return (
    <div
      data-mol-id="secrets-manager-layout"
      className={cm.cn('flex min-h-screen flex-col font-body antialiased bg-background text-text')}
    >
      <ResponsiveAppShell sidebarWidth={260} className="flex-1">
        <ResponsiveAppShell.TopBar
          mobileOnly
          brand={searchBox}
          className="bg-surface border-border"
          actions={topActions}
        />

        {/*
          Desktop sidebar (>=768px): brand + mono nav + contextual extra +
          the profile row in the shell's bordered footer.
        */}
        <ResponsiveAppShell.Sidebar
          navLabel={navLabel}
          dataMolId="layout-sidebar"
          className="bg-background border-border border-r"
          footer={profileFooter}
        >
          <div className={cm.cn('border-b border-border/50 px-4 py-3')}>
            <Link to="/vaults" className={cm.cn('inline-flex items-baseline')}>
              <ArcanumBrandMark size="md" />
            </Link>
          </div>
          {nav}
          {sidebarExtra ? (
            <div className={cm.cn('min-h-0 overflow-y-auto px-4 py-2')}>{sidebarExtra}</div>
          ) : null}
        </ResponsiveAppShell.Sidebar>

        {/*
          Mobile drawer (<768px): the shell's APG dialog over the SAME nav
          element; brand in the header, profile row in the footer.
        */}
        <ResponsiveAppShell.Drawer
          navLabel={navLabel}
          header={
            <Link to="/vaults" className={cm.cn('inline-flex items-baseline')}>
              <ArcanumBrandMark size="md" />
            </Link>
          }
          footer={profileFooter}
          className="h-full bg-background border-border border-r"
        >
          {nav}
        </ResponsiveAppShell.Drawer>

        <ResponsiveAppShell.Content className="bg-background">
          {isDesktop && (
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 3 }),
                cm.sp('px', 4),
                'h-12 shrink-0 items-center justify-between border-b border-border bg-surface',
              )}
            >
              {searchBox}
              {topActions}
            </div>
          )}
          {children}
        </ResponsiveAppShell.Content>
      </ResponsiveAppShell>

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
