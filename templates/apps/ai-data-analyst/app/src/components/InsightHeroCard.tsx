/**
 * Gradient hero card — month-to-date "Insights surfaced" headline with
 * 6xl-extrabold value, frosted-glass change pill, decorative blurred orbs,
 * and an inline SVG area-chart of the recent sparkline.
 *
 * Translated from personal-finance's NetWorthCard.tsx — same gradient + orb
 * vocabulary, retuned to the data-analyst brand (insights instead of net
 * worth, sparkle icon instead of trending_up, indigo→cyan hint via the
 * primary→primary-container gradient already pinned in theme.css).
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export interface InsightHeroCardProps {
  /** Month-to-date metric — e.g. insights surfaced count, queries run, etc. */
  value: string
  /** Caption above the hero number. */
  label: string
  /** Percent change shown in the frosted pill. */
  deltaPct: number
  /** 8-point sparkline series for the inline area chart. */
  sparkline: number[]
  /** Optional CTA button text (e.g. "Ask Clarion"). When set, renders a CTA link. */
  ctaLabel?: string
  /** CTA destination route. */
  ctaTo?: string
}

export function InsightHeroCard({
  value,
  label,
  deltaPct,
  sparkline,
  ctaLabel,
  ctaTo,
}: InsightHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const max = Math.max(...sparkline, 1)
  const min = Math.min(...sparkline, 0)
  const range = Math.max(1, max - min)
  const points = sparkline
    .map((p, i, arr) => {
      const x = (i / Math.max(1, arr.length - 1)) * 400
      const y = 90 - ((p - min) / range) * 70
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const areaPath = `M0,100 L${points.split(' ').join(' L')} L400,100 Z`
  const positive = deltaPct >= 0

  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-on-primary relative overflow-hidden shadow-[0_24px_48px_rgba(53,37,205,0.18)]',
      )}
    >
      <div className={cm.cn('relative z-10', cm.flex({ direction: 'col', gap: 3 }))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
          <span
            className={cm.cn(
              'material-symbols-outlined',
              cm.textSize('base'),
              'text-on-primary/80',
            )}
            aria-hidden="true"
          >
            auto_awesome
          </span>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'font-headline uppercase tracking-[0.18em] text-on-primary/80',
            )}
          >
            {label}
          </h2>
        </div>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 4 }), 'flex-wrap')}>
          <span className={'text-6xl font-extrabold tracking-tighter tabular-nums leading-none'}>
            {value}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface/20 backdrop-blur-md tabular-nums',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}
              aria-hidden="true"
            >
              {positive ? 'trending_up' : 'trending_down'}
            </span>
            {positive ? '+' : ''}
            {deltaPct.toFixed(1)}%
          </span>
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-primary/70 max-w-md leading-relaxed')}>
          {t(
            'insightHeroCard.subtitle',
            { appName: APP_NAME },
            {
              defaultValue:
                'Trends, anomalies, and correlations {{appName}} has surfaced from your datasets this month.',
            },
          )}
        </p>
        {ctaLabel && ctaTo ? (
          <Link
            to={ctaTo}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.roundedFull,
              cm.sp('mt', 2),
              'self-start bg-surface text-primary hover:bg-surface/90 transition-colors shadow-sm',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
              aria-hidden="true"
            >
              auto_awesome
            </span>
            {ctaLabel}
          </Link>
        ) : null}
      </div>

      <div className={cm.cn('relative z-10', cm.sp('mt', 6), 'h-24 w-full')}>
        <svg
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
          className={'w-full h-full opacity-90'}
          aria-hidden="true"
        >
          <path d={areaPath} fill="white" opacity="0.18" />
          <polyline
            points={points}
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <span
        aria-hidden="true"
        className={'absolute -right-24 -bottom-24 w-80 h-80 rounded-full bg-surface/10 blur-3xl'}
      />
      <span
        aria-hidden="true"
        className={
          'absolute right-12 top-12 w-24 h-24 rounded-full bg-secondary-container/30 blur-2xl'
        }
      />
      <span
        aria-hidden="true"
        className={'absolute -left-16 top-1/3 w-48 h-48 rounded-full bg-secondary/20 blur-3xl'}
      />
    </section>
  )
}

export default InsightHeroCard
