import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { formatHms } from '../lib/format.js'
import { TimerProvider, useTimer } from '../lib/TimerContext.js'
import type { ApiProject } from '../lib/types.js'
import { unwrapList } from '../lib/unwrap.js'

interface NavItem {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
}

const NAV_PRIMARY: ReadonlyArray<NavItem> = [
  { to: '/dashboard', icon: 'dashboard', labelKey: 'nav.dashboard', defaultLabel: 'Dashboard' },
  { to: '/entries', icon: 'list', labelKey: 'nav.entries', defaultLabel: 'Time Entries' },
  {
    to: '/timesheet',
    icon: 'calendar_view_week',
    labelKey: 'nav.timesheet',
    defaultLabel: 'Timesheet',
  },
]

const NAV_WORK: ReadonlyArray<NavItem> = [
  { to: '/projects', icon: 'folder_open', labelKey: 'nav.projects', defaultLabel: 'Projects' },
  { to: '/clients', icon: 'business_center', labelKey: 'nav.clients', defaultLabel: 'Clients' },
]

const NAV_INSIGHTS: ReadonlyArray<NavItem> = [
  { to: '/reports', icon: 'analytics', labelKey: 'nav.reports', defaultLabel: 'Reports' },
  { to: '/invoices', icon: 'receipt_long', labelKey: 'nav.invoices', defaultLabel: 'Invoices' },
]

const NAV_ALL: ReadonlyArray<NavItem> = [...NAV_PRIMARY, ...NAV_WORK, ...NAV_INSIGHTS]

/**
 * true at >= 768px (the desktop sidebar's comfortable width), false below.
 * Media-query driven so exactly ONE shell is mounted at a time — the mobile
 * shell must not duplicate the desktop <Outlet /> (double fetches, duplicate
 * DOM, double text matches for locators).
 */
function useIsDesktop(): boolean {
  const query = '(min-width: 768px)'
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

/** Timer controls shared by the desktop TimerBar and the mobile timer header. */
function useTimerControls() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { running, elapsedSeconds, start, stop, updateRunning } = useTimer()

  const [projects, setProjects] = useState<ReadonlyArray<ApiProject>>([])
  const [description, setDescription] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/projects')
      .then((res) => {
        if (cancelled) return
        setProjects(unwrapList<ApiProject>(res))
      })
      .catch(() => {
        if (!cancelled) setProjects([])
      })
    return () => {
      cancelled = true
    }
  }, [http])

  // Sync local description with server-side running entry whenever it changes.
  useEffect(() => {
    setDescription(running?.description ?? '')
  }, [running?.id, running?.description])

  const project = useMemo(
    () => projects.find((p) => p.id === running?.project_id) ?? null,
    [projects, running?.project_id],
  )

  const onStartStop = async () => {
    if (pending) return
    setPending(true)
    try {
      if (running) {
        await stop()
      } else {
        await start({ description, is_billable: true })
        navigate('/entries')
      }
    } finally {
      setPending(false)
    }
  }

  const onDescriptionBlur = async () => {
    if (!running) return
    if ((running.description ?? '') === description) return
    await updateRunning({ description })
  }

  const onProjectChange = async (projectId: string | null) => {
    if (!running) return
    await updateRunning({ project_id: projectId })
  }

  return {
    cm,
    t,
    projects,
    description,
    setDescription,
    pending,
    onStartStop,
    onDescriptionBlur,
    onProjectChange,
    running,
    elapsedSeconds,
    project,
    isRunning: !!running,
    isBillable: !!running?.is_billable,
  }
}

