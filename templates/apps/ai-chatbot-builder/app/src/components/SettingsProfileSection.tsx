import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SettingsProfileSectionProps {
  name: string
  onNameChange: (v: string) => void
  email: string
  onEmailChange: (v: string) => void
  organization: string
  onOrganizationChange: (v: string) => void
  timezone: string
  onTimezoneChange: (v: string) => void
  language: string
  onLanguageChange: (v: string) => void
}
function SettingsProfileSection({
  name,
  onNameChange,
  email,
  onEmailChange,
  organization,
  onOrganizationChange,
  timezone,
  onTimezoneChange,
  language,
  onLanguageChange,
}: SettingsProfileSectionProps) {
  const cm = getClassMap()
  const { t, locale, setLocale, locales } = useTranslation()
  const { user } = useAuth<{ name?: string; avatarUrl?: string }>()
  void language
  return (
    <>
      {/* Profile Section */}
      <section className={cm.stack(6)}>
        <h3
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'font-headline tracking-tight',
          )}
        >
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </h3>
        <div
          className={cm.cn(
            cm.sp('p', 8),
            'bg-surface-container-lowest rounded-3xl ambient-shadow relative overflow-hidden',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'start' }), 'gap-12')}>
            <div className={cm.cn('relative')}>
              <img
                className={cm.cn(
                  cm.w(32),
                  cm.h(32),
                  cm.roundedFull,
                  'object-cover ring-4 ring-surface-container-high',
                )}
                alt={user?.name || 'Profile avatar'}
                src={
                  user?.avatarUrl || 'https://picsum.photos/seed/SettingsProfileSection-1/1200/800'
                }
              />
            </div>
            <div className={cm.cn(cm.flex1, cm.grid({ cols: 2, gap: 'none' }), 'gap-x-8 gap-y-6')}>
              <div className={cm.cn('col-span-1')}>
                <label
                  htmlFor="settings-full-name"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 2),
                    cm.sp('ml', 1),
                    'block text-on-surface-variant uppercase tracking-wider',
                  )}
                >
                  {t('settingsProfile.fullName', {}, { defaultValue: 'Full Name' })}
                </label>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 5),
                    cm.fontWeight('medium'),
                    'bg-surface-container-high border-none rounded-2xl py-3.5 text-on-surface focus:ring-2 focus:ring-surface-tint/15 transition-shadow',
                  )}
                  id="settings-full-name"
                  type="text"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                />
              </div>
              <div className={cm.cn('col-span-1')}>
                <label
                  htmlFor="settings-email"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 2),
                    cm.sp('ml', 1),
                    'block text-on-surface-variant uppercase tracking-wider',
                  )}
                >
                  {t('settingsProfile.emailAddress', {}, { defaultValue: 'Email Address' })}
                </label>
                <div className={cm.cn('relative')}>
                  <input
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('px', 5),
                      cm.fontWeight('medium'),
                      'bg-surface-container-high border-none rounded-2xl py-3.5 text-on-surface focus:ring-2 focus:ring-surface-tint/15 transition-shadow',
                    )}
                    id="settings-email"
                    type="email"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                  />
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.roundedFull,
                      cm.sp('py', 1),
                      'absolute right-4 top-1/2 -translate-y-1/2 gap-1.5 px-2.5 bg-tertiary/10 text-tertiary',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-[14px]')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-tighter',
                      )}
                    >
                      {t('settingsProfile.verified', {}, { defaultValue: 'Verified' })}
                    </span>
                  </div>
                </div>
              </div>
              <div className={cm.cn('col-span-2')}>
                <label
                  htmlFor="settings-organization"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 2),
                    cm.sp('ml', 1),
                    'block text-on-surface-variant uppercase tracking-wider',
                  )}
                >
                  {t('form.organization', {}, { defaultValue: 'Organization' })}
                </label>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 5),
                    cm.fontWeight('medium'),
                    'bg-surface-container-high border-none rounded-2xl py-3.5 text-on-surface focus:ring-2 focus:ring-surface-tint/15 transition-shadow',
                  )}
                  id="settings-organization"
                  type="text"
                  value={organization}
                  onChange={(e) => onOrganizationChange(e.target.value)}
                />
              </div>
              <div className={cm.cn('col-span-1')}>
                <label
                  htmlFor="settings-timezone"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 2),
                    cm.sp('ml', 1),
                    'block text-on-surface-variant uppercase tracking-widest',
                  )}
                >
                  {t('form.timezone', {}, { defaultValue: 'Timezone' })}
                </label>
                <select
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.fontWeight('medium'),
                    'bg-surface-container-high border-none rounded-xl text-on-surface focus:ring-2 focus:ring-primary/15 transition-all appearance-none',
                  )}
                  id="settings-timezone"
                  value={timezone}
                  onChange={(e) => onTimezoneChange(e.target.value)}
                >
                  <option>
                    {t(
                      'settingsProfile.timezonePacific',
                      {},
                      { defaultValue: 'Pacific Time (PT) - UTC-8' },
                    )}
                  </option>
                  <option>
                    {t(
                      'settingsProfile.timezoneEastern',
                      {},
                      { defaultValue: 'Eastern Time (ET) - UTC-5' },
                    )}
                  </option>
                  <option>
                    {t('settingsProfile.timezoneUtc', {}, { defaultValue: 'UTC +0:00' })}
                  </option>
                </select>
              </div>
              <div className={cm.cn('col-span-1')}>
                <label
                  htmlFor="settings-language"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 2),
                    cm.sp('ml', 1),
                    'block text-on-surface-variant uppercase tracking-widest',
                  )}
                >
                  {t('footer.language', {}, { defaultValue: 'Language' })}
                </label>
                <select
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.fontWeight('medium'),
                    'bg-surface-container-high border-none rounded-xl text-on-surface focus:ring-2 focus:ring-primary/15 transition-all appearance-none',
                  )}
                  data-mol-id="language-picker-select"
                  id="settings-language"
                  value={locale}
                  onChange={(e) => {
                    setLocale(e.target.value)
                    onLanguageChange(e.target.value)
                  }}
                >
                  {[...locales]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default SettingsProfileSection
export { SettingsProfileSection }
