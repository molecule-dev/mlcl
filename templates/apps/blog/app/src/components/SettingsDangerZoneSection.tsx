import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'
interface SettingsDangerZoneSectionProps {
  onConfirm: () => void | Promise<void>
}
function SettingsDangerZoneSection({ onConfirm }: SettingsDangerZoneSectionProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(
        cm.grid({ cols: 1, gap: 'none' }),
        'md:grid-cols-12 items-start gap-x-10 gap-y-6',
      )}
    >
      <div className={cm.fvf71e6921}>
        <h3
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('semibold'),
            'font-headline text-error',
          )}
        >
          {t('settingsDangerZoneSection.title', {}, { defaultValue: 'Danger Zone' })}
        </h3>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant font-label')}
        >
          {t(
            'settingsDangerZoneSection.description',
            {},
            { defaultValue: 'Critical account actions. Handle with care.' },
          )}
        </p>
      </div>
      <div
        className={cm.cn(
          cm.sp('p', 8),
          cm.stack(6),
          'md:col-span-8 border-2 border-error-container bg-error-container/10 rounded-xl editorial-shadow',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'between', gap: 'lg' }),
            'md:flex-row md:items-center',
          )}
        >
          <div>
            <p className={cm.cn(cm.fontWeight('bold'), 'font-label text-on-surface')}>
              {t('settings.deleteAccountModal.title', {}, { defaultValue: 'Delete Account' })}
            </p>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 1),
                'text-on-surface-variant font-body italic',
              )}
            >
              {t(
                'settingsDangerZoneSection.deleteWarning',
                {},
                {
                  defaultValue:
                    'This action is permanent and cannot be undone. All essays, comments, and data will be erased from our servers.',
                },
              )}
            </p>
          </div>
          <ConfirmButton
            label={t('settings.deleteAccountModal.title', {}, { defaultValue: 'Delete Account' })}
            confirmLabel={t(
              'settings.deleteAccountConfirm',
              {},
              {
                defaultValue:
                  'Are you sure you want to permanently delete your account? This cannot be undone.',
              },
            )}
            pendingLabel={t(
              'settings.deleteAccountModal.deleting',
              {},
              { defaultValue: 'Deleting...' },
            )}
            onConfirm={onConfirm}
            disarmSeconds={6}
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'bg-error text-on-error rounded-lg font-label hover:bg-error-container hover:text-on-error-container transition-colors shadow-sm whitespace-nowrap',
            )}
            data-mol-id="delete-account"
            aria-label={t(
              'settingsDangerZoneSection.deleteAriaLabel',
              {},
              { defaultValue: 'Permanently delete my account' },
            )}
          />
        </div>
      </div>
    </section>
  )
}

export default SettingsDangerZoneSection
export { SettingsDangerZoneSection }
