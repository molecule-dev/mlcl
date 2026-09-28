/**
 * Gradient hero card — large headline, frosted-glass community pill,
 * blurred decorative orbs, inline SVG mountain-stack motif (the "cairn").
 *
 * Translated from personal-finance's NetWorthCard.tsx — adapted for
 * Cairn's editorial tone (purple→indigo gradient, mark-the-path
 * iconography).
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface CairnHeroCardProps {
  /** Localised eyebrow above the headline. */
  eyebrowKey?: string
  eyebrowDefault?: string
  /** i18n key for the big headline (kept for API symmetry; defaultValue is the source of truth). */
  headlineKey?: string
  headlineDefault: string
  /** Optional supporting paragraph rendered below the headline. */
  bodyKey?: string
  bodyDefault?: string
  /** Optional pill text (e.g. trending topic, member count). */
  pillIcon?: string
  pillKey?: string
  pillDefault?: string
  /** Optional CTA button rendered in the bottom-right. */
  cta?: React.ReactNode
}

export function CairnHeroCard({
  eyebrowKey,
  eyebrowDefault,
  headlineDefault,
  bodyKey,
  bodyDefault,
  pillIcon = 'trending_up',
  pillKey,
  pillDefault,
  cta,
}: CairnHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[280px] bg-gradient-to-br from-primary via-primary to-[var(--color-primary-deep)] rounded-[2rem] text-white relative overflow-hidden',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        {eyebrowKey && (
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              cm.sp('mb', 2),
              'uppercase tracking-widest text-white/70',
            )}
          >
            {t('cairnHeroCard.eyebrow', {}, { defaultValue: eyebrowDefault ?? '' })}
          </p>
        )}
        <h1
          className={cm.cn('text-5xl md:text-6xl font-extrabold tracking-tighter leading-[0.95]')}
        >
          {t('cairnHeroCard.headline', {}, { defaultValue: headlineDefault })}
        </h1>
        {bodyKey && bodyDefault && (
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.sp('mt', 4),
              cm.maxW('xl'),
              'text-white/85 leading-relaxed',
            )}
          >
            {t('cairnHeroCard.body', {}, { defaultValue: bodyDefault })}
          </p>
        )}
        {pillKey && pillDefault && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mt', 6),
              'bg-surface/20 backdrop-blur-md uppercase tracking-widest w-fit',
            )}
          >
            <span className={'material-symbols-outlined text-base'}>{pillIcon}</span>
            {t('cairnHeroCard.pill', {}, { defaultValue: pillDefault })}
          </span>
        )}
      </div>
      {cta && <div className={cm.cn(cm.sp('mt', 8), 'relative z-10')}>{cta}</div>}
      {/* Decorative cairn (stacked stones) silhouette in the bottom-right */}
      <svg
        viewBox="0 0 200 160"
        className={'absolute right-6 bottom-6 w-40 h-32 opacity-25 pointer-events-none'}
        aria-hidden="true"
      >
        <ellipse cx="100" cy="135" rx="55" ry="14" fill="white" opacity="0.4" />
        <ellipse cx="100" cy="105" rx="42" ry="22" fill="white" opacity="0.55" />
        <ellipse cx="100" cy="72" rx="30" ry="18" fill="white" opacity="0.7" />
        <ellipse cx="100" cy="44" rx="20" ry="14" fill="white" opacity="0.85" />
        <ellipse cx="100" cy="22" rx="11" ry="9" fill="white" />
      </svg>
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
          'absolute right-10 top-10 bg-secondary/30 blur-xl',
        )}
      />
    </section>
  )
}

export default CairnHeroCard
