import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface NotificationsPageHeaderProps {
  onMarkedAllRead?: () => void
  unreadCount?: number
}

function NotificationsPageHeader({
  onMarkedAllRead,
  unreadCount,
}: NotificationsPageHeaderProps = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [marking, setMarking] = useState(false)
  const [markedAt, setMarkedAt] = useState<number | null>(null)

  useEffect(() => {
    if (markedAt === null) return
    const timer = setTimeout(() => setMarkedAt(null), 2500)
    return () => clearTimeout(timer)
  }, [markedAt])

  async function handleMarkAllRead() {
    if (marking || (unreadCount !== undefined && unreadCount === 0)) return
    setMarking(true)
    try {
      await http.post('/api/notifications/mark-all-read', {})
      setMarkedAt(Date.now())
      onMarkedAllRead?.()
    } finally {
      setMarking(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.sp('mb', 8),
        cm.flex({ direction: 'col', justify: 'between', gap: 4 }),
        'md:flex-row md:items-end',
      )}
    >
      <div>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'font-headline text-on-surface tracking-tight',
          )}
        >
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant font-body')}>
          {t(
            'notificationsPageHeader.subtitle',
            {},
            { defaultValue: 'Stay in sync with your collaborators' },
          )}
        </p>
      </div>
      <button
        data-mol-id="notifications-mark-all-read"
        onClick={handleMarkAllRead}
        disabled={marking || (unreadCount !== undefined && unreadCount === 0)}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 2 }),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'text-foreground-secondary hover:text-primary transition-colors group whitespace-nowrap disabled:opacity-50',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-[20px] group-hover:text-primary')}>
          done_all
        </span>
        {markedAt
          ? t('notificationsPageHeader.allCaughtUp', {}, { defaultValue: 'All caught up!' })
          : marking
            ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
            : t('common.markAllAsRead', {}, { defaultValue: 'Mark all as read' })}
      </button>
    </div>
  )
}

export default NotificationsPageHeader
export { NotificationsPageHeader }
