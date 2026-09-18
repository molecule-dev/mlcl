import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AiPulseIndicator() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center' }),
        cm.sp('px', 4),
        cm.sp('py', 2),
        'fixed bottom-8 left-1/2 -translate-x-1/2 gap-3 bg-surface-container-highest/80 backdrop-blur-md rounded-full border border-surface/5 shadow-2xl z-50',
      )}
    >
      <div className={cm.cn('relative')}>
        <div className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-tertiary')}></div>
        <div
          className={cm.cn(
            cm.w(2),
            cm.h(2),
            cm.roundedFull,
            'absolute inset-0 bg-tertiary animate-ping opacity-75',
          )}
        ></div>
      </div>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          'text-[10px] text-tertiary uppercase tracking-widest',
        )}
      >
        {t('aiPulseIndicator.statusLabel', {}, { defaultValue: 'AI Flow Analysis Live' })}
      </span>
    </div>
  )
}

export default AiPulseIndicator
export { AiPulseIndicator }
