import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BiasIndicator } from './BiasIndicator.js'

export interface SourceCardSource {
  slug: string
  name: string
  /** Logo URL (16px favicon or square mark). */
  iconUrl?: string | null
  /** Optional short description / tagline. */
  description?: string
  /** Average factual rating, 0-100. */
  factualRating?: number
  /** -1 (far left) → 0 (center) → +1 (far right). */
  biasValue?: number
  /** Number of stories from this source (current period). */
  storyCount?: number
  /** Following indicator. */
  following?: boolean
  /** Optional brand color (used for the left accent strip). */
  accentColor?: string
}

interface SourceCardProps {
  source: SourceCardSource
  /** Optional callback to toggle follow state from list views. */
  onToggleFollow?: (slug: string) => void
}

/**
 * Source profile card — inset accent bar (`cm.accentCard`), favicon chip, headline +
 * description, factual-rating stat, BiasIndicator, follow toggle. Forms the
 * Sources index grid and the SourceDetail header.
 *
 * Translated from personal-finance's KPI / AccountCard pattern (inset accent bar
 * accent, group-hover icon scale) merged with the Vantage source-attribution
 * + bias-awareness DESIGN.md requirements.
 */
export function SourceCard({ source, onToggleFollow }: SourceCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accent = source.accentColor ?? 'var(--color-primary)'

  return (
    <article
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'md' }),
        cm.sp('p', 5),
        cm.accentCard({ tone: 'custom' }),
        'bg-surface rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border border-outline-variant/40 group',
      )}
      style={{ ['--mol-accent' as string]: accent }}
    >
      <header className={cm.flex({ align: 'center', gap: 'md' })}>
        <div
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-lg bg-surface-container-low text-primary group-hover:scale-105 transition-transform overflow-hidden',
          )}
        >
          {source.iconUrl ? (
            <img src={source.iconUrl} alt="" className={'w-full h-full object-contain'} />
          ) : (
            <span className="material-symbols-outlined" aria-hidden="true">
              rss_feed
            </span>
          )}
        </div>
        <div className={'flex-1 min-w-0'}>
          <Link
            to={`/sources/${source.slug}`}
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('bold'),
              'font-headline text-on-surface hover:text-primary line-clamp-1',
            )}
          >
            {source.name}
          </Link>
          {source.description && (
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant line-clamp-1')}>
              {source.description}
            </p>
          )}
        </div>
        {onToggleFollow && (
          <button
            type="button"
            onClick={() => onToggleFollow(source.slug)}
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 3),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'min-h-[36px] uppercase tracking-widest transition-colors',
              source.following
                ? 'bg-primary text-on-primary hover:bg-primary/90'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container',
            )}
            aria-pressed={source.following}
          >
            {source.following
              ? t('common.following', {}, { defaultValue: 'Following' })
              : t('common.follow', {}, { defaultValue: 'Follow' })}
          </button>
        )}
      </header>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }))}>
        {source.factualRating !== undefined && (
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant uppercase tracking-widest font-bold',
              )}
            >
              {t('sourceCard.factualLabel', {}, { defaultValue: 'Factual' })}
            </p>
            <p className={cm.cn(cm.textSize('lg'), 'font-extrabold tabular-nums text-on-surface')}>
              {source.factualRating}%
            </p>
          </div>
        )}
        {source.storyCount !== undefined && (
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant uppercase tracking-widest font-bold',
              )}
            >
              {t('sourceCard.storiesLabel', {}, { defaultValue: 'Stories' })}
            </p>
            <p className={cm.cn(cm.textSize('lg'), 'font-extrabold tabular-nums text-on-surface')}>
              {source.storyCount}
            </p>
          </div>
        )}
      </div>

      {source.biasValue !== undefined && (
        <BiasIndicator value={source.biasValue} variant="spectrum" />
      )}
    </article>
  )
}

export default SourceCard
