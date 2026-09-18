import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface VendryMarketHeroProps {
  /** Inline eyebrow above the title (defaults to translation key). */
  eyebrow?: string
  /** Hero headline. Falls back to translation default. */
  title?: string
  /** Hero supporting paragraph. */
  description?: string
  /** Primary CTA route + label. */
  primaryCtaTo?: string
  primaryCtaLabel?: string
  /** Secondary outline CTA. */
  secondaryCtaTo?: string
  secondaryCtaLabel?: string
  /** Stat tiles rendered in the frosted overlay card. */
  stats?: ReadonlyArray<{ label: string; value: string }>
}

/**
 * Editorial gradient hero — warm coral → violet vendor accent gradient,
 * 7xl extrabold headline, frosted-glass stats card overlay, decorative
 * blurred orbs.
 *
 * Translated from online-store's HeroBanner.tsx + property-listing's
 * PropertyImageGallery price-chip pattern; the stats overlay borrows the
 * frosted-pill treatment from banking-dashboard's BalanceHeroCard.
 */
export function VendryMarketHero({
  eyebrow,
  title,
  description,
  primaryCtaTo = '/catalog',
  primaryCtaLabel,
  secondaryCtaTo = '/vendor/apply',
  secondaryCtaLabel,
  stats,
}: VendryMarketHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const resolvedStats = stats ?? [
    {
      label: t('vendryMarketHero.stat1Label', {}, { defaultValue: 'Independent makers' }),
      value: '4,200+',
    },
    {
      label: t('vendryMarketHero.stat2Label', {}, { defaultValue: 'Curated products' }),
      value: '128k',
    },
    {
      label: t('vendryMarketHero.stat3Label', {}, { defaultValue: 'Average rating' }),
      value: '4.8★',
    },
  ]

  return (
    <section
      className={cm.cn(
        cm.sp('p', 10),
        'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary-container to-info text-on-primary',
      )}
    >
      <div className={cm.cn(cm.maxW('2xl'), 'relative z-10')}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 4),
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.roundedFull,
            'inline-flex items-center uppercase tracking-widest bg-surface/15 backdrop-blur-md',
          )}
        >
          {eyebrow ??
            t(
              'vendryMarketHero.eyebrow',
              {},
              { defaultValue: 'Curated marketplace · 2026 collection' },
            )}
        </span>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.sp('mb', 6),
            cm.sp('mt', 4),
            'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold',
          )}
        >
          {title ??
            t('vendryMarketHero.title', {}, { defaultValue: 'Every maker, one marketplace.' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('lg'),
            cm.sp('mb', 8),
            cm.maxW('xl'),
            'leading-relaxed opacity-85',
          )}
        >
          {description ??
            t(
              'vendryMarketHero.description',
              {},
              {
                defaultValue:
                  'Discover thousands of independent vendors, hand-curated collections, and storefronts run by the people who pour heart into them. Shop bold, support real makers.',
              },
            )}
        </p>
        <div className={cm.cn(cm.flex({ gap: 'md', wrap: 'wrap' }), cm.sp('mb', 10))}>
          <Link
            to={primaryCtaTo}
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('px', 8),
              cm.sp('py', 4),
              'inline-flex items-center gap-2 bg-surface text-orange-700 dark:text-primary rounded-full hover:-translate-y-0.5 transition-transform shadow-lg shadow-black/10',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden>
              storefront
            </span>
            {primaryCtaLabel ??
              t('vendryMarketHero.primaryCta', {}, { defaultValue: 'Shop the marketplace' })}
          </Link>
          <Link
            to={secondaryCtaTo}
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('px', 8),
              cm.sp('py', 4),
              'inline-flex items-center gap-2 rounded-full border border-surface/40 hover:bg-surface/10 transition-colors',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden>
              add_business
            </span>
            {secondaryCtaLabel ??
              t(
                'vendryMarketHero.secondaryCta',
                { appName: APP_NAME },
                { defaultValue: 'Sell on {{appName}}' },
              )}
          </Link>
        </div>
        <dl
          className={cm.cn(
            cm.grid({ cols: 3, gap: 'md' }),
            cm.sp('p', 4),
            cm.maxW('lg'),
            'rounded-2xl bg-surface/15 backdrop-blur-md border border-surface/20',
          )}
        >
          {resolvedStats.map((stat) => (
            <div key={stat.label} className={cm.cn(cm.sp('px', 3), cm.sp('py', 2))}>
              <dt
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest opacity-70',
                )}
              >
                {stat.label}
              </dt>
              <dd
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-2xl font-extrabold tracking-tight tabular-nums',
                )}
              >
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Decorative blurred orbs */}
      <div
        className={
          'absolute -right-24 -top-20 w-[26rem] h-[26rem] rounded-full bg-surface/15 blur-3xl'
        }
        aria-hidden
      />
      <div
        className={
          'absolute -left-32 bottom-[-10rem] w-[28rem] h-[28rem] rounded-full bg-info/40 blur-3xl'
        }
        aria-hidden
      />
      <div
        className={'absolute right-20 bottom-10 w-32 h-32 rounded-full bg-secondary/40 blur-2xl'}
        aria-hidden
      />
    </section>
  )
}

export default VendryMarketHero
