import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SettingsNotificationsSectionProps {
  statusEmail: boolean
  setStatusEmail: (v: boolean) => void
  watchAreaEmail: boolean
  setWatchAreaEmail: (v: boolean) => void
  confirmationsEmail: boolean
  setConfirmationsEmail: (v: boolean) => void
  commentEmail: boolean
  setCommentEmail: (v: boolean) => void
  weeklyDigest: boolean
  setWeeklyDigest: (v: boolean) => void
  digestFrequency: string
  setDigestFrequency: (v: string) => void
  saving: boolean
  onSave: () => void
}

function SettingsNotificationsSection({
  statusEmail,
  setStatusEmail,
  watchAreaEmail,
  setWatchAreaEmail,
  confirmationsEmail,
  setConfirmationsEmail,
  commentEmail,
  setCommentEmail,
  weeklyDigest,
  setWeeklyDigest,
  digestFrequency,
  setDigestFrequency,
  saving,
  onSave,
}: SettingsNotificationsSectionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const checkClass = cm.cn(
    cm.w(5),
    cm.h(5),
    cm.shrink0,
    cm.textPrimary,
    'mt-0.5 rounded border-none focus:ring-2 focus:ring-primary',
  )

  return (
    <section
      className={cm.cn(
        cm.sp('p', 8),
        'bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_-2px_rgba(19,27,46,0.04),0_12px_40px_-8px_rgba(19,27,46,0.08)]',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 4, wrap: 'wrap' }),
          cm.sp('mb', 8),
        )}
      >
        <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t(
            'settingsNotifications.sectionTitle',
            {},
            { defaultValue: 'Notification Preferences' },
          )}
        </h3>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl shadow-lg transition-transform active:scale-95',
          )}
        >
          {saving
            ? t('common.saving', {}, { defaultValue: 'Saving...' })
            : t('common.save', {}, { defaultValue: 'Save Changes' })}
        </button>
      </div>
      <div className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'md:grid-cols-2')}>
        <div>
          <h4
            className={cm.cn(
              cm.sp('mb', 4),
              'text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]',
            )}
          >
            {t(
              'settingsNotifications.emailSectionTitle',
              {},
              { defaultValue: 'Email Notifications' },
            )}
          </h4>
          <div className={cm.stack(4)}>
            <label className={cm.cn(cm.flex({ align: 'start', gap: 3 }), cm.cursorPointer)}>
              <input
                data-mol-id="settings-notif-status-email"
                checked={statusEmail}
                onChange={(e) => setStatusEmail(e.target.checked)}
                className={checkClass}
                type="checkbox"
              />
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface leading-snug',
                )}
              >
                {t(
                  'settingsNotifications.statusLabel',
                  {},
                  { defaultValue: 'Status changes on my reports' },
                )}
              </span>
            </label>
            <label className={cm.cn(cm.flex({ align: 'start', gap: 3 }), cm.cursorPointer)}>
              <input
                data-mol-id="settings-notif-watch-area-email"
                checked={watchAreaEmail}
                onChange={(e) => setWatchAreaEmail(e.target.checked)}
                className={checkClass}
                type="checkbox"
              />
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface leading-snug',
                )}
              >
                {t(
                  'settingsNotifications.watchAreaLabel',
                  {},
                  { defaultValue: 'New reports in my watch areas' },
                )}
              </span>
            </label>
            <label className={cm.cn(cm.flex({ align: 'start', gap: 3 }), cm.cursorPointer)}>
              <input
                data-mol-id="settings-notif-confirmations-email"
                checked={confirmationsEmail}
                onChange={(e) => setConfirmationsEmail(e.target.checked)}
                className={checkClass}
                type="checkbox"
              />
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface leading-snug',
                )}
              >
                {t(
                  'settingsNotifications.confirmationsLabel',
                  {},
                  { defaultValue: 'Confirmations on my reports' },
                )}
              </span>
            </label>
          </div>
        </div>
        <div>
          <h4
            className={cm.cn(
              cm.sp('mb', 4),
              'text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]',
            )}
          >
            {t(
              'settingsNotifications.pushSectionTitle',
              {},
              { defaultValue: 'Community Activity' },
            )}
          </h4>
          <div className={cm.stack(4)}>
            <label className={cm.cn(cm.flex({ align: 'start', gap: 3 }), cm.cursorPointer)}>
              <input
                data-mol-id="settings-notif-comment-email"
                checked={commentEmail}
                onChange={(e) => setCommentEmail(e.target.checked)}
                className={checkClass}
                type="checkbox"
              />
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface leading-snug',
                )}
              >
                {t(
                  'settingsNotifications.commentLabel',
                  {},
                  { defaultValue: 'Comments on my reports' },
                )}
              </span>
            </label>
            <label className={cm.cn(cm.flex({ align: 'start', gap: 3 }), cm.cursorPointer)}>
              <input
                data-mol-id="settings-notif-weekly-digest"
                checked={weeklyDigest}
                onChange={(e) => setWeeklyDigest(e.target.checked)}
                className={checkClass}
                type="checkbox"
              />
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface leading-snug',
                )}
              >
                {t(
                  'settingsNotifications.weeklyDigestLabel',
                  {},
                  { defaultValue: 'Weekly neighborhood digest' },
                )}
              </span>
            </label>
            <div className={cm.sp('pt', 2)}>
              <label
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 2),
                  'text-on-surface-variant uppercase tracking-wider block',
                )}
              >
                {t(
                  'settingsNotifications.digestFrequencyLabel',
                  {},
                  { defaultValue: 'Digest Frequency' },
                )}
              </label>
              <select
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'w-full bg-surface-container-low border-none rounded-lg',
                )}
                value={digestFrequency}
                onChange={(e) => setDigestFrequency(e.target.value)}
              >
                <option value="Every hour">
                  {t(
                    'settingsNotifications.digestFrequency.hourly',
                    {},
                    { defaultValue: 'Every hour' },
                  )}
                </option>
                <option value="Twice daily">
                  {t(
                    'settingsNotifications.digestFrequency.twiceDaily',
                    {},
                    { defaultValue: 'Twice daily' },
                  )}
                </option>
                <option value="Once daily at 8:00 AM">
                  {t(
                    'settingsNotifications.digestFrequency.daily',
                    { time: '8:00 AM' },
                    { defaultValue: 'Once daily at {{time}}' },
                  )}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SettingsNotificationsSection
export { SettingsNotificationsSection }
