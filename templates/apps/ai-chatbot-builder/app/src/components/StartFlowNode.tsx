import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function StartFlowNode() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn('absolute left-12 top-40 z-10')}>
      <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), 'gap-2')}>
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'bg-green-500/20 border-2 border-green-500/50 text-green-400',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="inbox">
            inbox
          </span>
        </div>
        <span
          className={cm.cn(cm.fontWeight('bold'), 'text-[10px] text-on-surface-variant uppercase')}
        >
          {t('startFlowNode.userMessage', {}, { defaultValue: 'User Message' })}
        </span>
      </div>
    </div>
  )
}

export default StartFlowNode
export { StartFlowNode }
