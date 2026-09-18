import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { AnnouncementItem } from '../components/AnnouncementsFeed.js'
import { AnnouncementsFeed } from '../components/AnnouncementsFeed.js'

const NOTIFICATIONS: readonly AnnouncementItem[] = [
  {
    id: 'n-101',
    icon: 'grade',
    title: 'New grade posted in AP Biology',
    body: 'Lab report 3 — “Cellular respiration” has been graded. View the rubric for feedback.',
    timeLabel: '12 min',
    tone: 'success',
    category: 'Grade posted',
  },
  {
    id: 'n-102',
    icon: 'assignment',
    title: 'Algebra II practice set 7 is due tonight',
    body: 'Submit your work in PDF or photo form. Show every factoring step for partial credit.',
    timeLabel: '34 min',
    tone: 'warning',
    category: 'Reminder',
  },
  {
    id: 'n-103',
    icon: 'forum',
    title: 'Ms. Tran sent you a message',
    body: '“Hi Riley — quick check-in: I noticed you crushed problem 6…”',
    timeLabel: '1 hr',
    tone: 'info',
    category: 'Message',
  },
  {
    id: 'n-104',
    icon: 'campaign',
    title: 'Spring assembly moved to Friday',
    body: 'Hold the period 7 schedule for an all-school assembly in the gym. Buses run on the late bell.',
    timeLabel: '3 hr',
    tone: 'info',
    category: 'School news',
  },
  {
    id: 'n-105',
    icon: 'event_busy',
    title: 'Excused absence recorded',
    body: 'Apr 22 marked as excused — note from family is on file.',
    timeLabel: 'Yesterday',
    tone: 'success',
    category: 'Attendance',
  },
  {
    id: 'n-106',
    icon: 'account_balance_wallet',
    title: 'Family plan renews May 14',
    body: 'You’ll be charged $9.99/mo. Update payment in Settings → Billing if needed.',
    timeLabel: '2d',
    tone: 'warning',
    category: 'Billing',
  },
] as const

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }))}
      data-mol-id="page-notifications"
    >
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <p className={cm.cn(cm.textSize('sm'), 'font-bold uppercase tracking-widest text-primary')}>
          {t(
            'notifications.eyebrow',
            { count: NOTIFICATIONS.length },
            { defaultValue: '{{count}} updates' },
          )}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'notifications.subtitle',
            {},
            {
              defaultValue:
                'Grades, reminders, messages, and school announcements. Adjust which channels each notification uses in Settings.',
            },
          )}
        </p>
      </header>

      <AnnouncementsFeed
        items={NOTIFICATIONS}
        title={t('notifications.feedTitle', {}, { defaultValue: 'All recent activity' })}
      />
    </div>
  )
}

export default Notifications
export { Notifications as NotificationsPage }
