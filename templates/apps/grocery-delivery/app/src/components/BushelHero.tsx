import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CtaConfig {
  to: string
  key: string
  defaultLabel: string
  icon: string
}

interface BushelHeroProps {
  itemsInStock: number
  /** Average delivery window in minutes (rendered as `{{n}}m`). */
  averageDeliveryMins: string
  freshDealsCount: number
  /** Optional active "Delivering to" address rendered as a frosted pill. */
  deliverToLabel?: string
  headlineKey: string
  headlineDefault: string
  subtitleKey: string
  subtitleDefault: string
  primaryCta: CtaConfig
  secondaryCta?: CtaConfig
}

/**
 * Gradient hero card — Bushel's signature green→lime treatment.
 * Decorative blurred orbs, frosted-glass stat tiles (items / avg ETA /
 * deals), large headline, and 1-2 CTA pills.
 *
 * Translated from food-delivery/RestaurantsHero.tsx, recoloured to
 * Bushel's primary-green palette and adapted to grocery stat semantics.
 */
export function BushelHero({
  itemsInStock,
  averageDeliveryMins,
  freshDealsCount,
  deliverToLabel,
  headlineKey,
  headlineDefault,
  subtitleKey,
  subtitleDefault,
  primaryCta,
  secondaryCta,
}: BushelHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      className={'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-primary/20'}
      style={{
        background:
          'linear-gradient(135deg, var(--color-gradient-start) 0%, var(--color-gradient-mid) 50%, var(--color-gradient-end) 100%)',
        minHeight: '320px',
      }}
    >
      <div
        className={
          'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl pointer-events-none'
        }
        aria-hidden="true"
      />
      <div
        className={
          'absolute right-12 top-12 w-20 h-20 rounded-full bg-surface/20 blur-2xl pointer-events-none'
        }
        aria-hidden="true"
      />
      <div
        className={
          'absolute right-32 bottom-12 w-32 h-32 rounded-full bg-lime-300/40 blur-2xl pointer-events-none'
        }
        aria-hidden="true"
      />

      <div
        className={
          'hidden md:block absolute right-12 top-16 w-32 h-32 rounded-full border-4 border-surface/20 pointer-events-none'
        }
        aria-hidden="true"
      />
      <div
        className={
          'hidden md:block absolute right-20 top-32 w-20 h-20 rounded-full border-2 border-surface/30 pointer-events-none'
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
                'bushelHero.deliverTo',
                { addr: deliverToLabel },
                { defaultValue: 'Delivering to {{addr}}' },
              )}
            </span>
          )}
          <span
            className={
              'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface/20 backdrop-blur-md'
            }
          >
            {t('bushelHero.openLabel', {}, { defaultValue: 'Open now' })}
          </span>
        </div>

        <div className={'mt-6'}>
          <p className={'text-[11px] font-black uppercase tracking-widest text-white/85 mb-2'}>
            {t('bushelHero.eyebrow', {}, { defaultValue: 'Fresh aisles · live delivery' })}
          </p>
          <h2
            className={'text-4xl md:text-5xl font-black tracking-tight leading-[1.05]'}
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            {t(headlineKey, { count: itemsInStock }, { defaultValue: headlineDefault })}
          </h2>
          <p className={'text-sm md:text-base text-white/85 mt-3 max-w-lg'}>
            {t(subtitleKey, { count: itemsInStock }, { defaultValue: subtitleDefault })}
          </p>
        </div>

        <div className={cm.cn(cm.grid({ cols: 3, gap: 'md' }), 'mt-8 max-w-xl')}>
          <div className={'bg-surface/10 backdrop-blur-md rounded-xl p-3'}>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
              {t('bushelHero.itemsLabel', {}, { defaultValue: 'In stock' })}
            </p>
            <p
              className={'text-2xl font-black tabular-nums mt-1'}
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {itemsInStock.toLocaleString()}
            </p>
          </div>
          <div className={'bg-surface/10 backdrop-blur-md rounded-xl p-3'}>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
              {t('bushelHero.etaLabel', {}, { defaultValue: 'Avg ETA' })}
            </p>
            <p
              className={'text-2xl font-black tabular-nums mt-1'}
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {averageDeliveryMins}m
            </p>
          </div>
          <div className={'bg-surface/10 backdrop-blur-md rounded-xl p-3'}>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
              {t('bushelHero.dealsLabel', {}, { defaultValue: 'Fresh deals' })}
            </p>
            <p
              className={'text-2xl font-black tabular-nums mt-1'}
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {freshDealsCount}
            </p>
          </div>
        </div>

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), 'mt-6')}>
          <Link
            to={primaryCta.to}
            className={
              'inline-flex items-center gap-2 px-7 py-3 font-bold text-sm bg-surface text-on-surface rounded-full hover:bg-surface/90 transition-colors shadow-lg shadow-black/10'
            }
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              {primaryCta.icon}
            </span>
            {t(primaryCta.key, {}, { defaultValue: primaryCta.defaultLabel })}
          </Link>
          {secondaryCta && (
            <Link
              to={secondaryCta.to}
              className={
                'inline-flex items-center gap-2 px-7 py-3 font-bold text-sm rounded-full border border-surface/30 hover:bg-surface/10 transition-colors'
              }
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                {secondaryCta.icon}
              </span>
              {t(secondaryCta.key, {}, { defaultValue: secondaryCta.defaultLabel })}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
