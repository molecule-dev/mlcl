import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Gradient hero card — the next subscription box headline. Massive
 * countdown number in 6xl-extrabold, frosted-glass status pill, decorative
 * blurred orbs, inline SVG ribbon arc.
 *
 * Translated from personal-finance/NetWorthCard.tsx (§1.1 Dashboard
 * Gradient Hero) — same gradient + frosted pill + blurred orb recipe,
 * brand-shifted to Crate's citrus orange palette and re-purposed for
 * countdown-to-next-shipment narrative.
 */
export interface NextBoxHeroCardProps {
  boxTitle: string
  boxTagline: string
  shipsInDays: number
  shipDate: string
  status: 'active' | 'paused' | 'processing'
  itemCount: number
}

export function NextBoxHeroCard({
  boxTitle,
  boxTagline,
  shipsInDays,
  shipDate,
  status,
  itemCount,
}: NextBoxHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const statusKey =
    status === 'active'
      ? 'nextBoxHeroCard.statusActive'
      : status === 'paused'
        ? 'nextBoxHeroCard.statusPaused'
        : 'nextBoxHeroCard.statusProcessing'
  const statusFallback =
    status === 'active' ? 'On the way' : status === 'paused' ? 'Paused' : 'Curating'
  const statusIcon =
    status === 'active' ? 'local_shipping' : status === 'paused' ? 'pause_circle' : 'inventory_2'

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] lg:col-span-8 bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-on-primary relative overflow-hidden',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary-fixed/80',
          )}
        >
          {t(
            'nextBoxHeroCard.eyebrow',
            { appName: APP_NAME },
            { defaultValue: 'Your next {{appName}}' },
          )}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }))}>
          <span className={cm.cn('text-6xl font-extrabold tracking-tighter')}>{shipsInDays}</span>
          <span className={cm.cn('text-2xl font-bold opacity-90')}>
            {t(
              'nextBoxHeroCard.daysLabel',
              { count: shipsInDays },
              { defaultValue: shipsInDays === 1 ? 'day until ship' : 'days until ship' },
            )}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface/20 backdrop-blur-md uppercase tracking-wider',
            )}
          >
            <span className={cm.cn('text-sm material-symbols-outlined')}>{statusIcon}</span>
            {t(statusKey, {}, { defaultValue: statusFallback })}
          </span>
        </div>
        <div className={cm.cn(cm.sp('mt', 6), cm.flex({ direction: 'col', gap: 'xs' }))}>
          <p className={cm.cn('text-2xl font-bold tracking-tight')}>{boxTitle}</p>
          <p className={cm.cn('text-sm font-medium text-on-primary/80 max-w-md')}>{boxTagline}</p>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.sp('mt', 8),
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          'relative z-10',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
          <div className={cm.cn(cm.flex({ direction: 'col' }))}>
            <span
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-widest text-on-primary/70',
              )}
            >
              {t('nextBoxHeroCard.shipsOnLabel', {}, { defaultValue: 'Ships on' })}
            </span>
            <span className={cm.cn('text-base font-bold')}>{shipDate}</span>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col' }))}>
            <span
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-widest text-on-primary/70',
              )}
            >
              {t('nextBoxHeroCard.itemsLabel', {}, { defaultValue: 'Curated items' })}
            </span>
            <span className={cm.cn('text-base font-bold')}>
              {t(
                'nextBoxHeroCard.itemCount',
                { count: itemCount },
                { defaultValue: '{{count}} pieces inside' },
              )}
            </span>
          </div>
        </div>
        <div className={cm.cn('h-16 w-40 opacity-30')}>
          <svg className={cm.cn('w-full h-full')} viewBox="0 0 200 60" preserveAspectRatio="none">
            <path d="M0,50 Q40,10 80,30 T160,15 T200,25 L200,60 L0,60 Z" fill="white" />
            <path
              d="M0,50 Q40,10 80,30 T160,15 T200,25"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      {/* Decorative orbs */}
      <div
        className={cm.cn(
          'w-80 h-80 rounded-full absolute -right-20 -bottom-20 bg-surface/10 blur-3xl',
        )}
      />
      <div
        className={cm.cn(
          'w-20 h-20 rounded-full absolute right-10 top-10 bg-primary-fixed/30 blur-xl',
        )}
      />
      <div
        className={cm.cn('w-24 h-24 rounded-full absolute -left-8 top-1/3 bg-surface/10 blur-2xl')}
      />
    </div>
  )
}

export default NextBoxHeroCard
