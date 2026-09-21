import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface SettingsNotificationsSectionProps {
  newFollowers: boolean
  commentsNotif: boolean
  mentionsNotif: boolean
  onToggleNewFollowers: () => void
  onToggleComments: () => void
  onToggleMentions: () => void
}
function SettingsNotificationsSection({
  newFollowers,
  commentsNotif,
  mentionsNotif,
  onToggleNewFollowers,
  onToggleComments,
  onToggleMentions,
}: SettingsNotificationsSectionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(
        cm.grid({ cols: 1, gap: 'none' }),
        'md:grid-cols-12 items-start gap-x-10 gap-y-6',
      )}
    >
      <div className={cm.fvf71e6921}>
        <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), 'font-headline')}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h3>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant font-label')}
        >
          {t(
            'settingsNotificationsSection.sectionDescription',
            {},
            { defaultValue: 'Decide when you want to be interrupted by updates.' },
          )}
        </p>
      </div>
      <div
        className={cm.cn(
          cm.sp('p', 8),
          cm.stack(6),
          'md:col-span-8 bg-surface-container-lowest rounded-xl editorial-shadow',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('py', 2),
            'border-b border-surface-container-low',
          )}
        >
          <div>
            <p className={cm.cn(cm.fontWeight('medium'), 'font-label text-on-surface')}>
              {t(
                'settingsNotificationsSection.newFollowers',
                {},
                { defaultValue: 'New subscribers' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'settingsNotificationsSection.newFollowersDescription',
                {},
                { defaultValue: 'Notify me when someone new joins the list.' },
              )}
            </p>
          </div>
          <button
            className={cm.cn(
              cm.w(12),
              'h-7',
              cm.roundedFull,
              cm.flex({ align: 'center' }),
              'relative transition-colors',
              newFollowers ? 'bg-primary' : 'bg-surface-container-high',
            )}
            data-mol-id="toggle-followers"
            onClick={onToggleNewFollowers}
            aria-checked={newFollowers}
            aria-label={t(
              'settingsNotificationsSection.newFollowers',
              {},
              { defaultValue: 'New subscribers' },
            )}
            role="switch"
          >
            <span
              className={cm.cn(
                cm.w(4),
                cm.h(4),
                cm.roundedFull,
                'absolute bg-surface transition-all',
                newFollowers ? 'right-1' : 'left-1',
              )}
            ></span>
          </button>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('py', 2),
            'border-b border-surface-container-low',
          )}
        >
          <div>
            <p className={cm.cn(cm.fontWeight('medium'), 'font-label text-on-surface')}>
              {t('settingsNotificationsSection.comments', {}, { defaultValue: 'Issue delivered' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'settingsNotificationsSection.commentsDescription',
                {},
                { defaultValue: 'Notify me when an issue finishes sending to the list.' },
              )}
            </p>
          </div>
          <button
            className={cm.cn(
              cm.w(12),
              'h-7',
              cm.roundedFull,
              cm.flex({ align: 'center' }),
              'relative transition-colors',
              commentsNotif ? 'bg-primary' : 'bg-surface-container-high',
            )}
            data-mol-id="toggle-comments"
            onClick={onToggleComments}
            aria-checked={commentsNotif}
            aria-label={t(
              'settingsNotificationsSection.comments',
              {},
              { defaultValue: 'Issue delivered' },
            )}
            role="switch"
          >
            <span
              className={cm.cn(
                cm.w(4),
                cm.h(4),
                cm.roundedFull,
                'absolute bg-surface transition-all',
                commentsNotif ? 'right-1' : 'left-1',
              )}
            ></span>
          </button>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('py', 2))}>
          <div>
            <p className={cm.cn(cm.fontWeight('medium'), 'font-label text-on-surface')}>
              {t('settingsNotificationsSection.mentions', {}, { defaultValue: 'Unsubscribes' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'settingsNotificationsSection.mentionsDescription',
                {},
                { defaultValue: 'Notify me when a subscriber unsubscribes from the list.' },
              )}
            </p>
          </div>
          <button
            className={cm.cn(
              cm.w(12),
              'h-7',
              cm.roundedFull,
              cm.flex({ align: 'center' }),
              'relative transition-colors',
              mentionsNotif ? 'bg-primary' : 'bg-surface-container-high',
            )}
            data-mol-id="toggle-mentions"
            onClick={onToggleMentions}
            aria-checked={mentionsNotif}
            aria-label={t(
              'settingsNotificationsSection.mentions',
              {},
              { defaultValue: 'Unsubscribes' },
            )}
            role="switch"
          >
            <span
              className={cm.cn(
                cm.w(4),
                cm.h(4),
                cm.roundedFull,
                'absolute bg-surface shadow-sm transition-all',
                mentionsNotif ? 'right-1' : 'left-1',
              )}
            ></span>
          </button>
        </div>
      </div>
    </section>
  )
}

export default SettingsNotificationsSection
export { SettingsNotificationsSection }
