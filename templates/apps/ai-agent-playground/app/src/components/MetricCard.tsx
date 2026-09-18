// Pattern source: ai-chatbot-builder/components/BotAnalyticsKPICard.tsx
// Compact metric tile — uppercase mono label, bold tabular numeric value, optional live pulse.
import { getClassMap } from '@molecule/app-ui'

interface MetricCardProps {
  label: string
  value: string
  unit?: string
  live?: boolean
  liveLabel?: string
}

export function MetricCard({ label, value, unit, live, liveLabel }: MetricCardProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 4),
        'bg-surface-container-high rounded relative overflow-hidden border border-outline-variant/15',
      )}
    >
      {live && (
        <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }), 'absolute top-4 right-4')}>
          <div className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-secondary animate-pulse')} />
          <span className="font-mono text-[10px] text-secondary uppercase tracking-widest">
            {liveLabel}
          </span>
        </div>
      )}
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.sp('mb', 1),
          'text-tertiary font-headline uppercase tracking-wider block',
        )}
      >
        {label}
      </span>
      <div
        className={cm.cn(
          cm.textSize('2xl'),
          cm.fontWeight('bold'),
          'font-mono tabular-nums text-on-surface',
        )}
      >
        {value}
        {unit && (
          <span className={cm.cn(cm.textSize('sm'), cm.sp('ml', 1), 'text-tertiary')}>{unit}</span>
        )}
      </div>
    </div>
  )
}

export default MetricCard
