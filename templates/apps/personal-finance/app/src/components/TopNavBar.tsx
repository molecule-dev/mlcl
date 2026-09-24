import { Link } from 'react-router'

import { useGet, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'
function TopNavBar({
  month = new Date().getMonth() + 1,
  year = new Date().getFullYear(),
  onPrev,
  onNext,
}: {
  month?: number
  year?: number
  onPrev?: () => void
  onNext?: () => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { data: notif } = useGet<{ data: unknown[]; count: number }>('/notifications', {
    immediate: true,
  })
  const unreadCount = notif?.count ?? 0
  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 8),
        cm.sp('py', 4),
        cm.w('full'),
        'sticky top-0 z-40 bg-surface/80 backdrop-blur-xl',
      )}
      data-mol-id="top-nav-1"
    >
      <div className={cm.flex({ align: 'center', gap: 'md' })}>
        <h1
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            'font-headline tracking-tighter text-success',
          )}
        >
          {new Date(year, month - 1).toLocaleString('default', { month: 'long' })} {year}
        </h1>
        {onPrev && onNext && (
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'text-foreground-tertiary')}
          >
            <span
              role="button"
              tabIndex={0}
              aria-label={t('topNavBar.previousMonth', {}, { defaultValue: 'Previous month' })}
              onClick={onPrev}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onPrev()
                }
              }}
              className={cm.cn(
                cm.textSize('sm'),
                cm.cursorPointer,
                'material-symbols-outlined hover:text-success',
              )}
            >
              chevron_left
            </span>
            <span
              role="button"
              tabIndex={0}
              aria-label={t('topNavBar.nextMonth', {}, { defaultValue: 'Next month' })}
              onClick={onNext}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onNext()
                }
              }}
              className={cm.cn(
                cm.textSize('sm'),
                cm.cursorPointer,
                'material-symbols-outlined hover:text-success',
              )}
            >
              chevron_right
            </span>
          </div>
        )}
      </div>
      <div className={cm.flex({ align: 'center', gap: 'lg' })}>
        <div
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'hidden md:flex items-center gap-8',
          )}
        >
          <Link
            className={cm.cn('text-foreground-secondary hover:text-success transition-colors')}
            to="/reports"
          >
            {t('nav.reports', {}, { defaultValue: 'Reports' })}
          </Link>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          <Link
            to="/notifications"
            aria-label={t(
              'topNavBar.notificationsAria',
              { count: unreadCount },
              { defaultValue: 'Notifications ({{count}} unread)' },
            )}
            data-unread-count={unreadCount}
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              'relative text-foreground-secondary hover:bg-success-light/50 transition-all',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')}>notifications</span>
            {unreadCount > 0 && (
              <span
                className={cm.cn(
                  cm.roundedFull,
                  cm.w(2),
                  cm.h(2),
                  'absolute top-2 right-2 bg-tertiary',
                )}
              ></span>
            )}
          </Link>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export default TopNavBar
export { TopNavBar }
