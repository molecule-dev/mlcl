import { useState } from 'react'
import { Link } from 'react-router'

import { useGet, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'

function DashboardTopNavBar({
  currentDate: controlledDate,
  onPrevMonth,
  onNextMonth,
}: {
  /** Controlled month — pass with the handlers so the page can refetch. */
  currentDate?: Date
  onPrevMonth?: () => void
  onNextMonth?: () => void
} = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [localDate, setLocalDate] = useState(new Date())
  const currentDate = controlledDate ?? localDate
  const { data: notif } = useGet<{ data: unknown[]; count: number }>('/notifications', {
    immediate: true,
  })
  const unreadCount = notif?.count ?? 0
  const month = currentDate.toLocaleString('default', { month: 'long' })
  const year = currentDate.getFullYear()
  const prevMonth =
    onPrevMonth ?? (() => setLocalDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)))
  const nextMonth =
    onNextMonth ?? (() => setLocalDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)))
  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.w('full'),
        cm.sp('py', 4),
        'pl-4 pr-4 md:pr-8 md:pl-64 fixed top-0 z-50 bg-surface/80 backdrop-blur-xl',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
        <button
          className={cm.cn(
            cm.sp('p', 2),
            cm.roundedFull,
            'hover:bg-surface-container transition-colors',
          )}
          aria-label={t('topNavBar.previousMonth', {}, { defaultValue: 'Previous month' })}
          onClick={prevMonth}
        >
          <span className={cm.cn('material-symbols-outlined text-on-surface-variant')}>
            chevron_left
          </span>
        </button>
        <span
          className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'font-manrope text-primary')}
        >
          {t(
            'dashboardTopNavBar.currentMonth',
            { month, year },
            { defaultValue: '{{month}} {{year}}' },
          )}
        </span>
        <button
          className={cm.cn(
            cm.sp('p', 2),
            cm.roundedFull,
            'hover:bg-surface-container transition-colors',
          )}
          aria-label={t('topNavBar.nextMonth', {}, { defaultValue: 'Next month' })}
          onClick={nextMonth}
        >
          <span className={cm.cn('material-symbols-outlined text-on-surface-variant')}>
            chevron_right
          </span>
        </button>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 sm:gap-6 shrink-0')}>
        <Link
          to="/notifications"
          aria-label={t(
            'dashboardTopNavBar.notificationsAria',
            { count: unreadCount },
            {
              defaultValue: 'Notifications ({{count}} unread)',
            },
          )}
          data-mol-id="dashboard-notifications-link"
          data-unread-count={unreadCount}
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('p', 2),
            cm.roundedFull,
            'gap-2 relative text-foreground-secondary hover:opacity-80 transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="notifications">
            notifications
          </span>
          {unreadCount > 0 && (
            <span
              data-mol-id="dashboard-notifications-badge"
              className={cm.cn(
                cm.roundedFull,
                cm.w(2),
                cm.h(2),
                'absolute top-2 right-2 bg-tertiary',
              )}
            ></span>
          )}
        </Link>
        {/* The mobile bottom nav's center FAB covers "add transaction" on
            phones — the pill only renders from sm up to avoid right-edge
            clipping at 390px. */}
        <Link
          className={cm.cn(
            'hidden sm:inline-flex bg-gradient-to-br from-primary to-primary-container text-white px-6 py-2.5 rounded-full font-manrope font-semibold text-sm shadow-sm hover:shadow-md transition-all active:scale-95',
          )}
          to="/transactions/new"
        >
          {t('dashboardTopNavBar.addTransaction', {}, { defaultValue: 'Add Transaction' })}
        </Link>
        <UserMenu />
      </div>
    </header>
  )
}

export default DashboardTopNavBar
export { DashboardTopNavBar }
