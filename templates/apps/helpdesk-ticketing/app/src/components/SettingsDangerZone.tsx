import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SettingsDangerZoneProps {
  onDeactivate: () => void
  deactivating: boolean
}

function SettingsDangerZone({ onDeactivate, deactivating }: SettingsDangerZoneProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.sp('mt', 16), cm.sp('pt', 8), 'border-t border-border')}>
      <h3
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          cm.sp('mb', 4),
          'text-error uppercase tracking-[0.15em]',
        )}
      >
        {t('settingsDangerZone.heading', {}, { defaultValue: 'Danger Zone' })}
      </h3>
      <div
        className={cm.cn(
          cm.sp('p', 6),
          cm.flex({ align: 'center', justify: 'between' }),
          'bg-error-container/20 rounded-xl',
        )}
      >
        <div>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('settingsDangerZone.deactivateTitle', {}, { defaultValue: 'Deactivate Account' })}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'settingsDangerZone.deactivateDescription',
              {},
              { defaultValue: 'Temporarily disable your account and hide your profile.' },
            )}
          </p>
        </div>
        <button
          onClick={onDeactivate}
          disabled={deactivating}
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'rounded-xl bg-surface border border-error/20 text-error hover:bg-error hover:text-white transition-all',
          )}
        >
          {deactivating
            ? t('settingsDangerZone.deactivating', {}, { defaultValue: 'Deactivating...' })
            : t('settingsDangerZone.deactivate', {}, { defaultValue: 'Deactivate' })}
        </button>
      </div>
    </div>
  )
}

export default SettingsDangerZone
export { SettingsDangerZone }