function TimerBar() {
  const {
    cm,
    t,
    projects,
    description,
    setDescription,
    pending,
    onStartStop,
    onDescriptionBlur,
    onProjectChange,
    running,
    elapsedSeconds,
    project,
    isRunning,
    isBillable,
  } = useTimerControls()

  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        'px-4 lg:px-8',
        cm.h(16),
        'sticky top-0 z-40 backdrop-blur-xl border-b transition-colors gap-2',
        isRunning ? 'bg-success-light/80 border-emerald-200/50' : 'bg-surface/80 border-border/60',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
        <button
          onClick={() => void onStartStop()}
          disabled={pending}
          type="button"
          aria-label={
            isRunning
              ? t('timer.stop', {}, { defaultValue: 'Stop timer' })
              : t('timer.start', {}, { defaultValue: 'Start timer' })
          }
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(11),
            cm.h(11),
            cm.roundedFull,
            'text-inverse-on-surface shadow transition-all active:scale-95',
            isRunning ? '' : 'bg-inverse-surface hover:bg-inverse-surface',
            pending ? 'opacity-60 cursor-not-allowed' : '',
          )}
          style={
            isRunning
              ? {
                  backgroundColor: 'var(--color-timer-running)',
                  boxShadow: 'var(--shadow-timer)',
                }
              : undefined
          }
          data-test="timer-toggle"
        >
          <span
            className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {isRunning ? 'stop' : 'play_arrow'}
          </span>
        </button>
        <div className={cm.flex({ direction: 'col' })}>
          <span
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'tabular-nums font-mono leading-none',
              isRunning ? 'text-success' : 'text-foreground',
            )}
            data-test="timer-elapsed"
          >
            {formatHms(elapsedSeconds)}
          </span>
          <span
            className={cm.cn(
              'text-[10px] uppercase tracking-widest font-bold hidden lg:block',
              isRunning ? 'text-success/80' : 'text-foreground-secondary',
            )}
          >
            {isRunning
              ? t(
                  'timer.runningWithProject',
                  {
                    project:
                      project?.name ?? t('timer.noProject', {}, { defaultValue: 'No project' }),
                  },
                  { defaultValue: 'Tracking — {{project}}' },
                )
              : t('timer.idle', {}, { defaultValue: 'Idle — start tracking' })}
          </span>
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'min-w-0')}>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={onDescriptionBlur}
          placeholder={t(
            'timer.descriptionPlaceholder',
            {},
            { defaultValue: 'What are you working on?' },
          )}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'w-32 min-w-0 lg:w-80',
            'bg-surface/80 border rounded-lg focus:outline-none focus:ring-2 transition-all',
            isRunning
              ? 'border-emerald-200/60 focus:ring-emerald-500/30'
              : 'border-border focus:ring-blue-500/30',
          )}
          data-test="timer-description"
        />
        {isRunning && (
          <select
            value={running?.project_id ?? ''}
            onChange={(e) => void onProjectChange(e.target.value || null)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'max-w-[8rem] min-w-0',
              'bg-surface/80 border border-emerald-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30',
            )}
            data-test="timer-project"
          >
            <option value="">{t('timer.noProject', {}, { defaultValue: 'No project' })}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        {isRunning && isBillable && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              'text-[11px] uppercase tracking-widest font-black bg-violet-100 text-violet-700',
            )}
          >
            <span className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}>
              attach_money
            </span>
            {t('timer.billable', {}, { defaultValue: 'Billable' })}
          </span>
        )}
      </div>
    </header>
  )
}

interface UserShape {
  id?: string
  name?: string | null
  email?: string | null
}

function useCurrentUser() {
  const { user, logout } = useAuth<UserShape>()
  const navigate = useNavigate()

  const onSignOut = async () => {
    try {
      await logout()
    } finally {
      navigate('/login')
    }
  }

  const initials = (() => {
    const source = user?.name || user?.email || ''
    const parts = source
      .trim()
      .split(/[\s@.]+/)
      .filter(Boolean)
    if (parts.length === 0) return '?'
    const first = parts[0]?.[0] ?? ''
    const second = parts[1]?.[0] ?? ''
    return (first + second).toUpperCase() || '?'
  })()

  return { user, onSignOut, initials }
}

