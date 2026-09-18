import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function OutputFlowNode() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('p', 4),
        cm.w(44),
        'absolute left-[880px] top-10 bg-surface-container rounded-xl border-l-4 border-green-500/50 gap-2 opacity-40',
      )}
    >
      <span
        className={cm.cn(cm.fontWeight('bold'), 'text-[10px] text-on-surface-variant uppercase')}
      >
        {t('outputFlowNode.label', {}, { defaultValue: 'Output' })}
      </span>
      <h3 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
        {t('outputFlowNode.title', {}, { defaultValue: 'Send Billing Info' })}
      </h3>
    </div>
  )
}

export default OutputFlowNode
export { OutputFlowNode }
