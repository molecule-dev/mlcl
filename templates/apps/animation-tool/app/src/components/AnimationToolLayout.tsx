/**
 * Vivace dark-workspace shell — left sidebar with mono-uppercase nav rail,
 * top app bar with breadcrumb + search + utility icons, full-bleed canvas slot.
 *
 * Bespoke per Vivace DESIGN.md. No polished cluster sibling; references the
 * dark-workspace pattern from ai-agent-playground (NeuronLayout) and the
 * sidebar treatment from api-documentation (PrismLayout).
 */
import { type ReactNode, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SafeLink } from './SafeLink.js'
import { UserMenu } from './UserMenu.js'
import { VivaceWordmark } from './VivaceWordmark.js'

interface AccountUser {
  email?: string | null
  name?: string | null
}

interface AnimationToolLayoutProps {
  title?: string
  breadcrumb?: ReactNode
  toolbar?: ReactNode
  children: ReactNode
  /** Render without the inner padding wrapper (Editor / StateMachine canvases). */
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
    labelKey: 'animationToolLayout.nav.dashboard',
    defaultLabel: 'Dashboard',
  },
  {
    to: '/projects',
    icon: 'folder_open',
    labelKey: 'animationToolLayout.nav.projects',
    defaultLabel: 'Projects',
  },
  {
    to: '/library',
    icon: 'video_library',
    labelKey: 'animationToolLayout.nav.library',
    defaultLabel: 'Library',
  },
  {
    to: '/assets',
    icon: 'collections',
    labelKey: 'animationToolLayout.nav.assets',
    defaultLabel: 'Assets',
  },
  {
    to: '/settings',
    icon: 'settings',
    labelKey: 'animationToolLayout.nav.settings',
    defaultLabel: 'Settings',
  },
]

interface SidebarContentsProps {
  /** Prefix for data-mol-ids so desktop + drawer copies never collide. */
  scope: 'anim' | 'anim-drawer'
  planName: string | null
  onNavigate: () => void
}

/** The sidebar body, shared by the desktop rail and the mobile drawer —
 *  wordmark, New Project CTA, nav, and the account chip. */
function SidebarContents({ scope, planName, onNavigate }: SidebarContentsProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<AccountUser>()
  const location = useLocation()

  return (
    <>
      <div className={cm.cn(cm.sp('px', 6), cm.sp('mb', 8))}>
        <VivaceWordmark size="md" to="/" />
        <p
          className={cm.cn('mt-1 font-mono text-[10px] uppercase tracking-widest')}
          style={{ color: 'var(--anim-text-muted)' }}
        >
          {t('animationToolLayout.tagline', {}, { defaultValue: 'Motion Engine' })}
        </p>
      </div>

      <SafeLink
        to="/projects"
        data-mol-id={`${scope}-new-project`}
        onClick={onNavigate}
        className={cm.cn(
          cm.fontWeight('semibold'),
          cm.flex({ align: 'center', justify: 'center', gap: 2 }),
          cm.sp('mx', 4),
          cm.sp('mb', 6),
          cm.sp('py', 2),
          cm.textSize('sm'),
          'rounded-lg hover:opacity-90 transition-opacity',
        )}
        style={{
          background: 'linear-gradient(135deg, var(--anim-primary) 0%, var(--anim-secondary) 100%)',
          color: 'var(--color-on-primary)',
        }}
      >
        <span className={cm.cn('material-symbols-outlined text-[18px]')}>add</span>
        <span>{t('animationToolLayout.newProject', {}, { defaultValue: 'New Project' })}</span>
      </SafeLink>

      <nav className={cm.cn(cm.flex1, cm.sp('px', 4), cm.stack(1))}>
        {NAV.map((item) => {
          const active =
            location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
          return (
            <SafeLink
              key={item.to}
              to={item.to}
              data-mol-id={`${scope}-nav-${item.icon}`}
              onClick={onNavigate}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 3 }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-md transition-colors',
              )}
              style={
                active
                  ? {
                      backgroundColor: 'color-mix(in srgb, var(--anim-primary) 10%, transparent)',
                      color: 'var(--anim-primary)',
                      borderLeft: '2px solid var(--anim-primary)',
                    }
                  : { color: 'var(--anim-text-secondary)' }
              }
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>{item.icon}</span>
              <span className={cm.fontWeight('medium')}>
                {t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
              </span>
            </SafeLink>
          )
        })}
      </nav>

      <div className={cm.cn(cm.sp('px', 6), cm.sp('mt', 4))}>
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('pt', 4), 'border-t')}
          style={{ borderColor: 'var(--anim-border)' }}
        >
          <div
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-full text-white font-bold text-sm shrink-0',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--anim-primary) 0%, var(--anim-secondary) 100%)',
            }}
          >
            {user?.email?.[0]?.toUpperCase() ?? 'V'}
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
            <span
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'truncate')}
              style={{ color: 'var(--anim-text)' }}
            >
              {user?.email ?? t('animationToolLayout.guest', {}, { defaultValue: 'Animator' })}
            </span>
            <span
              data-mol-id={`${scope}-plan-label`}
              className={cm.cn('text-[10px] font-mono uppercase tracking-widest')}
              style={{ color: 'var(--anim-text-muted)' }}
            >
              {planName ?? t('animationToolLayout.planLoading', {}, { defaultValue: '— plan' })}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

