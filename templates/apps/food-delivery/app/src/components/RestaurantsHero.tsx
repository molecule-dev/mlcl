import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface RestaurantsHeroProps {
  totalRestaurants: number
  averageDeliveryMins: string
  promoCount: number
  /** Optional active address to display in the chip. */
  deliverToLabel?: string
}

/**
 * Appetizing photo-rich hero for Chariot's restaurants page — warm
 * crimson-amber gradient, large headline, frosted-glass stat tiles, and a
 * decorative ring of "menu plates" floating in the corner.
 *
 * Translated from online-store's StorefrontTrendingSection / banking's
 * BalanceHero pattern, recoloured to Chariot's primary-amber palette.
 */
export function RestaurantsHero({
  totalRestaurants,
  averageDeliveryMins,
  promoCount,
  deliverToLabel,
}: RestaurantsHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      className={'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-primary/20'}
      style={{
        background:
          'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 50%, var(--color-star) 100%)',
        minHeight: '320px',
      }}
    >
      {/* Decorative orbs / plates */}
      <div
        className={'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl'}
        aria-hidden="true"
      />
      <div
        className={'absolute right-12 top-12 w-20 h-20 rounded-full bg-surface/20 blur-2xl'}
        aria-hidden="true"
      />
      <div
        className={'absolute right-32 bottom-12 w-32 h-32 rounded-full bg-amber-400/40 blur-2xl'}
        aria-hidden="true"
      />

      {/* Floating plate ornaments */}
      <div
        className={
          'hidden md:block absolute right-12 top-16 w-32 h-32 rounded-full border-4 border-surface/20'
        }
        aria-hidden="true"
      />
      <div
        className={
          'hidden md:block absolute right-20 top-32 w-20 h-20 rounded-full border-2 border-surface/30'
        }
        aria-hidden="true"
      />

      <div className={'relative z-10 p-8 lg:p-10 flex flex-col justify-between min-h-[320px]'}>
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          {deliverToLabel && (
            <span
              className={
                'inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-surface/20 backdrop-blur-md'
              }
            >
              <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                location_on
              </span>
              {t(
                'restaurantsHero.deliverTo',
                { addr: deliverToLabel },
                { defaultValue: 'Delivering to {{addr}}' },
              )}
            </span>
          )}
          <span
            className={
              'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface/20 backdrop-blur-md'
            }
          >
            {t('restaurantsHero.openNowLabel', {}, { defaultValue: 'Open now' })}
          </span>
        </div>

        <div className={'mt-6'}>
          <p className={'text-[11px] font-bold uppercase tracking-widest text-white/80 mb-2'}>
            {t(
              'restaurantsHero.eyebrow',
              {},
              { defaultValue: 'Local restaurants · live delivery' },
            )}
          </p>
          <h2 className={'text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]'}>
            {t(
              'restaurantsHero.headline',
              { count: totalRestaurants },
              { defaultValue: '{{count}} kitchens, hot at your door' },
            )}
          </h2>
          <p className={'text-sm md:text-base text-white/85 mt-3 max-w-lg'}>
            {t(
              'restaurantsHero.subline',
              { mins: averageDeliveryMins },
              { defaultValue: 'Average delivery {{mins}} min · most orders arrive earlier' },
            )}
          </p>
        </div>

        <div className={cm.cn(cm.grid({ cols: 3, gap: 'md' }), 'mt-8 max-w-xl')}>
          <div className={'bg-surface/10 backdrop-blur-md rounded-xl p-3'}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
              {t('restaurantsHero.openNow', {}, { defaultValue: 'Open now' })}
            </p>
            <p className={'text-2xl font-extrabold tabular-nums mt-1'}>{totalRestaurants}</p>
          </div>
          <div className={'bg-surface/10 backdrop-blur-md rounded-xl p-3'}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
              {t('restaurantsHero.avgEta', {}, { defaultValue: 'Avg ETA' })}
            </p>
            <p className={'text-2xl font-extrabold tabular-nums mt-1'}>{averageDeliveryMins}m</p>
          </div>
          <div className={'bg-surface/10 backdrop-blur-md rounded-xl p-3'}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
              {t('restaurantsHero.promos', {}, { defaultValue: 'Deals on' })}
            </p>
            <p className={'text-2xl font-extrabold tabular-nums mt-1'}>{promoCount}</p>
          </div>
        </div>

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), 'mt-6')}>
          <Link
            to="/search"
            className={
              'inline-flex items-center gap-2 px-7 py-3 font-semibold text-sm bg-surface text-on-surface rounded-full hover:bg-surface/90 transition-colors shadow-lg shadow-black/10'
            }
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              search
            </span>
            {t('restaurantsHero.searchCta', {}, { defaultValue: 'Search dishes & cuisines' })}
          </Link>
          <Link
            to="/favorites"
            className={
              'inline-flex items-center gap-2 px-7 py-3 font-semibold text-sm rounded-full border border-surface/30 hover:bg-surface/10 transition-colors'
            }
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              favorite
            </span>
            {t('restaurantsHero.favoritesCta', {}, { defaultValue: 'Reorder favorites' })}
          </Link>
        </div>
      </div>
    </section>
  )
}
