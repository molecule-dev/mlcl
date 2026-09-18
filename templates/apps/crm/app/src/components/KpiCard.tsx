import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function KpiCard({ count = 47, change = '+12%' }: { count?: number; change?: string }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-3xl border border-border border-t-4 border-t-primary border-l-0 shadow-sm',
      )}
    >
      <div className={cm.flex({ justify: 'between', align: 'start' })}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'text-on-surface-variant tracking-wider uppercase',
          )}
        >
          {t('kpiCard.label', {}, { defaultValue: 'Active Deals' })}
        </span>
        <div
          className={cm.cn(
            cm.sp('px', 2),
            cm.fontWeight('bold'),
            'text-success bg-success-light py-0.5 rounded text-[10px]',
          )}
        >
          {change}
        </div>
      </div>
      <div className={cm.cn(cm.sp('mt', 2), cm.flex({ align: 'baseline' }), 'gap-2')}>
        <span className={cm.cn(cm.textSize('3xl'), 'font-black text-on-surface')}>{count}</span>
        <div className={cm.cn(cm.flex1, cm.h(6))}>
          {/* Visual placeholder for sparkline */}
          <div className={cm.cn(cm.w('full'), cm.h('full'), cm.flex({ align: 'end' }), 'gap-0.5')}>
            <div className={cm.cn(cm.w(1), cm.h(2), 'bg-primary/20 rounded-t-sm')}></div>
            <div className={cm.cn(cm.w(1), cm.h(3), 'bg-primary/20 rounded-t-sm')}></div>
            <div className={cm.cn(cm.w(1), cm.h(5), 'bg-primary/40 rounded-t-sm')}></div>
            <div className={cm.cn(cm.w(1), cm.h(4), 'bg-primary/30 rounded-t-sm')}></div>
            <div className={cm.cn(cm.w(1), cm.h(6), 'bg-primary/60 rounded-t-sm')}></div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default KpiCard
