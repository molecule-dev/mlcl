import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TranslationHeroCardProps {
  /** Total words translated this period. */
  wordsTranslated: number
  /** Change vs previous period (positive or negative). */
  change: number
  /** AI confidence (0-100). */
  confidence: number
  /** Optional weekly volume series (length 1+); fills the SVG sparkline. */
  history?: ReadonlyArray<number>
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

/**
 * Gradient hero card — total words translated as a 6xl-extrabold
 * tabular number, frosted-glass change pill, AI confidence chip,
 * inline SVG sparkline + decorative blurred orbs.
 *
 * Translated from banking-dashboard's BalanceHeroCard.tsx — same
 * orb-and-gradient anatomy with translation-themed labels and a
 * confidence chip in the bottom-right (Rendition's signature metric).
 */
export function TranslationHeroCard({
  wordsTranslated,
  change,
  confidence,
  history,
}: TranslationHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const positive = change >= 0

  const sparklinePaths = (() => {
    if (!history || history.length < 2) {
      return {
        fill: 'M0,80 Q50,60 100,70 T200,30 T300,50 T400,10 L400,100 L0,100 Z',
        stroke: 'M0,80 Q50,60 100,70 T200,30 T300,50 T400,10',
      }
    }
    const W = 400,
      H = 100
    const min = Math.min(...history),
      max = Math.max(...history)
    const range = max - min || 1
    const pts = history.map((v, i) => {
      const x = (i / (history.length - 1)) * W
      const y = H - ((v - min) / range) * (H * 0.85) - H * 0.1
      return [x, y]
    })
    const stroke = pts
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' ')
    const fill = `${stroke} L${W},${H} L0,${H} Z`
    return { fill, stroke }
  })()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] lg:col-span-8 bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary-fixed/80',
          )}
        >
          {t('translationHeroCard.label', {}, { defaultValue: 'Words translated · last 30 days' })}
        </p>
        <div className={cm.flex({ align: 'baseline', gap: 'md', wrap: 'wrap' })}>
          <span className={cm.cn('text-6xl font-extrabold tracking-tighter tabular-nums')}>
            {fmtCount(wordsTranslated)}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'inline-flex px-3 py-1 rounded-full bg-surface/20 backdrop-blur-md',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
              {positive ? 'trending_up' : 'trending_down'}
            </span>
            {t(
              'translationHeroCard.change',
              { sign: positive ? '+' : '−', amount: fmtCount(Math.abs(change)) },
              { defaultValue: '{{sign}}{{amount}} vs last period' },
            )}
          </span>
        </div>
      </div>

      <div
        className={cm.cn(
          cm.sp('mt', 8),
          cm.h(20),
          cm.w('full'),
          'relative z-10 pointer-events-none',
        )}
        aria-hidden="true"
      >
        <svg
          className={cm.cn(cm.w('full'), cm.h('full'))}
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
        >
          <path d={sparklinePaths.fill} fill="white" opacity="0.3" />
          <path d={sparklinePaths.stroke} fill="none" stroke="white" strokeWidth="3" />
        </svg>
      </div>

      {/* Confidence chip */}
      <div
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 4), 'relative z-10')}
      >
        <span
          className={cm.cn(cm.textSize('xs'), 'text-white/70 uppercase tracking-widest font-bold')}
        >
          {t('translationHeroCard.confidenceLabel', {}, { defaultValue: 'AI confidence' })}
        </span>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface/15 backdrop-blur-md text-xs',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
            bolt
          </span>
          {confidence}%
        </span>
      </div>

      {/* Decorative orbs */}
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-surface/10 blur-3xl',
        )}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute right-10 top-10 w-20 h-20 rounded-full bg-primary-fixed/20 blur-xl',
        )}
      />
    </div>
  )
}
