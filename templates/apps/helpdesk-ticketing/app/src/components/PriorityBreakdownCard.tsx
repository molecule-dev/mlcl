import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface PriPoint {
  priority: string
  count: number
}
const PRI_STYLES: Record<string, { label: string; bar: string; track: string }> = {
  urgent: { label: 'text-error', bar: 'bg-error', track: 'bg-error-container/20' },
  critical: { label: 'text-error', bar: 'bg-error', track: 'bg-error-container/20' },
  high: { label: 'text-tertiary', bar: 'bg-tertiary-container', track: 'bg-tertiary-fixed/20' },
  medium: { label: 'text-primary', bar: 'bg-primary', track: 'bg-primary-container/20' },
  low: { label: 'text-secondary', bar: 'bg-secondary', track: 'bg-secondary-fixed/20' },
}
const DEFAULT_PRIORITIES: PriPoint[] = [
  { priority: 'critical', count: 8 },
  { priority: 'high', count: 24 },
  { priority: 'medium', count: 36 },
  { priority: 'low', count: 19 },
]
function PriorityBreakdownCard({
  priorityData = [],
  loading = false,
}: {
  priorityData?: PriPoint[]
  loading?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 8),
        cm.stack(6),
        'bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm',
      )}
    >
      <div className={cm.cn(cm.stack(2), cm.sp('mb', 8))}>
        <h3
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('priorityBreakdownCard.title', {}, { defaultValue: 'By Priority' })}
        </h3>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'priorityBreakdownCard.subtitle',
            {},
            { defaultValue: 'Urgency distribution of active load' },
          )}
        </p>
      </div>
      {(() => {
        if (loading)
          return (
            <div
              className={cm.cn(
                cm.stack(6),
                cm.flex({ align: 'center', justify: 'center' }),
                cm.flex1,
              )}
            >
              <span
                className={cm.cn(cm.fontWeight('medium'), 'text-[10px] text-on-surface-variant')}
              >
                {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
              </span>
            </div>
          )
        const rows = priorityData.length > 0 ? priorityData : DEFAULT_PRIORITIES
        const maxCount = Math.max(...rows.map((p) => p.count), 1)
        return (
          <div className={cm.cn(cm.stack(6), cm.flex1)}>
            {rows.map((item) => {
              const key = item.priority.toLowerCase()
              const st = PRI_STYLES[key] || PRI_STYLES.low
              return (
                <div key={key} className={cm.stack(2)}>
                  <div
                    className={cm.cn(
                      cm.flex({ justify: 'between', align: 'center' }),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                    )}
                  >
                    <span className={cm.cn(st.label, 'uppercase tracking-widest')}>
                      {t(
                        `priorityBreakdownCard.priority.${key}`,
                        {},
                        {
                          defaultValue:
                            { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }[
                              key
                            ] || key.charAt(0).toUpperCase() + key.slice(1),
                        },
                      )}
                    </span>
                    <span className={cm.cn('text-on-surface')}>
                      {String(item.count).padStart(2, '0')}
                    </span>
                  </div>
                  <div className={cm.cn(cm.h(2), cm.roundedFull, st.track, 'overflow-hidden')}>
                    <div
                      className={cm.cn(cm.h('full'), cm.roundedFull, st.bar)}
                      style={{ width: `${Math.round((item.count / maxCount) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}
export default PriorityBreakdownCard
export { PriorityBreakdownCard }