function DesktopSidebar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, onSignOut, initials } = useCurrentUser()

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + '/')

  const navLinkClass = (to: string) =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.sp('px', 4),
      cm.sp('py', 3),
      cm.textSize('sm'),
      cm.fontWeight('medium'),
      'rounded-lg transition-all duration-150',
      isActive(to)
        ? 'bg-surface/10 text-white border-l-[3px] border-emerald-400 -ml-[3px]'
        : 'text-foreground-tertiary hover:bg-surface/5 hover:text-white',
    )

  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.h('screen'),
        'w-[240px] sticky top-0 left-0 bg-foreground text-foreground-tertiary',
      )}
    >
      <Link
        to="/dashboard"
        className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-h-11 min-w-0 items-center')}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(9),
            cm.h(9),
            'rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 text-white shadow-lg',
          )}
        >
          <span
            className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            schedule
          </span>
        </div>
        <div className={cm.flex({ direction: 'col' })}>
          <span
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tracking-tight text-white')}
          >
            {t('brand.name', {}, { defaultValue: APP_NAME })}
          </span>
          <span className={cm.cn('text-[10px] uppercase tracking-widest text-foreground-tertiary')}>
            {t('brand.tagline', {}, { defaultValue: 'Every second' })}
          </span>
        </div>
      </Link>

      <nav className={cm.cn(cm.flex1, cm.sp('px', 3), cm.stack(1), 'overflow-y-auto')}>
        {NAV_PRIMARY.map((item) => (
          <NavLink key={item.to} to={item.to} className={() => navLinkClass(item.to)}>
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
              {item.icon}
            </span>
            <span>{t(item.labelKey, {}, { defaultValue: item.defaultLabel })}</span>
          </NavLink>
        ))}

        <div className={cm.cn(cm.sp('px', 4), cm.sp('mt', 4), cm.sp('mb', 1))}>
          <span
            className={cm.cn(
              'text-[10px] uppercase tracking-widest text-foreground-tertiary font-bold', // foreground-secondary (#475569) was 2.35:1 on the dark sidebar; tertiary (#94a3b8) = 6.9:1, matching the inactive nav items
            )}
          >
            {t('nav.workSection', {}, { defaultValue: 'Work' })}
          </span>
        </div>
        {NAV_WORK.map((item) => (
          <NavLink key={item.to} to={item.to} className={() => navLinkClass(item.to)}>
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
              {item.icon}
            </span>
            <span>{t(item.labelKey, {}, { defaultValue: item.defaultLabel })}</span>
          </NavLink>
        ))}

        <div className={cm.cn(cm.sp('px', 4), cm.sp('mt', 4), cm.sp('mb', 1))}>
          <span
            className={cm.cn(
              'text-[10px] uppercase tracking-widest text-foreground-tertiary font-bold', // foreground-secondary (#475569) was 2.35:1 on the dark sidebar; tertiary (#94a3b8) = 6.9:1, matching the inactive nav items
            )}
          >
            {t('nav.insightsSection', {}, { defaultValue: 'Insights' })}
          </span>
        </div>
        {NAV_INSIGHTS.map((item) => (
          <NavLink key={item.to} to={item.to} className={() => navLinkClass(item.to)}>
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
              {item.icon}
            </span>
            <span>{t(item.labelKey, {}, { defaultValue: item.defaultLabel })}</span>
          </NavLink>
        ))}
      </nav>

      <div className={cm.cn(cm.sp('p', 4), cm.stack(2), 'border-t border-surface/5')}>
        <NavLink
          to="/settings"
          className={({ isActive: a }) =>
            cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'rounded-lg transition-all',
              a
                ? 'bg-surface/10 text-white'
                : 'text-foreground-tertiary hover:bg-surface/5 hover:text-white',
            )
          }
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>settings</span>
          <span>{t('nav.settings', {}, { defaultValue: 'Settings' })}</span>
        </NavLink>
        {user?.id && (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-lg bg-surface/5',
            )}
            data-test="layout-user"
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(8),
                cm.h(8),
                'rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 text-white text-xs font-bold',
              )}
              aria-hidden
            >
              {initials}
            </div>
            <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0 flex-1')}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-white truncate',
                )}
              >
                {user.name || user.email || ''}
              </span>
              {user.email && user.name && (
                <span className={cm.cn('text-[10px] text-foreground-tertiary truncate')}>
                  {user.email}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => void onSignOut()}
              aria-label={t('settings.logOut', {}, { defaultValue: 'Sign out' })}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(8),
                cm.h(8),
                'rounded-lg text-foreground-tertiary hover:text-white hover:bg-surface/10 transition-colors',
              )}
              data-test="sign-out"
            >
              <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>logout</span>
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => navigate('/entries')}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.w('full'),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl shadow-lg active:scale-[0.98] transition-transform',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>add</span>
          {t('nav.newEntry', {}, { defaultValue: 'New Entry' })}
        </button>
      </div>
    </aside>
  )
}

/**
 * Template-local mobile shell (below 768px): a sticky timer header (the
 * product's primary control) with a hamburger that opens a left drawer
 * carrying the same nav items as the desktop sidebar. The desktop sidebar
 * has no mobile collapse, so this is the app's own compact shell — same
 * brand, labels, active highlighting and data-test hooks, sized for a 390px
 * viewport with >=44px tap targets.
 */
