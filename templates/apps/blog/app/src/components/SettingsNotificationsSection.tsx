import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-react'
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
                { defaultValue: 'New Followers' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'settingsNotificationsSection.newFollowersDescription',
                {},
                { defaultValue: 'Notify me when someone follows my profile.' },
              )}
            </p>
          </div>
          <Switch
            checked={newFollowers}
            onChange={() => onToggleNewFollowers()}
            size="md"
            color="primary"
            data-mol-id="toggle-followers"
            aria-label={t(
              'settingsNotificationsSection.newFollowers',
              {},
              { defaultValue: 'New Followers' },
            )}
          />
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
              {t('settingsNotificationsSection.comments', {}, { defaultValue: 'Comments' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'settingsNotificationsSection.commentsDescription',
                {},
                { defaultValue: 'Notify me when someone comments on my essays.' },
              )}
            </p>
          </div>
          <Switch
            checked={commentsNotif}
            onChange={() => onToggleComments()}
            size="md"
            color="primary"
            data-mol-id="toggle-comments"
            aria-label={t(
              'settingsNotificationsSection.comments',
              {},
              { defaultValue: 'Comments' },
            )}
          />
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('py', 2))}>
          <div>
            <p className={cm.cn(cm.fontWeight('medium'), 'font-label text-on-surface')}>
              {t('settingsNotificationsSection.mentions', {}, { defaultValue: 'Mentions' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'settingsNotificationsSection.mentionsDescription',
                {},
                { defaultValue: "Notify me when I'm tagged in a story or comment." },
              )}
            </p>
          </div>
          <Switch
            checked={mentionsNotif}
            onChange={() => onToggleMentions()}
            size="md"
            color="primary"
            data-mol-id="toggle-mentions"
            aria-label={t(
              'settingsNotificationsSection.mentions',
              {},
              { defaultValue: 'Mentions' },
            )}
          />
        </div>
      </div>
    </section>
  )
}

export default SettingsNotificationsSection
export { SettingsNotificationsSection }
