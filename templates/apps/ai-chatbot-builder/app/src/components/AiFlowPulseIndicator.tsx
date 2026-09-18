import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AiFlowPulseIndicator() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center' }),
        cm.sp('px', 4),
        cm.sp('py', 2),
        cm.roundedFull,
        'fixed bottom-8 left-1/2 -translate-x-1/2 gap-3 bg-surface-container-highest/80 backdrop-blur-md border border-surface/5 shadow-2xl z-50',
      )}
    >
      <div className={cm.cn('relative')}>
        <div className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-amber-500')}></div>
        <div
          className={cm.cn(
            cm.w(2),
            cm.h(2),
            cm.roundedFull,
            'absolute inset-0 bg-amber-400 animate-ping opacity-75',
          )}
        ></div>
      </div>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          'text-[10px] text-amber-200 uppercase tracking-widest',
        )}
      >
        {t('aiFlowPulseIndicator.liveStatus', {}, { defaultValue: 'AI Flow Analysis Live' })}
      </span>
    </div>
  )
}

export default AiFlowPulseIndicator
export { AiFlowPulseIndicator }
