/**
 * 0-10 NPS distribution strip — one cell per score, colored along the
 * detractor → passive → promoter gradient (DESIGN.md "NPS scale").
 * Each cell shows the score and the response count; the underlying
 * proportion is rendered as a fill height inside the cell.
 *
 * Bespoke chart for Gauge — translated from blog/ChartCard's inline-SVG
 * habit but rendered as flex cells so accessibility text stays readable.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface NpsDistributionBarProps {
  /** Counts at each score 0..10 (must be length 11). */
  counts: number[]
}

function npsToneFor(score: number): { bg: string; text: string } {
  if (score <= 6) return { bg: 'bg-error-light', text: 'text-[color:var(--color-on-error)]' }
  if (score <= 8) return { bg: 'bg-warning-light', text: 'text-[color:var(--color-on-warning)]' }
  return { bg: 'bg-success-light', text: 'text-[color:var(--color-on-success)]' }
}

function npsLabelFor(score: number): string {
  if (score <= 6) return 'Detractor'
  if (score <= 8) return 'Passive'
  return 'Promoter'
}

function NpsDistributionBar({ counts }: NpsDistributionBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const max = Math.max(1, ...counts)

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
      <div
        className={cm.cn(cm.flex({ gap: 1 }), cm.w('full'), 'items-stretch')}
        role="list"
        aria-label={t(
          'npsDistributionBar.aria',
          {},
          { defaultValue: 'NPS distribution from 0 to 10' },
        )}
      >
        {counts.map((count, score) => {
          const tone = npsToneFor(score)
          const fillHeight = `${Math.max(8, (count / max) * 100)}%`
          return (
            <div
              key={score}
              role="listitem"
              className={cm.cn(
                cm.flex({ direction: 'col', justify: 'end', align: 'center' }),
                cm.flex1,
                cm.h(28),
                'rounded-md bg-surface-secondary relative overflow-hidden border border-[color:var(--color-border)]',
              )}
              aria-label={t(
                'npsDistributionBar.cellAria',
                { score, count, label: npsLabelFor(score) },
                { defaultValue: '{{label}} score {{score}}: {{count}} responses' },
              )}
            >
              <div
                aria-hidden="true"
                className={cm.cn(cm.w('full'), tone.bg, 'transition-all duration-500')}
                style={{ height: fillHeight }}
              />
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'center', gap: 0 }),
                  cm.sp('py', 2),
                  'absolute inset-x-0 bottom-0 z-10',
                )}
              >
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    tone.text,
                    'tabular-nums',
                  )}
                >
                  {score}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('medium'),
                    tone.text,
                    'tabular-nums opacity-80',
                  )}
                >
                  {count}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'uppercase tracking-widest',
        )}
      >
        <span className={cm.cn('text-[color:var(--color-on-error)]')}>
          {t('npsDistributionBar.detractor', {}, { defaultValue: 'Detractor 0–6' })}
        </span>
        <span className={cm.cn('text-[color:var(--color-on-warning)]')}>
          {t('npsDistributionBar.passive', {}, { defaultValue: 'Passive 7–8' })}
        </span>
        <span className={cm.cn('text-[color:var(--color-on-success)]')}>
          {t('npsDistributionBar.promoter', {}, { defaultValue: 'Promoter 9–10' })}
        </span>
      </div>
    </div>
  )
}

export default NpsDistributionBar
export { NpsDistributionBar }
