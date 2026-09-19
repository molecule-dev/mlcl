import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface GuessDistributionProps {
  /** Counts keyed by attempt number ("1".."6"). Missing keys read as 0. */
  distribution: Record<string, number>
  /** The viewer's own winning attempt — rendered in brand green. */
  highlight?: number
}

/**
 * Win-count-by-attempts histogram (the Wordle stats bar chart). Bar widths
 * are proportional to the tallest bin; the inline width style is the one
 * genuinely dynamic value ClassMap can't express.
 */
export function GuessDistribution({ distribution, highlight }: GuessDistributionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const bins = Array.from({ length: 6 }, (_, i) => distribution[String(i + 1)] ?? 0)
  const max = Math.max(1, ...bins)

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))} data-mol-id="guess-distribution">
      {bins.map((count, i) => {
        const attempt = i + 1
        const isHighlight = highlight === attempt
        return (
          <div
            key={attempt}
            className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}
            data-mol-id={`dist-row-${attempt}`}
          >
            <span className={cm.cn(cm.textSize('sm'), 'font-bold w-4 text-on-surface')}>
              {t('stats.distribution.attempt', { count: attempt }, { defaultValue: `${attempt}` })}
            </span>
            <div className={cm.cn('flex-1 h-6 bg-surface-container-high rounded overflow-hidden')}>
              <div
                className={cm.cn(
                  'h-full rounded flex items-center justify-end px-1.5 min-w-[1.75rem] transition-all duration-500',
                  isHighlight ? 'bg-primary text-on-primary' : 'bg-outline text-white',
                )}
                style={{ width: `${Math.max(10, (100 * count) / max)}%` }}
              >
                <span className={cm.cn(cm.textSize('xs'), 'font-bold')}>{count}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default GuessDistribution
