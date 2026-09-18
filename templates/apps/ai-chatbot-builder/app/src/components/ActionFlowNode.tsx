import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ActionFlowNode() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('p', 4),
        cm.w(44),
        'absolute left-[580px] top-10 bg-surface-container rounded-xl border-l-4 border-outline gap-2 opacity-60',
      )}
    >
      <span
        className={cm.cn(cm.fontWeight('bold'), 'text-[10px] text-on-surface-variant uppercase')}
      >
        {t('actionFlowNode.typeLabel', {}, { defaultValue: 'Action' })}
      </span>
      <h3 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
        {t('actionFlowNode.title', {}, { defaultValue: 'Check Account' })}
      </h3>
    </div>
  )
}

export default ActionFlowNode
export { ActionFlowNode }
