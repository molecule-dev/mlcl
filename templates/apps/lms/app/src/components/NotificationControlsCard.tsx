interface NotificationControlsCardProps {
  notifyEmail: boolean
  setNotifyEmail: (v: boolean) => void
  notifyCourseUpdates: boolean
  setNotifyCourseUpdates: (v: boolean) => void
  notifyAssignments: boolean
  setNotifyAssignments: (v: boolean) => void
  notifyDiscussions: boolean
  setNotifyDiscussions: (v: boolean) => void
}
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function NotificationControlsCard({
  notifyEmail,
  setNotifyEmail,
  notifyCourseUpdates,
  setNotifyCourseUpdates,
  notifyAssignments,
  setNotifyAssignments,
  notifyDiscussions,
  setNotifyDiscussions,
}: NotificationControlsCardProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10',
      )}
    >
      <h3
        className={cm.cn(
          cm.textSize('lg'),
          cm.fontWeight('bold'),
          cm.sp('mb', 6),
          cm.flex({ align: 'center', gap: 2 }),
          'font-headline',
        )}
      >
        <span
          className={cm.cn(cm.textPrimary, 'material-symbols-outlined')}
          data-icon="notifications_active"
        >
          notifications_active
        </span>

        {t('notificationControlsCard.title', {}, { defaultValue: 'Notification Controls' })}
      </h3>
      <div className={cm.stack(5)}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 2),
            'hover:bg-surface-secondary rounded-xl transition-colors',
          )}
        >
          <div>
            <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), cm.textPrimary)}>
              {t('notificationControlsCard.emailDigestLabel', {}, { defaultValue: 'Email Digest' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
              {t(
                'notificationControlsCard.emailDigestDescription',
                {},
                { defaultValue: 'Weekly summary of activity' },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.cursorPointer, cm.flex({ align: 'center' }), 'relative')}>
            <input
              checked={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.checked)}
              className={cm.cn('sr-only peer')}
              type="checkbox"
              aria-label={t(
                'notificationControlsCard.emailDigestLabel',
                {},
                { defaultValue: 'Email Digest' },
              )}
            />
            <div
              className={cm.cn(
                cm.w(11),
                cm.h(6),
                cm.roundedFull,
                "bg-border peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary",
              )}
            ></div>
          </div>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 2),
            'hover:bg-surface-secondary rounded-xl transition-colors',
          )}
        >
          <div>
            <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), cm.textPrimary)}>
              {t(
                'notificationControlsCard.courseUpdatesLabel',
                {},
                { defaultValue: 'Course Updates' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
              {t(
                'notificationControlsCard.courseUpdatesDescription',
                {},
                { defaultValue: 'New syllabus or lecture notes' },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.cursorPointer, cm.flex({ align: 'center' }), 'relative')}>
            <input
              checked={notifyCourseUpdates}
              onChange={(e) => setNotifyCourseUpdates(e.target.checked)}
              className={cm.cn('sr-only peer')}
              type="checkbox"
              aria-label={t(
                'notificationControlsCard.courseUpdatesLabel',
                {},
                { defaultValue: 'Course Updates' },
              )}
            />
            <div
              className={cm.cn(
                cm.w(11),
                cm.h(6),
                cm.roundedFull,
                "bg-border peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary",
              )}
            ></div>
          </div>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 2),
            'hover:bg-surface-secondary rounded-xl transition-colors',
          )}
        >
          <div>
            <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), cm.textPrimary)}>
              {t(
                'notificationControlsCard.assignmentRemindersLabel',
                {},
                { defaultValue: 'Assignment Reminders' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
              {t(
                'notificationControlsCard.assignmentRemindersDescription',
                {},
                { defaultValue: '48-hour deadline alerts' },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.cursorPointer, cm.flex({ align: 'center' }), 'relative')}>
            <input
              checked={notifyAssignments}
              onChange={(e) => setNotifyAssignments(e.target.checked)}
              className={cm.cn('sr-only peer')}
              type="checkbox"
              aria-label={t(
                'notificationControlsCard.assignmentRemindersLabel',
                {},
                { defaultValue: 'Assignment Reminders' },
              )}
            />
            <div
              className={cm.cn(
                cm.w(11),
                cm.h(6),
                cm.roundedFull,
                "bg-border peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary",
              )}
            ></div>
          </div>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 2),
            'hover:bg-surface-secondary rounded-xl transition-colors',
          )}
        >
          <div>
            <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), cm.textPrimary)}>
              {t(
                'notificationControlsCard.discussionActivityLabel',
                {},
                { defaultValue: 'Discussion Activity' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
              {t(
                'notificationControlsCard.discussionActivityDescription',
                {},
                { defaultValue: 'Direct replies and mentions' },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.cursorPointer, cm.flex({ align: 'center' }), 'relative')}>
            <input
              checked={notifyDiscussions}
              onChange={(e) => setNotifyDiscussions(e.target.checked)}
              className={cm.cn('sr-only peer')}
              type="checkbox"
              aria-label={t(
                'notificationControlsCard.discussionActivityLabel',
                {},
                { defaultValue: 'Discussion Activity' },
              )}
            />
            <div
              className={cm.cn(
                cm.w(11),
                cm.h(6),
                cm.roundedFull,
                "bg-border peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary",
              )}
            ></div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default NotificationControlsCard
export { NotificationControlsCard }
