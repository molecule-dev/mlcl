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
        'absolute left-[580px] top-10 bg-surface-container rounded-xl gap-2 opacity-60',
        cm.accentCard({ tone: 'custom' }),
      )}
      style={{ ['--mol-accent' as string]: 'var(--color-outline)' }}
    >
      <span className={cm.accentCardLabel({ tone: 'custom' })}>
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
