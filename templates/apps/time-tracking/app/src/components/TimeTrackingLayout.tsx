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

function TimerBar() {
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

  const isRunning = !!running
  const isBillable = !!running?.is_billable

  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.h(16),
        'sticky top-0 z-40 backdrop-blur-xl border-b transition-colors',
        isRunning ? 'bg-success-light/80 border-emerald-200/50' : 'bg-surface/80 border-border/60',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
        <button
          onClick={onStartStop}
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
              'text-[10px] uppercase tracking-widest font-bold',
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
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
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
            cm.w(80),
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

export function TimeTrackingLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth<UserShape>()

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
    <TimerProvider>
      <div className={cm.cn(cm.flex({}), cm.minH('screen'), 'bg-surface-secondary antialiased')}>
        <aside
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            cm.h('screen'),
            'w-[240px] sticky top-0 left-0 bg-foreground text-foreground-tertiary',
          )}
        >
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 6),
              cm.sp('py', 6),
            )}
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
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'tracking-tight text-white',
                )}
              >
                {t('brand.name', {}, { defaultValue: APP_NAME })}
              </span>
              <span
                className={cm.cn('text-[10px] uppercase tracking-widest text-foreground-tertiary')}
              >
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
              <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                settings
              </span>
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
                  <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>
                    logout
                  </span>
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

        <main className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }), cm.minH('screen'))}>
          <TimerBar />
          <div className={cm.cn('flex-1 overflow-y-auto')}>
            <Outlet />
          </div>
        </main>
      </div>
    </TimerProvider>
  )
}

export default TimeTrackingLayout
