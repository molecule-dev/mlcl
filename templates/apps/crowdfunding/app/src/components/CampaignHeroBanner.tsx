import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CampaignHeroBannerProps {
  eyebrow?: string
  heading: string
  subheading?: string
  primaryCta?: { to: string; label: string }
  secondaryCta?: { to: string; label: string }
  /** When true, renders shorter hero (320px) for inner pages. */
  size?: 'landing' | 'inner'
}

/**
 * Dark navy → cyan gradient hero — DESIGN.md "Campaign Hero" treatment
 * with extrabold display heading, decorative blurred orbs, and dual
 * CTAs. Used on Landing and (compact variant) on CampaignDetail header.
 */
export function CampaignHeroBanner({
  eyebrow,
  heading,
  subheading,
  primaryCta,
  secondaryCta,
  size = 'landing',
}: CampaignHeroBannerProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const heightClass = size === 'landing' ? 'min-h-[480px]' : 'min-h-[280px]'

  return (
    <header
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('px', 6),
        'relative w-full overflow-hidden text-center text-white',
        heightClass,
      )}
      style={{
        background:
          'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary-light) 100%)',
      }}
    >
      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-20 -bottom-20 bg-primary/30 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          cm.w(64),
          cm.h(64),
          cm.roundedFull,
          'absolute -left-16 top-1/4 bg-accent/20 blur-3xl',
        )}
        aria-hidden="true"
      />

      <div className={cm.cn(cm.mxAuto, 'relative z-10 max-w-3xl')}>
        {eyebrow && (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 4),
              'uppercase tracking-widest text-white/70',
            )}
          >
            {eyebrow}
          </p>
        )}
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.sp('mb', 4),
            'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[0.95]',
          )}
        >
          {heading}
        </h1>
        {subheading && (
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('medium'),
              cm.sp('mt', 6),
              cm.maxW('2xl'),
              cm.mxAuto,
              'text-white/80',
            )}
          >
            {subheading}
          </p>
        )}
        {(primaryCta || secondaryCta) && (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
              cm.sp('mt', 10),
              'flex-col sm:flex-row',
            )}
          >
            {primaryCta && (
              <Link
                to={primaryCta.to}
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'rounded-lg bg-primary text-white shadow-lg hover:shadow-xl active:scale-95 transition-all',
                )}
                data-mol-id="hero-cta-primary"
              >
                {primaryCta.label}
              </Link>
            )}
            {secondaryCta && (
              <Link
                to={secondaryCta.to}
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'rounded-lg bg-surface/10 text-white border border-surface/20 backdrop-blur hover:bg-surface/20 active:scale-95 transition-all',
                )}
                data-mol-id="hero-cta-secondary"
              >
                {secondaryCta.label}
              </Link>
            )}
          </div>
        )}
        {!primaryCta && !secondaryCta && (
          <p className={cm.cn(cm.sp('mt', 6), cm.textSize('xs'), 'sr-only')}>
            {t('campaignHero.placeholder', {}, { defaultValue: 'Crowdfunding hero' })}
          </p>
        )}
      </div>
    </header>
  )
}

export default CampaignHeroBanner
