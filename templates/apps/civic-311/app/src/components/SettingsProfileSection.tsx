import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SettingsProfileSectionProps {
  name: string
  setName: (v: string) => void
  email: string
  setEmail: (v: string) => void
  jobTitle: string
  setJobTitle: (v: string) => void
  timezone: string
  setTimezone: (v: string) => void
  saving: boolean
  onSave: () => void
}

function SettingsProfileSection({
  name,
  setName,
  email,
  setEmail,
  jobTitle,
  setJobTitle,
  timezone,
  setTimezone,
  saving,
  onSave,
}: SettingsProfileSectionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [avatarHint, setAvatarHint] = useState<string | null>(null)
  return (
    <section
      className={cm.cn(
        cm.sp('p', 8),
        'bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_-2px_rgba(19,27,46,0.04),0_12px_40px_-8px_rgba(19,27,46,0.08)]',
      )}
    >
      {avatarHint && (
        <p
          className={cm.cn(
            cm.sp('mb', 4),
            cm.textSize('xs'),
            cm.sp('px', 3),
            cm.sp('py', 2),
            'rounded-lg bg-surface-container-high text-on-surface-variant',
          )}
          role="status"
        >
          {avatarHint}
        </p>
      )}
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 4, wrap: 'wrap' }),
          cm.sp('mb', 8),
        )}
      >
        <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('settingsProfile.title', {}, { defaultValue: 'Profile Settings' })}
        </h3>
        <button
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
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 10 }), 'md:flex-row')}>
        <div className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 4 }))}>
          <div className={cm.cn('relative group')}>
            <img
              alt={t('settingsProfile.avatarAlt', {}, { defaultValue: 'Avatar upload' })}
              className={cm.cn(cm.w(32), cm.h(32), cm.roundedFull, 'object-cover shadow-inner')}
              data-alt="Professional profile photograph of a designer in a high-end minimalist office with bokeh background lighting"
              src="https://picsum.photos/seed/SettingsProfileSection-1/1200/800"
            />
            <button
              type="button"
              aria-label={t('settingsProfile.changeAvatar', {}, { defaultValue: 'Change Avatar' })}
              className={cm.cn(
                cm.sp('p', 2),
                cm.roundedFull,
                'absolute bottom-0 right-0 bg-white shadow-md text-primary hover:text-primary-container',
              )}
              onClick={() =>
                setAvatarHint(
                  t(
                    'demo.actionNotWired',
                    {},
                    { defaultValue: 'Not available in this demo preview.' },
                  ),
                )
              }
            >
              <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                photo_camera
              </span>
            </button>
          </div>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-on-surface-variant uppercase tracking-widest',
            )}
          >
            {t('settingsProfile.changeAvatar', {}, { defaultValue: 'Change Avatar' })}
          </span>
        </div>
        <div className={cm.cn(cm.flex1, cm.grid({ cols: 1, gap: 'xl' }), 'md:grid-cols-2')}>
          <div className={cm.stack(2)}>
            <label
              htmlFor="settings-name"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-on-surface-variant uppercase tracking-wider',
              )}
            >
              {t('settingsProfile.displayNameLabel', {}, { defaultValue: 'Display Name' })}
            </label>
            <input
              id="settings-name"
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('medium'),
                'bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary text-on-surface',
              )}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className={cm.stack(2)}>
            <label
              htmlFor="settings-email"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-on-surface-variant uppercase tracking-wider',
              )}
            >
              {t('settingsProfile.emailLabel', {}, { defaultValue: 'Email Address' })}
            </label>
            <input
              id="settings-email"
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('medium'),
                'bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary text-on-surface',
              )}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={cm.stack(2)}>
            <label
              htmlFor="settings-jobtitle"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-on-surface-variant uppercase tracking-wider',
              )}
            >
              {t('settingsProfile.jobTitleLabel', {}, { defaultValue: 'Job Title' })}
            </label>
            <input
              id="settings-jobtitle"
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('medium'),
                'bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary text-on-surface',
              )}
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>
          <div className={cm.stack(2)}>
            <label
              htmlFor="settings-timezone"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-on-surface-variant uppercase tracking-wider',
              )}
            >
              {t('form.timezone', {}, { defaultValue: 'Timezone' })}
            </label>
            <select
              id="settings-timezone"
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('medium'),
                'bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary text-on-surface',
              )}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option>
                {t(
                  'settingsProfile.timezoneOption',
                  { offset: 'GMT-08:00', city: 'Pacific Time (US & Canada)' },
                  { defaultValue: '({{offset}}) {{city}}' },
                )}
              </option>
              <option>
                {t(
                  'settingsProfile.timezoneOption',
                  { offset: 'GMT+00:00', city: 'London' },
                  { defaultValue: '({{offset}}) {{city}}' },
                )}
              </option>
              <option>
                {t(
                  'settingsProfile.timezoneOption',
                  { offset: 'GMT+08:00', city: 'Singapore' },
                  { defaultValue: '({{offset}}) {{city}}' },
                )}
              </option>
            </select>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SettingsProfileSection
export { SettingsProfileSection }
