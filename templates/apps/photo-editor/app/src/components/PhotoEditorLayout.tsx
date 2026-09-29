/**
 * Lustra dark-workspace shell — left sidebar with mono-uppercase nav rail,
 * top app bar with breadcrumb + tool actions, full-bleed canvas slot for
 * Editor / Export, padded canvas slot for Library / Settings / etc.
 *
 * Translated from animation-tool's AnimationToolLayout.tsx — same
 * dev-tools sidebar pattern, recoloured for Lustra's #16162a panel /
 * #1e1e36 panel-secondary palette per DESIGN.md "Backgrounds" §.
 */
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from './BrandWordmark.js'
import { useMediaQuery } from './useMediaQuery.js'

interface AccountUser {
  email?: string | null
  name?: string | null
}

interface BillingStatus {
  name: string
  planKey: string
  isFree: boolean
}

/** Below this the 260px sidebar would swallow a 390px viewport. */
const MOBILE_QUERY = '(max-width: 767px)'

interface PhotoEditorLayoutProps {
  title?: string
  breadcrumb?: ReactNode
  /** Right-aligned cluster (Save / Export / Share buttons). */
  toolbar?: ReactNode
  children: ReactNode
  /** Render without the inner padding wrapper (Editor / Export canvases). */
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
    to: '/library',
    icon: 'photo_library',
    labelKey: 'photoEditorLayout.nav.library',
    defaultLabel: 'Library',
  },
  { to: '/editor', icon: 'tune', labelKey: 'photoEditorLayout.nav.editor', defaultLabel: 'Editor' },
  {
    to: '/presets',
    icon: 'palette',
    labelKey: 'photoEditorLayout.nav.presets',
    defaultLabel: 'Presets',
  },
  {
    to: '/export',
    icon: 'ios_share',
    labelKey: 'photoEditorLayout.nav.export',
    defaultLabel: 'Export',
  },
  {
    to: '/profile',
    icon: 'person',
    labelKey: 'photoEditorLayout.nav.profile',
    defaultLabel: 'Profile',
  },
  {
    to: '/settings',
    icon: 'settings',
    labelKey: 'photoEditorLayout.nav.settings',
    defaultLabel: 'Settings',
  },
]

