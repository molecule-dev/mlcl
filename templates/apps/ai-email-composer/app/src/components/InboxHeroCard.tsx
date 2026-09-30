import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface InboxHeroCardProps {
  /** Number of emails sent during the current period. */
  sent: number
  /** Percent change vs previous period (e.g. 12 => +12%). */
  changePct: number
  /** Optional engagement series — drives the SVG sparkline. */
  history?: ReadonlyArray<{ date: string; opens: number }>
}

/**
 * Signet's signature hero — purple-indigo gradient panel with the
 * "sent this week" headline metric, frosted-glass change pill, inline
 * SVG engagement sparkline, and decorative blurred orbs in the corners.
 *
 * Translated from banking-dashboard's BalanceHeroCard for the email
 * domain — keeps the visual treatment but renders Signet metrics.
 */
export function InboxHeroCard({ sent, changePct, history }: InboxHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const positive = changePct >= 0

  const sparkline = (() => {
    if (!history || history.length < 2) {
      return {
        fill: 'M0,80 Q40,60 80,55 T160,40 T240,30 T320,25 T400,15 L400,100 L0,100 Z',
        stroke: 'M0,80 Q40,60 80,55 T160,40 T240,30 T320,25 T400,15',
      }
    }
    const W = 400
    const H = 100
    const values = history.map((p) => p.opens)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const pts = values.map((v, i) => {
      const x = (i / (values.length - 1)) * W
      const y = H - ((v - min) / range) * (H * 0.85) - H * 0.1
      return [x, y] as const
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
        'min-h-[320px] lg:col-span-8 rounded-[2rem] text-white relative overflow-hidden',
      )}
      style={{
        background:
          'linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 70%, #a78bfa) 60%, color-mix(in srgb, var(--color-primary) 85%, #000) 100%)',
      }}
    >
      <div className={cm.cn('relative z-10')}>
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-white/70',
          )}
        >
          {t('inboxHeroCard.title', {}, { defaultValue: 'Sent This Week' })}
        </h2>
        <div className={cm.flex({ align: 'baseline', gap: 'md' })}>
          <span className={cm.cn('text-6xl font-extrabold tracking-tighter tabular-nums')}>
            {sent}
          </span>
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
              'inboxHeroCard.change',
              { sign: positive ? '+' : '', pct: changePct },
              { defaultValue: '{{sign}}{{pct}}% vs last week' },
            )}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 3), 'text-white/70 max-w-md')}>
          {t(
            'inboxHeroCard.subtitle',
            { app: APP_NAME },
            {
              defaultValue: `Drafts polished by ${APP_NAME} are landing better than ever — keep the momentum.`,
            },
          )}
        </p>
      </div>

      <div
        className={cm.cn(
          cm.sp('mt', 10),
          cm.w('full'),
          cm.flex({ direction: 'col' }),
          'relative z-10',
        )}
      >
        <h3
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-white/70',
          )}
        >
          {t('inboxHeroCard.trendHeading', {}, { defaultValue: 'Engagement Trend' })}
        </h3>
        <svg
          className={cm.cn(cm.w('full'), cm.h(16))}
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="signet-spark" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0.45" />
              <stop offset="100%" stopColor="white" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={sparkline.fill} fill="url(#signet-spark)" />
          <path
            d={sparkline.stroke}
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-20 -bottom-20 bg-surface/10 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(cm.w(20), cm.h(20), cm.roundedFull, 'absolute right-10 top-10 blur-xl')}
        style={{ background: 'color-mix(in srgb, var(--color-secondary) 35%, transparent)' }}
        aria-hidden="true"
      />
    </div>
  )
}