export function AnimationToolLayout({
  title,
  breadcrumb,
  toolbar,
  children,
  fullBleed = false,
}: AnimationToolLayoutProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<AccountUser>()
  const http = useHttpClient()
  const location = useLocation()
  const navigate = useNavigate()
  const [planName, setPlanName] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // ⌘K / Ctrl+K jumps to the Projects page, which hosts the real search
  // input — this backs the shortcut hint shown on the search button.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        navigate('/projects')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  // Route changes always dismiss the mobile drawer, so navigating from the
  // drawer lands the user on the page instead of behind the overlay.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Escape closes the drawer (a11y parity with the backdrop tap).
  useEffect(() => {
    if (!drawerOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  // Pull the user's actual plan name from /api/billing/status. The
  // hardcoded "Pro Plan" fallback that used to live here was the
  // canonical "write-only state" failure mode — every user saw "Pro"
  // regardless of their entitlement.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    http
      .get<{ name?: string; planKey?: string }>('/api/billing/status')
      .then((res) => {
        if (cancelled) return
        const data = (res.data ?? {}) as { name?: string; planKey?: string }
        setPlanName(data.name ?? null)
      })
      .catch(() => {
        if (cancelled) return
        setPlanName(null)
      })
    return () => {
      cancelled = true
    }
  }, [http, user])

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'row' }), cm.minH('screen'), 'font-body')}
      style={{ backgroundColor: 'var(--anim-background)', color: 'var(--anim-text)' }}
    >
      {/* Desktop sidebar — collapses out below md; the drawer takes over. */}
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('py', 6),
          'w-[260px] shrink-0 hidden md:flex',
        )}
        style={{
          backgroundColor: 'var(--anim-sidebar-bg)',
          borderRight: '1px solid var(--anim-border)',
        }}
      >
        <SidebarContents scope="anim" planName={planName} onNavigate={() => {}} />
      </aside>

      {/* Mobile drawer + backdrop — below md only. */}
      {drawerOpen ? (
        <div className={cm.cn('fixed inset-0 z-50 md:hidden')} role="dialog" aria-modal="true">
          <button
            type="button"
            data-mol-id="anim-drawer-backdrop"
            aria-label={t('common.close', {}, { defaultValue: 'Close menu' })}
            onClick={() => setDrawerOpen(false)}
            className={cm.cn('absolute inset-0 w-full h-full bg-black/60 cursor-default')}
          />
          <aside
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              cm.sp('py', 6),
              'absolute left-0 top-0 bottom-0 w-[280px] max-w-[85vw] overflow-y-auto',
            )}
            style={{
              backgroundColor: 'var(--anim-sidebar-bg)',
              borderRight: '1px solid var(--anim-border)',
            }}
          >
            <SidebarContents
              scope="anim-drawer"
              planName={planName}
              onNavigate={() => setDrawerOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 3),
            'md:px-6 h-14 sticky top-0 z-40 backdrop-blur-md',
          )}
          style={{
            borderBottom: '1px solid var(--anim-border)',
            backgroundColor: 'color-mix(in srgb, var(--anim-surface) 80%, transparent)',
          }}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), 'min-w-0')}>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              data-mol-id="anim-menu-toggle"
              className={cm.cn(
                cm.w(9),
                cm.h(9),
                cm.flex({ align: 'center', justify: 'center' }),
                'md:hidden rounded-md border transition-colors shrink-0',
              )}
              style={{ color: 'var(--anim-text-secondary)', borderColor: 'var(--anim-border)' }}
              aria-label={t('common.openMenu', {}, { defaultValue: 'Open menu' })}
              aria-expanded={drawerOpen}
            >
              <span className={cm.cn('material-symbols-outlined text-[20px]')}>menu</span>
            </button>
            {title && (
              <h1
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'font-headline tracking-tight truncate',
                )}
                style={{ color: 'var(--anim-text)' }}
              >
                {title}
              </h1>
            )}
            {breadcrumb && (
              <span
                className={cm.cn(
                  'font-mono text-[11px] uppercase tracking-widest truncate hidden sm:inline',
                )}
                style={{ color: 'var(--anim-text-muted)' }}
              >
                {breadcrumb}
              </span>
            )}
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'relative shrink-0')}>
            {toolbar}
            <button
              onClick={() => navigate('/projects')}
              type="button"
              data-mol-id="anim-search"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                'font-mono uppercase tracking-widest border rounded-full transition-colors',
              )}
              style={{
                color: 'var(--anim-text-muted)',
                borderColor: 'var(--anim-border)',
              }}
              aria-label={t('common.search', {}, { defaultValue: 'Search' })}
            >
              <span className={cm.cn('material-symbols-outlined text-[14px]')}>search</span>
              <span className="hidden md:inline">⌘K</span>
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

export default AnimationToolLayout
