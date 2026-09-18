import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SystemHealthCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl text-white shadow-lg',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 4), 'gap-2')}>
        <span className={cm.cn('material-symbols-outlined')} data-icon="auto_awesome">
          auto_awesome
        </span>
        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
          {t('systemHealthCard.title', {}, { defaultValue: 'System Health' })}
        </span>
      </div>
      <div className={cm.stack(4)}>
        <div>
          <div
            className={cm.cn(
              cm.flex({ justify: 'between' }),
              cm.sp('mb', 1),
              'text-[11px] font-bold uppercase tracking-widest opacity-80',
            )}
          >
            <span>{t('systemHealthCard.latencyLabel', {}, { defaultValue: 'Model Latency' })}</span>
            <span>
              {t(
                'systemHealthCard.latencyReading',
                { value: 240 },
                { defaultValue: '{{value}}ms' },
              )}
            </span>
          </div>
          <div className={cm.cn(cm.h(1), cm.roundedFull, 'bg-surface/20 overflow-hidden')}>
            <div className={cm.cn(cm.h('full'), 'bg-surface w-[75%]')}></div>
          </div>
        </div>
        <div>
          <div
            className={cm.cn(
              cm.flex({ justify: 'between' }),
              cm.sp('mb', 1),
              'text-[11px] font-bold uppercase tracking-widest opacity-80',
            )}
          >
            <span>
              {t('systemHealthCard.accuracyLabel', {}, { defaultValue: 'Accuracy Score' })}
            </span>
            <span>
              {t(
                'systemHealthCard.accuracyReading',
                { value: '98.2' },
                { defaultValue: '{{value}}%' },
              )}
            </span>
          </div>
          <div className={cm.cn(cm.h(1), cm.roundedFull, 'bg-surface/20 overflow-hidden')}>
            <div className={cm.cn(cm.h('full'), 'bg-surface w-[98%]')}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SystemHealthCard
export { SystemHealthCard }
