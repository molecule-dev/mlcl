/**
 * Rushes dark-workspace shell — left sidebar with mono-uppercase nav rail,
 * per-page app bar with breadcrumb + search + utility icons, full-bleed
 * canvas slot. Used by every authenticated screen.
 *
 * Bespoke per Rushes DESIGN.md (dark-first, full-bleed, 1024px min-width).
 * Built on the shared `ResponsiveAppShell` from @molecule/app-ui-react, which
 * owns the responsive split: the Sidebar mounts ≥768px (brand + nav + plan
 * card), the mobileOnly TopBar renders the menu trigger below it, and the
 * Drawer carries the SAME nav element under the full APG dialog contract
 * (focus trap, Escape/backdrop close, scroll lock, auto-close on
 * navigation). Only the mounted breakpoint instantiates the nav, so the
 * `rushes-*` data-mol-ids stay unique in the DOM across both surfaces. The
 * shell owns the breakpoint split, drawer open state, root direction, and
 * trigger sizing — no app-side shims. The ⌘K search chip stays a desktop-only
 * affordance (`hidden md:flex`, a non-duplicating surface swap); page
 * padding stays in this layout's content column (pages opt out via
 * `fullBleed`).
 */
import { type ReactNode, useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

interface AccountUser {
  email?: string | null
  name?: string | null
}
interface BillingStatus {
  name?: string | null
  planKey?: string | null
  isFree?: boolean | null
}

interface RushesLayoutProps {
  title?: string
  breadcrumb?: ReactNode
  toolbar?: ReactNode
  children: ReactNode
  /** Render without the inner padding wrapper (Editor canvas / Templates grid). */
  fullBleed?: boolean
}

interface NavItem {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
}

const NAV: NavItem[] = [
  {
    to: '/dashboard',
    icon: 'dashboard',
    labelKey: 'rushesLayout.nav.dashboard',
    defaultLabel: 'Dashboard',
  },
  {
    to: '/assets',
    icon: 'video_library',
    labelKey: 'rushesLayout.nav.assets',
    defaultLabel: 'Assets',
  },
  {
    to: '/templates',
    icon: 'auto_awesome',
    labelKey: 'rushesLayout.nav.templates',
    defaultLabel: 'Templates',
  },
  {
    to: '/export',
    icon: 'cloud_download',
    labelKey: 'rushesLayout.nav.export',
    defaultLabel: 'Exports',
  },
  {
    to: '/settings',
    icon: 'settings',
    labelKey: 'rushesLayout.nav.settings',
    defaultLabel: 'Settings',
  },
]

export function RushesLayout({
  title,
  breadcrumb,
  toolbar,
  children,
  fullBleed = false,
}: RushesLayoutProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<AccountUser>()
  const http = useHttpClient()
  const location = useLocation()
  const [billing, setBilling] = useState<BillingStatus | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    http
      .get('/api/billing/status')
      .then((res) => {
        if (cancelled) return
        // http.get returns { data, status }; the JSON body is in `data`.
        const body = (res as { data?: unknown } | null)?.data ?? res
        if (body && typeof body === 'object') setBilling(body as BillingStatus)
      })
      .catch(() => {
        /* sidebar is best-effort */
      })
    return () => {
      cancelled = true
    }
  }, [http, user])

  const planLabel = billing?.name
    ? t('rushesLayout.planLabel', { name: billing.name }, { defaultValue: `${billing.name} plan` })
    : t('rushesLayout.planFree', {}, { defaultValue: 'Free plan' })

  // Rushes dark NLE chrome — the shell's `cm.page`/`cm.surface` tokens resolve
  // to the theme bond's `bg-background`/`bg-surface`; these pass the Rushes
  // palette through the same className slots (tailwind-merge keeps the last
  // bg/border of each group).
  const panelClasses = cm.cn('bg-[var(--video-panel-bg)] border-[var(--video-border-subtle)]')
  const navAriaLabel = t('rushesLayout.navDialog', {}, { defaultValue: 'Navigation' })

  /** Brand block for the desktop sidebar (rides inside the sidebar children). */
  const sidebarBrand = (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('mb', 8))}>
      <BrandWordmark size="md" />
      <p
        className={cm.cn(
          'mt-1 font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-dim)]',
        )}
      >
        {t('rushesLayout.tagline', {}, { defaultValue: 'Cinematic timeline' })}
      </p>
    </div>
  )

  /** Brand block for the drawer header row (next to the shell's close button). */
  const drawerBrand = (
    <div className={cm.cn(cm.sp('px', 3))}>
      <BrandWordmark size="md" />
      <p
        className={cm.cn(
          'mt-1 font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-dim)]',
        )}
      >
        {t('rushesLayout.tagline', {}, { defaultValue: 'Cinematic timeline' })}
      </p>
    </div>
  )

  /**
   * The nav column shared by the desktop sidebar and the mobile drawer —
   * ONE element passed to both, so only the mounted breakpoint instantiates
   * it and the `rushes-*` ids stay unique in the DOM.
   */
  const navColumn = (
    <>
      <NavLink
        to="/projects/new"
        data-mol-id="rushes-new-project"
        className={cm.cn(
          cm.fontWeight('semibold'),
          cm.flex({ align: 'center', justify: 'center', gap: 2 }),
          cm.sp('mx', 4),
          cm.sp('mb', 6),
          cm.sp('px', 3),
          'min-h-[40px] rounded-lg text-white bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] hover:opacity-90 transition-opacity',
          cm.textSize('sm'),
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-[18px]')}>add</span>
        <span>{t('nav.newProject', {}, { defaultValue: 'New project' })}</span>
      </NavLink>

      <div className={cm.cn(cm.flex1, cm.sp('px', 4), cm.stack(1))}>
        {NAV.map((item) => {
          const active =
            location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
          // NavLink carries aria-current="page" on the active link.
          return (
            <NavLink
              key={item.to}
              to={item.to}
              data-mol-id={`rushes-nav-${item.icon}`}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 3 }),
                cm.sp('px', 3),
                'min-h-[40px] rounded-md transition-colors',
                cm.textSize('sm'),
                active
                  ? 'bg-[var(--video-cta-from)]/15 text-[var(--video-link)] border-l-2 border-[var(--video-cta-from)]'
                  : 'text-[var(--video-text-muted-alt)] hover:bg-[var(--video-panel-bg-alt)] hover:text-[var(--video-text-primary)]',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>{item.icon}</span>
              <span className={cm.fontWeight('medium')}>
                {t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
              </span>
            </NavLink>
          )
        })}
      </div>
    </>
  )

  /** Account card — the shell footer slot renders it after the nav landmark. */
  const userCard = (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
      <div
        className={cm.cn(
          cm.w(8),
          cm.h(8),
          cm.flex({ align: 'center', justify: 'center' }),
          'rounded-full bg-gradient-to-br from-[var(--video-cta-from)] to-[var(--video-cta-to)] text-white font-bold text-sm',
        )}
      >
        {user?.email?.[0]?.toUpperCase() ?? 'R'}
      </div>
      <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'text-[var(--video-text-primary)] truncate',
          )}
        >
          {user?.email ?? t('rushesLayout.guest', {}, { defaultValue: 'Editor' })}
        </span>
        <span
          data-mol-id="rushes-plan-label"
          className={cm.cn(
            'text-[10px] font-mono uppercase tracking-widest text-[var(--video-text-dim)]',
          )}
        >
          {planLabel}
        </span>
      </div>
    </div>
  )

  return (
    <ResponsiveAppShell
      sidebarWidth={260}
      className="bg-[var(--video-input-bg)] text-[var(--video-text-primary)] font-body"
    >
      {/* Mobile-only top bar (< md): the shell renders the menu trigger; the
          desktop keeps its brand in the sidebar, so the bar mounts nowhere
          else. */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={<BrandWordmark size="sm" />}
        // The /95 bg stays LAST — tailwind-merge keeps the last bg-* of the
        // group, so the translucent bar must not precede the solid panel bg.
        className={cm.cn(panelClasses, 'bg-[var(--video-panel-bg)]/95 backdrop-blur-md')}
      />

      {/* Desktop sidebar (≥768px): brand + nav, plan card in the footer slot. */}
      <ResponsiveAppShell.Sidebar
        navLabel={navAriaLabel}
        className={cm.cn(cm.sp('py', 6), panelClasses)}
        footer={userCard}
      >
        {sidebarBrand}
        {navColumn}
      </ResponsiveAppShell.Sidebar>

      {/* Mobile drawer (< md): the same nav element under the shell's full
          dialog contract; brand in the header row, plan card in the footer. */}
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        className={cm.cn('h-full', cm.sp('py', 6), panelClasses)}
        header={drawerBrand}
        footer={userCard}
      >
        {navColumn}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content className={cm.cn(cm.flex({ direction: 'col' }))}>
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 4),
            'md:px-6 h-14 shrink-0 border-b border-[var(--video-border-subtle)] bg-[var(--video-panel-bg)]/80 backdrop-blur-md',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), 'min-w-0')}>
            {title && (
              <h1
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'tracking-tight text-[var(--video-text-primary)] truncate',
                )}
              >
                {title}
              </h1>
            )}
            {breadcrumb && (
              <span
                className={cm.cn(
                  'hidden sm:inline font-mono text-[11px] uppercase tracking-widest text-[var(--video-text-dim)] truncate',
                )}
              >
                {breadcrumb}
              </span>
            )}
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), 'shrink-0')}>
            {toolbar}
            <div className="hidden md:flex">
              <button
                type="button"
                data-mol-id="rushes-search"
                onClick={() => {}}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 3),
                  cm.sp('py', 1.5),
                  cm.textSize('xs'),
                  'font-mono uppercase tracking-widest text-[var(--video-text-dim)] border border-[var(--video-border-subtle)] rounded-full hover:text-[var(--video-link)] hover:border-[var(--video-cta-from)]/40 transition-colors',
                )}
                aria-label={t('common.search', {}, { defaultValue: 'Search' })}
              >
                <span className={cm.cn('material-symbols-outlined text-[14px]')}>search</span>
                <span>⌘K</span>
              </button>
            </div>
            <UserMenu />
          </div>
        </header>

        <div className={cm.cn(cm.flex1, 'overflow-y-auto', fullBleed ? '' : cm.sp('p', 6))}>
          {children}
        </div>
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default RushesLayout