export function PhotoEditorLayout({
  title,
  breadcrumb,
  toolbar,
  children,
  fullBleed = false,
}: PhotoEditorLayoutProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user, logout } = useAuth<AccountUser>()
  const http = useHttpClient()
  const navigate = useNavigate()
  const location = useLocation()
  const belowMobile = useMediaQuery(MOBILE_QUERY)
  const [billing, setBilling] = useState<BillingStatus | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    http
      .get<BillingStatus>('/billing/status')
      .then((res) => {
        if (!cancelled) setBilling(res.data)
      })
      .catch(() => {
        /* unauthenticated or transient — leave null */
      })
    return () => {
      cancelled = true
    }
  }, [http, user])

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const userInitial = user?.email?.[0]?.toUpperCase() ?? user?.name?.[0]?.toUpperCase() ?? 'L'
  const planLabel = billing
    ? t('photoEditorLayout.planLabel', { name: billing.name }, { defaultValue: '{{name}} Plan' })
    : t('photoEditorLayout.planLoading', {}, { defaultValue: 'Loading…' })

  // Mobile shell (<768px): sticky top bar + horizontally scrollable chip nav.
  // The 260px sidebar would swallow a 390px viewport, so below the breakpoint
  // a different shell mounts entirely (fleet pattern — only one shell in the
  // DOM at a time, so page content never double-mounts).
  if (belowMobile) {
    const navLabel = t(
      'photoEditorLayout.primaryNavLabel',
      {},
      { defaultValue: 'Primary navigation' },
    )
    return (
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.minH('screen'),
          'bg-[var(--photo-background)] text-[var(--photo-text)] font-body',
        )}
        data-mol-id="lustra-mobile-shell"
      >
        <header className="sticky top-0 z-40 border-b border-[var(--photo-border)] bg-[var(--photo-surface)]/90 backdrop-blur-md">
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              cm.sp('px', 4),
              'h-14',
            )}
          >
            <BrandWordmark size="sm" to="/library" />
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <span
                data-mol-id="lustra-account-plan"
                data-plan-key={billing?.planKey ?? 'unknown'}
                className={cm.cn(
                  'px-2 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--photo-panel-text-highlight)] bg-[var(--photo-accent)]/15 border border-[var(--photo-accent)]/30',
                )}
              >
                {planLabel}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                data-mol-id="lustra-logout"
                aria-label={t('settings.logOut', {}, { defaultValue: 'Sign out' })}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'w-10 h-10 rounded-md text-[var(--photo-text-muted)] hover:text-[var(--photo-text)] hover:bg-[var(--photo-surface-elevated)] transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[20px]')} aria-hidden="true">
                  logout
                </span>
              </button>
            </div>
          </div>
          <nav
            aria-label={navLabel}
            data-mol-id="lustra-mobile-nav"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              'pb-2 overflow-x-auto',
            )}
          >
            <NavLink
              to="/editor"
              data-mol-id="lustra-mobile-new-edit"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.roundedFull,
                'whitespace-nowrap text-white bg-gradient-to-r from-[var(--photo-accent)] to-[var(--photo-danger)]',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                add_a_photo
              </span>
              {t('photoEditorLayout.newEdit', {}, { defaultValue: 'New edit' })}
            </NavLink>
            {NAV.map((item) => {
              const active =
                location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  data-mol-id={`lustra-mobile-nav-${item.icon}`}
                  aria-current={active ? 'page' : undefined}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('xs'),
                    cm.fontWeight('medium'),
                    cm.roundedFull,
                    'whitespace-nowrap border transition-colors',
                    active
                      ? 'bg-[var(--photo-accent)]/20 text-[var(--photo-panel-text-highlight)] border-[var(--photo-accent)]/60'
                      : 'bg-transparent text-[var(--photo-text-muted)] border-[var(--photo-border)]',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[14px]')}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  {t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
                </NavLink>
              )
            })}
          </nav>
          {(title || toolbar) && (
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'border-t border-[var(--photo-border)]',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
                {title && (
                  <h1
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      'tracking-tight text-[var(--photo-text)] truncate',
                    )}
                  >
                    {title}
                  </h1>
                )}
              </div>
              {toolbar && (
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}>
                  {toolbar}
                </div>
              )}
            </div>
          )}
        </header>
        <main className={cm.cn(cm.flex1, 'min-w-0', fullBleed ? '' : cm.sp('p', 4))}>
          {children}
        </main>
      </div>
    )
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'row' }),
        cm.minH('screen'),
        'bg-[var(--photo-background)] text-[var(--photo-text)] font-body',
      )}
    >
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('py', 6),
          'w-[260px] border-r border-[var(--photo-border)] bg-[var(--photo-surface)] shrink-0',
        )}
      >
        <div className={cm.cn(cm.sp('px', 6), cm.sp('mb', 8))}>
          <BrandWordmark size="md" to="/library" />
          <p
            className={cm.cn(
              'mt-1 font-mono text-[10px] uppercase tracking-widest text-[var(--photo-text-muted)]',
            )}
          >
            {t('photoEditorLayout.tagline', {}, { defaultValue: 'Light bends to your will' })}
          </p>
        </div>

        <NavLink
          to="/editor"
          data-mol-id="lustra-new-edit"
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            cm.sp('mx', 4),
            cm.sp('mb', 6),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'rounded-lg text-white bg-gradient-to-r from-[var(--photo-accent)] to-[var(--photo-danger)] hover:opacity-90 transition-opacity',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
            add_a_photo
          </span>
          <span>{t('photoEditorLayout.newEdit', {}, { defaultValue: 'New edit' })}</span>
        </NavLink>

        <nav className={cm.cn(cm.flex1, cm.sp('px', 4), cm.stack(1))}>
          {NAV.map((item) => {
            const active =
              location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                data-mol-id={`lustra-nav-${item.icon}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-md transition-colors',
                  active
                    ? 'bg-[var(--photo-accent)]/15 text-[var(--photo-panel-text-highlight)] border-l-2 border-[var(--photo-accent)]'
                    : 'text-[var(--photo-text-muted)] hover:bg-[var(--photo-surface-elevated)] hover:text-[var(--photo-text)]',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                  {item.icon}
                </span>
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
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('pt', 4),
              'border-t border-[var(--photo-border)]',
            )}
          >
            <div
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.flex({ align: 'center', justify: 'center' }),
                'rounded-full bg-gradient-to-br from-[var(--photo-accent)] to-[var(--photo-danger)] text-white font-bold text-sm',
              )}
              aria-hidden="true"
            >
              {userInitial}
            </div>
            <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0', 'flex-1')}>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-[var(--photo-text)] truncate',
                )}
                data-mol-id="lustra-account-email"
              >
                {user?.email ?? t('photoEditorLayout.guest', {}, { defaultValue: 'Photographer' })}
              </span>
              <span
                className={cm.cn(
                  'text-[10px] font-mono uppercase tracking-widest text-[var(--photo-text-muted)]',
                )}
                data-mol-id="lustra-account-plan"
                data-plan-key={billing?.planKey ?? 'unknown'}
              >
                {planLabel}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              data-mol-id="lustra-logout"
              aria-label={t('settings.logOut', {}, { defaultValue: 'Sign out' })}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'w-7 h-7 rounded-md text-[var(--photo-text-muted)] hover:text-[var(--photo-text)] hover:bg-[var(--photo-surface-elevated)] transition-colors',
              )}
              title={t('settings.logOut', {}, { defaultValue: 'Sign out' })}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                logout
              </span>
            </button>
          </div>
        </div>
      </aside>

      <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 6),
            'h-14 border-b border-[var(--photo-border)] bg-[var(--photo-surface)]/85 backdrop-blur-md',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            {title && (
              <h1
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'tracking-tight text-[var(--photo-text)]',
                )}
              >
                {title}
              </h1>
            )}
            {breadcrumb && (
              <span
                className={cm.cn(
                  'font-mono text-[11px] uppercase tracking-widest text-[var(--photo-text-muted)]',
                )}
              >
                {breadcrumb}
              </span>
            )}
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>{toolbar}</div>
        </header>

        <main className={cm.cn(cm.flex1, 'overflow-y-auto', fullBleed ? '' : cm.sp('p', 6))}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default PhotoEditorLayout
