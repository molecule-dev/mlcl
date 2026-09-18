import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ThemeToggle } from '@molecule/app-ui-react'

import { UserMenu } from './UserMenu.js'

interface NotificationsResponse {
  data?: { id: string }[]
  total?: number
}

function TopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [notificationCount, setNotificationCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<NotificationsResponse>('/api/notifications')
      .then((res) => {
        if (cancelled) return
        const payload = res.data
        const items = payload?.data ?? []
        const count = typeof payload?.total === 'number' ? payload.total : items.length
        setNotificationCount(count)
      })
      .catch(() => {
        if (!cancelled) setNotificationCount(0)
      })
    return () => {
      cancelled = true
    }
  }, [http, pathname])

  const title =
    pathname === '/analytics'
      ? t('nav.analytics', {}, { defaultValue: 'Analytics' })
      : pathname === '/posts'
        ? t('topNavBar.articles', {}, { defaultValue: 'Articles' })
        : pathname === '/comments'
          ? t('topNavBar.comments', {}, { defaultValue: 'Comments' })
          : pathname === '/settings'
            ? t('nav.settings', {}, { defaultValue: 'Settings' })
            : pathname === '/tags'
              ? t('form.tags', {}, { defaultValue: 'Tags' })
              : pathname === '/notifications'
                ? t('settings.notifications', {}, { defaultValue: 'Notifications' })
                : t('nav.dashboard', {}, { defaultValue: 'Dashboard' })

  const useEditorialHeader = pathname === '/dashboard' || pathname === '/analytics'

  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.h(16),
        'fixed top-0 right-0 w-[calc(100%-240px)] z-50 bg-surface/80 backdrop-blur-md ml-[240px]',
      )}
    >
      {useEditorialHeader ? (
        <>
          <div
            className={cm.cn(cm.flex({ align: 'center' }), cm.flex1, cm.sp('mr', 6), 'max-w-xl')}
          >
            <label className={cm.cn(cm.flex1, cm.w('full'), 'relative group')}>
              <span className={cm.fvca9358d4}>search</span>
              <input
                type="search"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('pl', 12),
                  cm.sp('pr', 4),
                  cm.textSize('sm'),
                  cm.roundedFull,
                  'py-2.5 bg-surface-container border border-transparent focus:border-primary/20 focus:ring-1 focus:ring-primary/10 outline-none placeholder:text-on-surface-variant/50',
                )}
                placeholder={t(
                  'topNavBar.searchPlaceholder',
                  {},
                  { defaultValue: 'Search (Cmd+K)' },
                )}
                readOnly
                aria-label={t('common.search', {}, { defaultValue: 'Search' })}
              />
            </label>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
              className={cm.cn('relative', cm.fv7bf6e077)}
              data-icon="notifications"
              data-mol-id="topnav-notifications"
            >
              notifications
              {notificationCount !== null && notificationCount > 0 && (
                <span
                  className={cm.cn(
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    'absolute min-w-[18px] h-[18px] px-1 flex items-center justify-center -top-0.5 -right-1 bg-error text-on-error text-[10px] leading-none',
                  )}
                  data-mol-id="topnav-notification-count"
                >
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            <ThemeToggle />
            <UserMenu dataMolId="topnav-account" />
          </div>
        </>
      ) : (
        <>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <h2
              className={cm.cn(
                cm.textSize('2xl'),
                "font-['Newsreader'] italic tracking-tight text-on-background",
              )}
            >
              {title}
            </h2>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
              className={cm.fv7bf6e077}
              data-icon="notifications"
              data-mol-id="topnav-notifications"
            >
              notifications
            </button>
            <UserMenu dataMolId="topnav-account" />
          </div>
        </>
      )}
      <div
        className={cm.cn(cm.w('full'), 'bg-surface-container h-[1px] absolute bottom-0 left-0')}
      ></div>
    </header>
  )
}
export default TopNavBar
export { TopNavBar }
