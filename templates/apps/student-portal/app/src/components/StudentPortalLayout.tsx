import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'
import { UserMenu } from './UserMenu.js'

/**
 * Authenticated app shell — sidebar + topbar + scrolling content area on
 * desktop; a sticky top bar with a slide-in drawer below `md` (768px).
 * Translated visual treatment from lms/StudentLayout.tsx (sidebar +
 * topbar pattern) but rewritten through ClassMap so it inherits the
 * Chalk palette via theme tokens (no hardcoded colors).
 *
 * Responsive contract: the fixed sidebar and its twin chrome (search,
 * user block) are `hidden md:…`; the mobile top bar + drawer are `md:hidden`.
 * The drawer renders ONLY while open, so `nav-*` data-mol-ids stay unique
 * in the DOM at any moment (strict-mode locator safety).
 */
export function StudentPortalLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<{ id?: string; name?: string; email?: string }>()
  const http = useHttpClient()
  const [gpa, setGpa] = useState<number | null>(null)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    Promise.all([
      http.get('/api/grades/gpa').then((r) => unwrapSingle<{ gpa?: number }>(r)),
      http
        .get('/api/messages')
        .then((r) => unwrapList<{ read_at?: string | null; recipient_id: string }>(r)),
    ])
      .then(([gpaRes, msgs]) => {
        if (cancelled) return
        if (gpaRes && typeof gpaRes.gpa === 'number') setGpa(gpaRes.gpa)
        const unread = msgs.filter((m) => !m.read_at && m.recipient_id === user.id).length
        setUnreadMessages(unread)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http, user])

  const navItems = [
    {
      to: '/dashboard',
      icon: 'dashboard',
      label: t('nav.dashboard', {}, { defaultValue: 'Dashboard' }),
      end: true,
    },
    {
      to: '/schedule',
      icon: 'event',
      label: t('nav.schedule', {}, { defaultValue: 'Schedule' }),
      end: false,
    },
    {
      to: '/grades',
      icon: 'grade',
      label: t('nav.grades', {}, { defaultValue: 'Grades' }),
      end: false,
    },
    {
      to: '/assignments',
      icon: 'assignment',
      label: t('nav.assignments', {}, { defaultValue: 'Assignments' }),
      end: false,
    },
    {
      to: '/calendar',
      icon: 'calendar_month',
      label: t('nav.calendar', {}, { defaultValue: 'Calendar' }),
      end: false,
    },
    {
      to: '/attendance',
      icon: 'how_to_reg',
      label: t('nav.attendance', {}, { defaultValue: 'Attendance' }),
      end: false,
    },
    {
      to: '/messages',
      icon: 'forum',
      label: t('nav.messages', {}, { defaultValue: 'Messages' }),
      end: false,
    },
    {
      to: '/notifications',
      icon: 'notifications',
      label: t('settings.notifications', {}, { defaultValue: 'Notifications' }),
      end: false,
    },
    {
      to: '/settings',
      icon: 'settings',
      label: t('nav.settings', {}, { defaultValue: 'Settings' }),
      end: false,
    },
  ] as const

  const navLinkClass = (isActive: boolean) =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.sp('px', 4),
      cm.sp('py', 2),
      cm.textSize('sm'),
      'rounded-r-lg border-l-4 transition-colors',
      isActive
        ? 'border-primary bg-primary/10 font-semibold text-primary'
        : 'border-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
    )

  const gpaCard = (
    <div
      className={cm.cn(
        cm.sp('mt', 4),
        cm.sp('p', 4),
        'rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-on-primary',
      )}
    >
      <p className={cm.cn(cm.textSize('xs'), 'font-bold uppercase tracking-widest opacity-80')}>
        {t('nav.statusEyebrow', {}, { defaultValue: 'Term GPA' })}
      </p>
      <p className={cm.cn(cm.textSize('2xl'), 'mt-1 font-extrabold tabular-nums')}>
        {gpa != null ? gpa.toFixed(2) : '—'}
      </p>
      <p className={cm.cn(cm.textSize('xs'), 'mt-1 opacity-80')}>
        {t('nav.statusSubtext', {}, { defaultValue: 'Honor roll · Spring term' })}
      </p>
    </div>
  )

  return (
    <div
      data-mol-id="student-portal-layout"
      className={cm.cn(cm.minH('screen'), 'bg-background text-on-background antialiased')}
    >
      {/* ── Desktop sidebar (≥768px) ─────────────────────────────────── */}
      <aside
        data-mol-id="student-portal-sidebar"
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('p', 5),
          'fixed left-0 top-0 h-full w-[260px] z-40 bg-surface border-r border-outline-variant/40 hidden md:flex',
        )}
      >
        <NavLink
          to="/dashboard"
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 8))}
        >
          <span
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-primary/10 text-primary',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
              menu_book
            </span>
          </span>
          <span className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-primary')}>
            {APP_NAME}
          </span>
        </NavLink>

        <nav className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.flex1)}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-mol-id={`nav-${item.to.replace(/\//g, '-').replace(/^-/, '')}`}
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('xl'))}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {gpaCard}
      </aside>

      {/* ── Desktop topbar (≥768px) ──────────────────────────────────── */}
      <header
        data-mol-id="student-portal-topbar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          'fixed left-[260px] right-0 top-0 h-14 z-30 bg-surface/95 backdrop-blur-md border-b border-outline-variant/40 hidden md:flex',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'relative w-80 max-w-full')}>
          <span
            className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 12,
              top: 8,
              color: 'var(--color-on-surface-variant)',
            }}
          >
            search
          </span>
          <input
            data-mol-id="student-portal-search"
            type="text"
            placeholder={t(
              'topbar.searchPlaceholder',
              {},
              { defaultValue: 'Search classes, assignments…' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-full bg-surface-container-low pl-10 pr-4 text-on-surface placeholder:text-on-surface-variant border-none focus:outline-none focus:ring-2 focus:ring-primary/40',
            )}
          />
        </div>

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          {unreadMessages > 0 && (
            <NavLink
              to="/messages"
              data-mol-id="topbar-notifications"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                'rounded-full bg-error/10 font-bold text-error',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}
                aria-hidden="true"
              >
                notifications_active
              </span>
              <span>
                {t('common.countNew', { count: unreadMessages }, { defaultValue: '{{count}} new' })}
              </span>
            </NavLink>
          )}
          <div className={cm.cn(cm.textRight, 'leading-tight')}>
            <p className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface')}>
              {user?.name || user?.email || t('topbar.guestName', {}, { defaultValue: 'Student' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {user?.id
                ? t(
                    'topbar.studentTag',
                    { id: user.id.slice(0, 6) },
                    { defaultValue: 'Student · #{{id}}' },
                  )
                : t('topbar.studentRole', {}, { defaultValue: 'Student' })}
            </p>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* ── Mobile top bar (<768px) — sticky, 56px ───────────────────── */}
      <header
        data-mol-id="student-portal-mobile-topbar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 3),
          'sticky top-0 z-40 h-14 bg-surface/95 backdrop-blur-md border-b border-outline-variant/40 md:hidden',
        )}
      >
        <button
          type="button"
          data-mol-id="mobile-nav-toggle"
          aria-label={t('nav.openMenu', {}, { defaultValue: 'Open navigation menu' })}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(11),
            cm.h(11),
            cm.roundedFull,
            cm.textSize('xl'),
            'text-on-surface hover:bg-surface-container-low transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
            menu
          </span>
        </button>

        <NavLink
          to="/dashboard"
          className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
          data-mol-id="mobile-home-link"
        >
          <span className={cm.cn('material-symbols-outlined text-primary')} aria-hidden="true">
            menu_book
          </span>
          <span className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-primary')}>
            {APP_NAME}
          </span>
        </NavLink>

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
          {unreadMessages > 0 && (
            <NavLink
              to="/messages"
              data-mol-id="topbar-notifications"
              aria-label={t('nav.unreadMessages', {}, { defaultValue: 'Unread messages' })}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(10),
                cm.h(10),
                cm.roundedFull,
                'bg-error/10 text-error',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}
                aria-hidden="true"
              >
                notifications_active
              </span>
            </NavLink>
          )}
          <UserMenu />
        </div>
      </header>

      {/* ── Mobile drawer — rendered only while open ─────────────────── */}
      {drawerOpen && (
        <div className={cm.cn('fixed inset-0 z-50 md:hidden')} data-mol-id="mobile-nav-drawer">
          <button
            type="button"
            aria-label={t('nav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
            onClick={() => setDrawerOpen(false)}
            className={cm.cn('absolute inset-0 w-full h-full bg-on-surface/40 backdrop-blur-sm')}
          />
          <div
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              cm.sp('p', 5),
              'absolute left-0 top-0 h-full w-[280px] max-w-[85vw] overflow-y-auto bg-surface shadow-2xl',
            )}
          >
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}
            >
              <span
                className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-primary')}
              >
                {APP_NAME}
              </span>
              <button
                type="button"
                data-mol-id="mobile-nav-close"
                aria-label={t('nav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
                onClick={() => setDrawerOpen(false)}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(11),
                  cm.h(11),
                  cm.roundedFull,
                  cm.textSize('xl'),
                  'text-on-surface-variant hover:bg-surface-container-low transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            <nav className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setDrawerOpen(false)}
                  data-mol-id={`nav-${item.to.replace(/\//g, '-').replace(/^-/, '')}`}
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <span
                    className={cm.cn('material-symbols-outlined', cm.textSize('xl'))}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
            {gpaCard}
          </div>
        </div>
      )}

      <main
        data-mol-id="student-portal-main"
        className={cm.cn(cm.sp('px', 3), 'md:ml-[260px] md:px-8 pb-12 pt-4 md:pt-20')}
      >
        <Outlet />
      </main>
    </div>
  )
}

export default StudentPortalLayout
