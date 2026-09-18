import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SafeLink } from './SafeLink.js'

interface SiftSidebarLink {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
  match?: (pathname: string) => boolean
  badgeKey?: 'queue' | 'notifications'
}

const PRIMARY_LINKS: SiftSidebarLink[] = [
  { to: '/dashboard', icon: 'dashboard', labelKey: 'sidebar.dashboard', defaultLabel: 'Dashboard' },
  {
    to: '/queue',
    icon: 'inventory_2',
    labelKey: 'sidebar.queue',
    defaultLabel: 'Queue',
    match: (p) => p.startsWith('/queue'),
    badgeKey: 'queue',
  },
  { to: '/rules', icon: 'rule', labelKey: 'sidebar.rules', defaultLabel: 'Rules' },
  {
    to: '/analytics',
    icon: 'analytics',
    labelKey: 'sidebar.analytics',
    defaultLabel: 'Analytics',
  },
  {
    to: '/notifications',
    icon: 'notifications_active',
    labelKey: 'sidebar.notifications',
    defaultLabel: 'Notifications',
    badgeKey: 'notifications',
  },
  { to: '/settings', icon: 'settings', labelKey: 'sidebar.settings', defaultLabel: 'Settings' },
]

interface QueueSummary {
  queued?: number
}

interface ApiNotification {
  id: string
  read_at: string | null
}

export function SiftSidebar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { pathname } = useLocation()
  const [queuedCount, setQueuedCount] = useState<number | null>(null)
  const [unreadCount, setUnreadCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get<QueueSummary>('/api/moderation/stats/summary').catch(() => null),
      http.get<ApiNotification[]>('/api/notifications').catch(() => null),
    ])
      .then(([summary, notifs]) => {
        if (cancelled) return
        const queued = summary?.data?.queued
        if (typeof queued === 'number') setQueuedCount(queued)
        const list = notifs?.data
        if (Array.isArray(list)) {
          setUnreadCount(list.filter((n) => !n.read_at).length)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http, pathname])

  const badgeFor = (key: SiftSidebarLink['badgeKey']): string | null => {
    if (key === 'queue' && queuedCount && queuedCount > 0) return String(queuedCount)
    if (key === 'notifications' && unreadCount && unreadCount > 0) return String(unreadCount)
    return null
  }

  const itemBase =
    'group flex items-center gap-3 px-4 py-2.5 rounded-md font-inter tracking-tight text-sm transition-colors duration-150'
  const inactive = `${itemBase} text-secondary-fixed-dim font-medium hover:bg-primary/10 hover:text-white`
  const active = `${itemBase} text-white font-bold bg-primary/15 border-r-2 border-primary`

  return (
    <nav
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'hidden md:flex w-[260px] h-screen sticky top-0 left-0 py-6 px-3 z-30',
      )}
      style={{ backgroundColor: 'var(--color-on-secondary-fixed)' }}
      aria-label={t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })}
    >
      <SafeLink
        to="/"
        className={cm.cn(cm.sp('px', 4), cm.sp('mb', 8), cm.flex({ direction: 'col' }))}
        aria-label={APP_NAME}
      >
        <span
          className={cm.cn(
            'text-2xl font-black tracking-tighter text-white uppercase font-inter leading-none',
          )}
        >
          {APP_NAME}
        </span>
        <span
          className={cm.cn(
            'text-secondary-fixed-dim text-[10px] tracking-widest uppercase font-bold mt-1',
          )}
        >
          {t('sidebar.tagline', {}, { defaultValue: 'Content Moderation' })}
        </span>
      </SafeLink>

      <ul className={cm.cn(cm.flex1, cm.stack(1))}>
        {PRIMARY_LINKS.map((link) => {
          const isActive = link.match
            ? link.match(pathname)
            : pathname === link.to || pathname.startsWith(`${link.to}/`)
          return (
            <li key={link.to}>
              <SafeLink
                to={link.to}
                data-mol-id={`sidebar-${link.icon}`}
                aria-current={isActive ? 'page' : undefined}
                className={isActive ? active : inactive}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn('material-symbols-outlined text-[20px]')}
                  data-icon={link.icon}
                >
                  {link.icon}
                </span>
                <span className={cm.cn(cm.flex1, 'truncate')}>
                  {t(link.labelKey, {}, { defaultValue: link.defaultLabel })}
                </span>
                {link.badgeKey && badgeFor(link.badgeKey) && (
                  <span
                    data-mol-id={`sidebar-badge-${link.badgeKey}`}
                    className={cm.cn(
                      'ml-auto inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-primary text-on-primary text-[10px] font-bold tracking-wide',
                    )}
                  >
                    {badgeFor(link.badgeKey)}
                  </span>
                )}
              </SafeLink>
            </li>
          )
        })}
      </ul>

      <div className={cm.cn('mt-6 border-t border-slate-800 pt-4')}>
        <SafeLink
          to="/profile"
          data-mol-id="sidebar-profile"
          className={pathname === '/profile' ? active : inactive}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-[20px]')}
            data-icon="account_circle"
          >
            account_circle
          </span>
          <span>{t('nav.profile', {}, { defaultValue: 'Profile' })}</span>
        </SafeLink>
      </div>
    </nav>
  )
}
