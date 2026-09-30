import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from '../components/BrandWordmark.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'
import { UserMenu } from './UserMenu.js'

/**
 * Authenticated app shell — the shared `ResponsiveAppShell`, composed the
 * fleet-canonical way: the brand leads the desktop Sidebar, the mobile-only
 * TopBar carries the menu trigger (rendered by the shell) plus the unread
 * badge and user menu, and the SAME nav element is passed to `.Sidebar` and
 * `.Drawer` so only the mounted breakpoint's copy ever instantiates (no
 * duplicate nav landmarks or `nav-*` data-mol-ids). The drawer is the
 * shell's full APG dialog: focus trap, Escape/backdrop close, scroll lock,
 * auto-close on navigation — the former hand-rolled hamburger + drawer
 * state + backdrop button is deleted with it. Translated visual treatment
 * from lms/StudentLayout.tsx (sidebar + topbar pattern) through ClassMap so
 * it inherits the Chalk palette via theme tokens (no hardcoded colors).
 */
export function StudentPortalLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<{ id?: string; name?: string; email?: string }>()
  const http = useHttpClient()
  const [gpa, setGpa] = useState<number | null>(null)
  const [unreadMessages, setUnreadMessages] = useState(0)

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

  // ONE nav element for both breakpoints — the Sidebar (≥768px) and the
  // Drawer (<768px) each render it, but only the mounted breakpoint's copy
  // instantiates. react-router's NavLink sets `aria-current="page"` on the
  // active link.
  const nav = (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.flex1)}>
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
    </div>
  )

  // Brand — leads the desktop sidebar, rides in the mobile-only TopBar and
  // the Drawer header. Breakpoint-exclusive mounts, so never duplicated.
  const brand = (
    <NavLink to="/dashboard" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
      <BrandWordmark as="span" />
    </NavLink>
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

  // Desktop user row — re-homed from the old fixed top bar into the sidebar
  // footer (the shared Sidebar has no header slot). The border-t separator
  // + hover-styled menu wrapper keep the chrome from rendering as bare
  // controls bolted onto the styled sidebar.
  const sidebarUser = (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        'mt-4 border-t border-outline-variant/40 pt-3',
      )}
    >
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
      <div className={cm.cn(cm.flex1, 'min-w-0 leading-tight')}>
        <p className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface truncate')}>
          {user?.name || user?.email || t('topbar.guestName', {}, { defaultValue: 'Student' })}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
          {user?.id
            ? t(
                'topbar.studentTag',
                { id: user.id.slice(0, 6) },
                { defaultValue: 'Student · #{{id}}' },
              )
            : t('topbar.studentRole', {}, { defaultValue: 'Student' })}
        </p>
      </div>
      <div className="text-on-surface-variant hover:text-on-surface transition-colors">
        <UserMenu />
      </div>
    </div>
  )

  return (
    <ResponsiveAppShell sidebarWidth="lg" dataMolId="student-portal-layout">
      {/*
        Mobile top bar (<768px): brand + the drawer menu trigger (rendered by
        the shell when a Drawer is composed), plus the unread badge and user
        menu. Desktop returns null — the sidebar carries the chrome there.
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={brand}
        actions={
          <>
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
          </>
        }
      />

      <ResponsiveAppShell.Sidebar
        dataMolId="student-portal-sidebar"
        className={cm.sp('p', 5)}
        footer={
          <>
            {sidebarUser}
            {gpaCard}
          </>
        }
      >
        <div className={cm.cn(cm.sp('mb', 8))}>{brand}</div>
        {nav}
      </ResponsiveAppShell.Sidebar>

      <ResponsiveAppShell.Drawer header={brand} footer={gpaCard}>
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content
        dataMolId="student-portal-main"
        className={cm.cn(cm.sp('px', 3), 'md:px-8 pb-12 pt-6')}
      >
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default StudentPortalLayout
