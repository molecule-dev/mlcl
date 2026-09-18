import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_GRADIENT } from '../branding.js'

interface ParcelaHeroCardProps {
  /** Total documents processed in the period (e.g. today). */
  processedCount: number
  /** Optional change vs. prior period for the frosted-glass pill. */
  changePercent?: number
  /** Average extraction accuracy 0..100 — drives the inline progress mark. */
  accuracyPercent?: number
  /** Day-by-day series for the sparkline. Each value is a doc count. */
  history?: ReadonlyArray<{ date: string; count: number }>
}

function buildSparkline(history?: ReadonlyArray<{ date: string; count: number }>) {
  if (!history || history.length < 2) {
    return {
      fill: 'M0,80 L40,70 L80,75 L120,55 L160,60 L200,40 L240,52 L280,30 L320,38 L360,18 L400,28 L400,100 L0,100 Z',
      stroke: 'M0,80 L40,70 L80,75 L120,55 L160,60 L200,40 L240,52 L280,30 L320,38 L360,18 L400,28',
    }
  }
  const W = 400
  const H = 100
  const values = history.map((p) => p.count)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - ((v - min) / range) * (H * 0.85) - H * 0.1
    return [x, y]
  })
  const stroke = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  const fill = `${stroke} L${W},${H} L0,${H} Z`
  return { fill, stroke }
}

/**
 * Gradient hero card — large processed-today number, frosted-glass change pill,
 * inline sparkline of daily volume, decorative blurred orbs in the corners.
 *
 * Translated from banking-dashboard's BalanceHeroCard (originally personal-finance's
 * NetWorthCard) — adapted for document-volume framing instead of currency.
 */
export function ParcelaHeroCard({
  processedCount,
  changePercent,
  accuracyPercent,
  history,
}: ParcelaHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const positive = (changePercent ?? 0) >= 0
  const paths = buildSparkline(history)

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] lg:col-span-8 rounded-[2rem] text-white relative overflow-hidden',
      )}
      style={{ background: BRAND_GRADIENT }}
    >
      <div className={cm.cn('relative z-10')}>
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-white/75',
          )}
        >
          {t('parcelaHeroCard.title', {}, { defaultValue: 'Documents processed today' })}
        </h2>
        <div className={cm.flex({ align: 'baseline', gap: 'md' })}>
          <span className={cm.cn('text-6xl font-extrabold tracking-tighter tabular-nums')}>
            {processedCount.toLocaleString()}
          </span>
          {typeof changePercent === 'number' ? (
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'bg-surface/20 backdrop-blur-md',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                {positive ? 'trending_up' : 'trending_down'}
              </span>
              {t(
                'parcelaHeroCard.change',
                { sign: positive ? '+' : '', amount: Math.abs(changePercent).toFixed(1) },
                { defaultValue: '{{sign}}{{amount}}% vs yesterday' },
              )}
            </span>
          ) : null}
        </div>
        {typeof accuracyPercent === 'number' ? (
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 4), 'text-white/80')}>
            {t(
              'parcelaHeroCard.accuracy',
              { value: accuracyPercent.toFixed(1) },
              { defaultValue: 'Avg accuracy {{value}}% across all extractions' },
            )}
          </p>
        ) : null}
      </div>

      <div
        className={cm.cn(
          cm.sp('mt', 12),
          cm.h(24),
          cm.w('full'),
          cm.flex({ align: 'end' }),
          'relative z-10',
        )}
      >
        <svg
          className={cm.cn(cm.w('full'), cm.h('full'))}
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
        >
          <path d={paths.fill} fill="white" opacity="0.28" />
          <path d={paths.stroke} fill="none" stroke="white" strokeWidth="3" />
        </svg>
      </div>

      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-20 -bottom-20 bg-surface/10 blur-3xl',
        )}
      />
      <div
        className={cm.cn(
          cm.w(20),
          cm.h(20),
          cm.roundedFull,
          'absolute right-10 top-10 bg-surface/15 blur-xl',
        )}
      />
    </div>
  )
}