function MobileShell() {
  const {
    cm,
    t,
    projects,
    description,
    setDescription,
    pending,
    onStartStop,
    onDescriptionBlur,
    onProjectChange,
    running,
    elapsedSeconds,
    isRunning,
    isBillable,
  } = useTimerControls()
  const { user, onSignOut, initials } = useCurrentUser()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // While open: Escape closes the drawer, background scroll locks (the one
  // gap the shell family's drawer contract names that this hand-rolled
  // shell was missing — the APG dialog behavior itself is otherwise
  // equivalent, so the shell stays template-local).
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [drawerOpen])

  // Same longest-prefix active resolution the desktop sidebar applies.
  const activeTo =
    NAV_ALL.reduce<string | null>((best, item) => {
      const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
      if (!isMatch) return best
      if (best === null) return item.to
      return item.to.length > best.length ? item.to : best
    }, null) ?? ''

  const navLabel = (item: NavItem) => t(item.labelKey, {}, { defaultValue: item.defaultLabel })
  const navAriaLabel = t('nav.primary', {}, { defaultValue: 'Primary navigation' })

  const drawerLinkClass = (to: string) =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.sp('px', 4),
      cm.sp('py', 3),
      cm.textSize('sm'),
      cm.fontWeight('medium'),
      'rounded-lg min-h-11 transition-all',
      activeTo === to || (to === '/settings' && pathname.startsWith('/settings'))
        ? 'bg-surface/15 text-white'
        : 'text-foreground-tertiary hover:bg-surface/5 hover:text-white',
    )

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface-secondary antialiased',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'sticky top-0 z-40 border-b backdrop-blur-xl transition-colors',
          isRunning
            ? 'bg-success-light/90 border-emerald-200/50'
            : 'bg-surface/90 border-border/60',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            'h-14 shrink-0',
          )}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t('nav.openMenu', {}, { defaultValue: 'Open navigation menu' })}
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav-drawer"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-11 w-11 shrink-0 rounded-full text-foreground hover:bg-surface-secondary transition-colors',
            )}
            data-test="mobile-nav-toggle"
          >
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>menu</span>
          </button>
          <Link
            to="/dashboard"
            className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(8),
                cm.h(8),
                'shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 text-white shadow',
              )}
            >
              <span
                className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                schedule
              </span>
            </div>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'tracking-tight text-foreground truncate',
              )}
            >
              {t('brand.name', {}, { defaultValue: APP_NAME })}
            </span>
          </Link>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'ml-auto shrink-0')}>
            <span
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                'tabular-nums font-mono',
                isRunning ? 'text-success' : 'text-foreground',
              )}
              data-test="timer-elapsed"
            >
              {formatHms(elapsedSeconds)}
            </span>
            <button
              onClick={() => void onStartStop()}
              disabled={pending}
              type="button"
              aria-label={
                isRunning
                  ? t('timer.stop', {}, { defaultValue: 'Stop timer' })
                  : t('timer.start', {}, { defaultValue: 'Start timer' })
              }
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'h-12 w-12 shrink-0 rounded-full text-inverse-on-surface shadow transition-all active:scale-95',
                isRunning ? '' : 'bg-inverse-surface hover:bg-inverse-surface',
                pending ? 'opacity-60 cursor-not-allowed' : '',
              )}
              style={
                isRunning
                  ? {
                      backgroundColor: 'var(--color-timer-running)',
                      boxShadow: 'var(--shadow-timer)',
                    }
                  : undefined
              }
              data-test="timer-toggle"
            >
              <span
                className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {isRunning ? 'stop' : 'play_arrow'}
              </span>
            </button>
          </div>
        </div>
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('px', 3), cm.sp('pb', 2))}
        >
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={onDescriptionBlur}
            placeholder={t(
              'timer.descriptionPlaceholder',
              {},
              { defaultValue: 'What are you working on?' },
            )}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'min-w-0 flex-1 min-h-11 bg-surface border rounded-lg focus:outline-none focus:ring-2 transition-all',
              isRunning
                ? 'border-emerald-200/60 focus:ring-emerald-500/30'
                : 'border-border focus:ring-blue-500/30',
            )}
            data-test="timer-description"
          />
          {isRunning && (
            <select
              value={running?.project_id ?? ''}
              onChange={(e) => void onProjectChange(e.target.value || null)}
              aria-label={t('nav.project', {}, { defaultValue: 'Project' })}
              className={cm.cn(
                cm.sp('px', 2),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'max-w-[9rem] bg-surface border border-emerald-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30',
              )}
              data-test="timer-project"
            >
              <option value="">{t('timer.noProject', {}, { defaultValue: 'No project' })}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          {isRunning && isBillable && (
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.sp('px', 2),
                'h-8 shrink-0 rounded-full bg-violet-100 text-violet-700',
              )}
              aria-label={t('timer.billable', {}, { defaultValue: 'Billable' })}
            >
              <span className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}>
                attach_money
              </span>
            </span>
          )}
        </div>
      </header>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label={t('nav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/40"
          />
          <nav
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={navAriaLabel}
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'absolute left-0 top-0 h-full w-72 max-w-[85vw] overflow-y-auto bg-foreground p-4 shadow-xl',
            )}
          >
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
            >
              <Link
                to="/dashboard"
                className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
                onClick={() => setDrawerOpen(false)}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(8),
                    cm.h(8),
                    'rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 text-white',
                  )}
                >
                  <span
                    className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    schedule
                  </span>
                </div>
                <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-white')}>
                  {t('brand.name', {}, { defaultValue: APP_NAME })}
                </span>
              </Link>
              <button
                type="button"
                aria-label={t('nav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
                onClick={() => setDrawerOpen(false)}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-10 w-10 rounded-full text-foreground-tertiary hover:bg-surface/10 hover:text-white',
                )}
              >
                <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>close</span>
              </button>
            </div>

            <div className={cm.cn(cm.stack(1))}>
              {NAV_ALL.map((item) => {
                const isActive = activeTo === item.to
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setDrawerOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={() => drawerLinkClass(item.to)}
                  >
                    <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                      {item.icon}
                    </span>
                    <span>{navLabel(item)}</span>
                  </NavLink>
                )
              })}
              <NavLink
                to="/settings"
                onClick={() => setDrawerOpen(false)}
                className={({ isActive: a }) =>
                  cm.cn(drawerLinkClass('/settings'), a ? 'bg-surface/15 text-white' : '')
                }
              >
                <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                  settings
                </span>
                <span>{t('nav.settings', {}, { defaultValue: 'Settings' })}</span>
              </NavLink>
            </div>

            <div
              className={cm.cn(
                cm.flex({ direction: 'col' }),
                cm.stack(2),
                cm.sp('mt', 4),
                'border-t border-surface/10 pt-4',
              )}
            >
              {user?.id && (
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-lg bg-surface/5',
                  )}
                  data-test="layout-user"
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(9),
                      cm.h(9),
                      'rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 text-white text-xs font-bold',
                    )}
                    aria-hidden
                  >
                    {initials}
                  </div>
                  <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0 flex-1')}>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'text-white truncate',
                      )}
                    >
                      {user.name || user.email || ''}
                    </span>
                    {user.email && user.name && (
                      <span className={cm.cn('text-[10px] text-foreground-tertiary truncate')}>
                        {user.email}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void onSignOut()}
                    aria-label={t('settings.logOut', {}, { defaultValue: 'Sign out' })}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(11),
                      cm.h(11),
                      'shrink-0 rounded-lg text-foreground-tertiary hover:text-white hover:bg-surface/10 transition-colors',
                    )}
                    data-test="sign-out"
                  >
                    <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>
                      logout
                    </span>
                  </button>
                </div>
              )}
              <Link
                to="/entries"
                onClick={() => setDrawerOpen(false)}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl shadow-lg active:scale-[0.98] transition-transform',
                )}
              >
                <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>add</span>
                {t('nav.newEntry', {}, { defaultValue: 'New Entry' })}
              </Link>
            </div>
          </nav>
        </div>
      ) : null}

      <main className={cm.cn('min-w-0 flex-1')}>
        <Outlet />
      </main>
    </div>
  )
}

export function TimeTrackingLayout() {
  const isDesktop = useIsDesktop()
  const cm = getClassMap()

  return (
    <TimerProvider>
      {isDesktop ? (
        <div className={cm.cn(cm.flex({}), cm.minH('screen'), 'bg-surface-secondary antialiased')}>
          <DesktopSidebar />
          {/* min-w-0 lets the flex item shrink below its content's min width, so
              page-level tables scroll INSIDE their overflow-x-auto wrappers
              instead of widening the whole app (tablet 768px overflow). */}
          <main
            className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }), cm.minH('screen'), 'min-w-0')}
          >
            <TimerBar />
            <div className={cm.cn('flex-1 overflow-y-auto')}>
              <Outlet />
            </div>
          </main>
        </div>
      ) : (
        <MobileShell />
      )}
    </TimerProvider>
  )
}

export default TimeTrackingLayout
