import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-react'
interface SettingsPrivacySectionProps {
  profileVisible: boolean
  showEmail: boolean
  onToggleVisibility: () => void
  onToggleShowEmail: () => void
}
function SettingsPrivacySection({
  profileVisible,
  showEmail,
  onToggleVisibility,
  onToggleShowEmail,
}: SettingsPrivacySectionProps) {
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
          {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
        </h3>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant font-label')}
        >
          {t(
            'settingsPrivacySection.description',
            {},
            { defaultValue: 'Control the visibility of your data and presence.' },
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
                'settingsPrivacySection.profileVisibilityLabel',
                {},
                { defaultValue: 'Public Profile Visibility' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'settingsPrivacySection.profileVisibilityHint',
                {},
                { defaultValue: 'Allow search engines to index your profile.' },
              )}
            </p>
          </div>
          <Switch
            checked={profileVisible}
            onChange={() => onToggleVisibility()}
            size="md"
            color="primary"
            data-mol-id="toggle-visibility"
            aria-label={t(
              'settingsPrivacySection.profileVisibilityLabel',
              {},
              { defaultValue: 'Public Profile Visibility' },
            )}
          />
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('py', 2))}>
          <div>
            <p className={cm.cn(cm.fontWeight('medium'), 'font-label text-on-surface')}>
              {t(
                'settingsPrivacySection.showEmailLabel',
                {},
                { defaultValue: 'Show Email on Profile' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'settingsPrivacySection.showEmailHint',
                {},
                { defaultValue: 'Display your professional email to other readers.' },
              )}
            </p>
          </div>
          <Switch
            checked={showEmail}
            onChange={() => onToggleShowEmail()}
            size="md"
            color="primary"
            data-mol-id="toggle-show-email"
            aria-label={t(
              'settingsPrivacySection.showEmailLabel',
              {},
              { defaultValue: 'Show Email on Profile' },
            )}
          />
        </div>
      </div>
    </section>
  )
}

export default SettingsPrivacySection
export { SettingsPrivacySection }
