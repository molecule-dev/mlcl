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
        'absolute left-[880px] top-10 bg-surface-container rounded-xl gap-2 opacity-40',
        cm.accentCard({ tone: 'custom' }),
      )}
      style={{
        ['--mol-accent' as string]: 'color-mix(in srgb, var(--color-green-500) 50%, transparent)',
      }}
    >
      <span className={cm.accentCardLabel({ tone: 'custom' })}>
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
