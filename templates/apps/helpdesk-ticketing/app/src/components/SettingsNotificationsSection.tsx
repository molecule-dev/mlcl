import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SettingsNotificationsSectionProps {
  newTicketsEmail: boolean
  setNewTicketsEmail: (v: boolean) => void
  dailySummaryEmail: boolean
  setDailySummaryEmail: (v: boolean) => void
  mentionsEmail: boolean
  setMentionsEmail: (v: boolean) => void
  urgentPush: boolean
  setUrgentPush: (v: boolean) => void
  slaBreachPush: boolean
  setSlaBreachPush: (v: boolean) => void
  digestFrequency: string
  setDigestFrequency: (v: string) => void
  saving: boolean
  onSave: () => void
}

function SettingsNotificationsSection({
  newTicketsEmail,
  setNewTicketsEmail,
  dailySummaryEmail,
  setDailySummaryEmail,
  mentionsEmail,
  setMentionsEmail,
  urgentPush,
  setUrgentPush,
  slaBreachPush,
  setSlaBreachPush,
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
                checked={newTicketsEmail}
                onChange={(e) => setNewTicketsEmail(e.target.checked)}
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
                  'settingsNotifications.newTicketsLabel',
                  {},
                  { defaultValue: 'New tickets assigned to me' },
                )}
              </span>
            </label>
            <label className={cm.cn(cm.flex({ align: 'start', gap: 3 }), cm.cursorPointer)}>
              <input
                checked={dailySummaryEmail}
                onChange={(e) => setDailySummaryEmail(e.target.checked)}
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
                  'settingsNotifications.dailySummaryLabel',
                  {},
                  { defaultValue: 'Daily summary of updates' },
                )}
              </span>
            </label>
            <label className={cm.cn(cm.flex({ align: 'start', gap: 3 }), cm.cursorPointer)}>
              <input
                checked={mentionsEmail}
                onChange={(e) => setMentionsEmail(e.target.checked)}
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
                  'settingsNotifications.mentionsLabel',
                  {},
                  { defaultValue: 'Mentions and internal notes' },
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
              { defaultValue: 'Push Notifications' },
            )}
          </h4>
          <div className={cm.stack(4)}>
            <label className={cm.cn(cm.flex({ align: 'start', gap: 3 }), cm.cursorPointer)}>
              <input
                checked={urgentPush}
                onChange={(e) => setUrgentPush(e.target.checked)}
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
                  'settingsNotifications.urgentEscalationsLabel',
                  {},
                  { defaultValue: 'Urgent ticket escalations' },
                )}
              </span>
            </label>
            <label className={cm.cn(cm.flex({ align: 'start', gap: 3 }), cm.cursorPointer)}>
              <input
                checked={slaBreachPush}
                onChange={(e) => setSlaBreachPush(e.target.checked)}
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
                  'settingsNotifications.slaBreachLabel',
                  {},
                  { defaultValue: 'SLA breach warnings' },
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
