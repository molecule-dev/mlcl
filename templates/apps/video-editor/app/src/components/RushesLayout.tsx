/**
 * Rushes dark-workspace shell — left sidebar with mono-uppercase nav rail,
 * top app bar with breadcrumb + search + utility icons, full-bleed canvas
 * slot. Used by every authenticated screen.
 *
 * Bespoke per Rushes DESIGN.md (dark-first, full-bleed, 1024px min-width).
 * Pattern source: animation-tool/AnimationToolLayout.tsx adapted to the
 * Rushes brand palette and editor-centric nav targets.
 */
import { type ReactNode, useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { RushesWordmark } from './RushesWordmark.js'
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

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'row' }),
        cm.minH('screen'),
        'bg-[var(--video-input-bg)] text-[var(--video-text-primary)] font-body',
      )}
    >
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('py', 6),
          'w-[260px] border-r border-[var(--video-border-subtle)] bg-[var(--video-panel-bg)] shrink-0',
        )}
      >
        <div className={cm.cn(cm.sp('px', 6), cm.sp('mb', 8))}>
          <RushesWordmark size="md" to="/" />
          <p
            className={cm.cn(
              'mt-1 font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-dim)]',
            )}
          >
            {t('rushesLayout.tagline', {}, { defaultValue: 'Cinematic timeline' })}
          </p>
        </div>

        <NavLink
          to="/projects/new"
          data-mol-id="rushes-new-project"
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', justify: 'center', gap: 2 }),
            cm.sp('mx', 4),
            cm.sp('mb', 6),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'rounded-lg text-white bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] hover:opacity-90 transition-opacity',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>add</span>
          <span>{t('nav.newProject', {}, { defaultValue: 'New project' })}</span>
        </NavLink>

        <nav className={cm.cn(cm.flex1, cm.sp('px', 4), cm.stack(1))}>
          {NAV.map((item) => {
            const active =
              location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                data-mol-id={`rushes-nav-${item.icon}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 3 }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-md transition-colors',
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
        </nav>

        <div className={cm.cn(cm.sp('px', 6), cm.sp('mt', 4))}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 3 }),
              cm.sp('pt', 4),
              'border-t border-[var(--video-border-subtle)]',
            )}
          >
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
        </div>
      </aside>

      <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 6),
            'h-14 border-b border-[var(--video-border-subtle)] bg-[var(--video-panel-bg)]/80 backdrop-blur-md',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
            {title && (
              <h1
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'tracking-tight text-[var(--video-text-primary)]',
                )}
              >
                {title}
              </h1>
            )}
            {breadcrumb && (
              <span
                className={cm.cn(
                  'font-mono text-[11px] uppercase tracking-widest text-[var(--video-text-dim)]',
                )}
              >
                {breadcrumb}
              </span>
            )}
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
            {toolbar}
            <button
              type="button"
              data-mol-id="rushes-search"
              onClick={() => {}}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                'font-mono uppercase tracking-widest text-[var(--video-text-dim)] border border-[var(--video-border-subtle)] rounded-full hover:text-[var(--video-link)] hover:border-[var(--video-cta-from)]/40 transition-colors',
              )}
              aria-label={t('common.search', {}, { defaultValue: 'Search' })}
            >
              <span className={cm.cn('material-symbols-outlined text-[14px]')}>search</span>
              <span>⌘K</span>
            </button>
            <UserMenu />
          </div>
        </header>

        <main className={cm.cn(cm.flex1, 'overflow-y-auto', fullBleed ? '' : cm.sp('p', 6))}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default RushesLayout
