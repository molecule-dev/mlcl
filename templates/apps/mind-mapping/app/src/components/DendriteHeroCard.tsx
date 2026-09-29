import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Gradient hero card — large primary metric (active maps) in 6xl-extrabold,
 * frosted-glass change pill, decorative blurred orbs, inline SVG branching
 * sparkline. The signature visual element of the Dendrite dashboard.
 *
 * Translated from personal-finance's NetWorthCard.tsx — same gradient,
 * orbs, and pill, with the sparkline reshaped into a branching tree to
 * match the mind-map domain.
 */

export interface DendriteHeroCardProps {
  totalMaps: number
  weeklyDelta?: number
  greetingName?: string
  callToActionHref?: string
}

// Time-of-day greetings (design: "Good morning, Alex") — literal fallbacks so
// translations and the doc scanner can see each variant.
const TIME_GREETINGS = {
  morning: {
    key: 'dendriteHero.greeting.morning',
    fallback: 'Good morning, {{name}}',
  },
  afternoon: {
    key: 'dendriteHero.greeting.afternoon',
    fallback: 'Good afternoon, {{name}}',
  },
  evening: {
    key: 'dendriteHero.greeting.evening',
    fallback: 'Good evening, {{name}}',
  },
} as const

export function DendriteHeroCard({
  totalMaps,
  weeklyDelta = 0,
  greetingName,
  callToActionHref = '/maps',
}: DendriteHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const positive = weeklyDelta >= 0
  const sign = positive ? '+' : ''
  // Time-of-day for the personal greeting (design: "Good morning, Alex").
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  return (
    <section
      className={cm.cn(
        'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-xl',
      )}
    >
      <div
        className={cm.cn(
          'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
        )}
        aria-hidden
      />
      <div
        className={cm.cn('absolute -left-24 -top-24 w-72 h-72 rounded-full bg-surface/10 blur-3xl')}
        aria-hidden
      />
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'xl' }),
          cm.sp('p', 10),
          'relative md:flex-row md:items-end md:justify-between',
        )}
      >
        <div className={cm.cn(cm.stack(4), 'max-w-xl')}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              'self-start bg-surface/20 backdrop-blur-md text-[10px] uppercase tracking-widest rounded-full',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              auto_awesome
            </span>
            {greetingName
              ? t(
                  TIME_GREETINGS[timeOfDay].key,
                  { name: greetingName },
                  { defaultValue: TIME_GREETINGS[timeOfDay].fallback },
                )
              : t('dendriteHero.eyebrow', {}, { defaultValue: 'Today on the canvas' })}
          </span>
          <h2
            className={cm.cn(
              'text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter leading-[0.95]',
            )}
          >
            {greetingName
              ? t(
                  'dendriteHero.greeting',
                  { name: greetingName },
                  { defaultValue: 'Branch new ideas, {{name}}' },
                )
              : t('dendriteHero.greetingAnon', {}, { defaultValue: 'Branch new ideas' })}
          </h2>
          <p className={cm.cn(cm.textSize('lg'), 'text-on-primary/85')}>
            {t(
              'dendriteHero.subtitle',
              {},
              {
                defaultValue:
                  'Drag, connect, and let your thinking grow. Every spark is one node away from the next.',
              },
            )}
          </p>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <div className={cm.stack(1)}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-primary/70',
                )}
              >
                {t('dendriteHero.activeMaps', {}, { defaultValue: 'Active maps' })}
              </span>
              <span className={cm.cn('text-6xl font-extrabold tracking-tighter')}>{totalMaps}</span>
            </div>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                'bg-surface/20 backdrop-blur-md text-[10px] uppercase tracking-widest rounded-full',
              )}
            >
              <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                {positive ? 'trending_up' : 'trending_down'}
              </span>
              {t(
                'dendriteHero.weeklyChange',
                { sign, count: Math.abs(weeklyDelta) },
                { defaultValue: '{{sign}}{{count}} this week' },
              )}
            </span>
          </div>
          <div className={cm.flex({ gap: 'sm' })}>
            <Link
              to={callToActionHref}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                'rounded-xl bg-on-primary text-primary shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform',
              )}
            >
              {t('dendriteHero.openMaps', {}, { defaultValue: 'Open my maps' })}
            </Link>
            <Link
              to="/templates"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                'rounded-xl bg-surface/15 backdrop-blur-md text-on-primary border border-surface/30 hover:bg-surface/25 transition-colors',
              )}
            >
              {t('common.browseTemplates', {}, { defaultValue: 'Browse templates' })}
            </Link>
          </div>
        </div>
        <svg
          viewBox="0 0 320 220"
          className={cm.cn('relative w-full max-w-[360px] md:w-80')}
          aria-hidden
        >
          <g stroke="rgba(255,255,255,0.45)" strokeWidth="2" fill="none">
            <path d="M160 110 C 110 80, 80 60, 40 50" />
            <path d="M160 110 C 210 80, 240 60, 280 50" />
            <path d="M160 110 C 110 140, 80 160, 40 170" />
            <path d="M160 110 C 210 140, 240 160, 280 170" />
            <path d="M160 110 C 160 80, 165 60, 165 30" />
            <path d="M160 110 C 160 140, 155 160, 155 190" />
          </g>
          <g fill="rgba(255,255,255,0.92)">
            <circle cx="160" cy="110" r="22" />
            <circle cx="40" cy="50" r="11" />
            <circle cx="280" cy="50" r="11" />
            <circle cx="40" cy="170" r="11" />
            <circle cx="280" cy="170" r="11" />
            <circle cx="165" cy="30" r="9" />
            <circle cx="155" cy="190" r="9" />
          </g>
        </svg>
      </div>
    </section>
  )
}

export default DendriteHeroCard
