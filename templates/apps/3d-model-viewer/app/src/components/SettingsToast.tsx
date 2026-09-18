import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SettingsToast({ show }: { show: boolean }) {
  const { t } = useTranslation()
  const cm = getClassMap()
  if (!show) return null
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 3 }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        'fixed top-20 right-8 bg-surface-container-highest border border-outline-variant/15 rounded-lg shadow-[0_20px_40px_-5px_rgba(17,17,37,0.3)] z-50 animate-fade-in backdrop-blur-xl',
      )}
    >
      <div
        className={cm.cn(
          cm.w(6),
          cm.h(6),
          cm.roundedFull,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.textPrimary,
          'bg-primary-container/20',
        )}
      >
        <span
          className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          check_circle
        </span>
      </div>
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}>
        {t('settingsToast.preferencesSaved', {}, { defaultValue: 'Profile saved' })}
      </span>
    </div>
  )
}

export default SettingsToast
export { SettingsToast }
