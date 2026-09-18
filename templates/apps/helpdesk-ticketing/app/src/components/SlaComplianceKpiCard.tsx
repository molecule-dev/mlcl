import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SlaComplianceKpiCard({ value }: { value?: number } = {}) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('slaComplianceKpiCard.title', {}, { defaultValue: 'SLA Compliance' })}
        </span>
        <span className={cm.cn(cm.textPrimary, 'material-symbols-outlined')}>verified</span>
      </div>
      <div className={cm.flex({ align: 'baseline', gap: 2 })}>
        <span
          className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tighter text-on-surface')}
        >
          {t(
            'slaComplianceKpiCard.percentage',
            { percent: value ?? 94 },
            { defaultValue: '{{percent}}%' },
          )}
        </span>
      </div>
    </div>
  )
}

export default SlaComplianceKpiCard
export { SlaComplianceKpiCard }
