import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface StoryHeroCardProps {
  id: string
  headline: string
  excerpt?: string
  topic?: string
  topicSlug?: string
  sourceCount?: number
  publishedAt?: string
  imageUrl?: string | null
  /** Show a "Breaking" or "Trending" eyebrow above the headline. */
  eyebrow?: string
  eyebrowTone?: 'breaking' | 'trending' | 'default'
}

function fmtAgo(iso?: string): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.round(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  return `${day}d ago`
}

/**
 * Editorial gradient hero card — full-bleed image with dark gradient overlay,
 * frosted topic pill, oversized serif headline, source-count chip in
 * frosted glass, decorative blurred orbs.
 *
 * Translated from personal-finance's NetWorthCard.tsx (gradient + orbs +
 * frosted-glass pill) merged with blog's HeroSection editorial typography.
 */
export function StoryHeroCard({
  id,
  headline,
  excerpt,
  topic,
  topicSlug,
  sourceCount,
  publishedAt,
  imageUrl,
  eyebrow,
  eyebrowTone = 'default',
}: StoryHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const eyebrowBg =
    eyebrowTone === 'breaking'
      ? 'bg-error text-white'
      : eyebrowTone === 'trending'
        ? 'bg-secondary-dark text-white'
        : 'bg-surface/20 backdrop-blur-md text-white'

  return (
    <Link
      to={`/stories/${id}`}
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[360px] bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden group hover:shadow-2xl hover:shadow-primary/30 transition-all',
      )}
    >
      {/* Cover image (if provided) sits behind the gradient at low opacity */}
      {imageUrl && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      )}

      <div className="relative z-10">
        {(eyebrow || topic) && (
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
            {eyebrow && (
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.roundedFull,
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest',
                  eyebrowBg,
                )}
              >
                {eyebrow}
              </span>
            )}
            {topic && (
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.roundedFull,
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest bg-surface/20 backdrop-blur-md',
                )}
              >
                {topic}
              </span>
            )}
          </div>
        )}
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.sp('mb', 4),
            'font-headline text-3xl md:text-4xl lg:text-5xl tracking-tight leading-[1.05]',
          )}
        >
          {headline}
        </h2>
        {excerpt && (
          <p
            className={cm.cn(
              cm.textSize('lg'),
              'text-white/85 max-w-2xl leading-relaxed line-clamp-3',
            )}
          >
            {excerpt}
          </p>
        )}
      </div>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
          cm.sp('mt', 8),
          'relative z-10',
        )}
      >
        {sourceCount !== undefined && sourceCount > 0 && (
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
            <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
              groups
            </span>
            {t(
              'storyHeroCard.sourceCount',
              { count: sourceCount },
              { defaultValue: '{{count}} sources covering this story' },
            )}
          </span>
        )}
        {publishedAt && (
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'text-white/70 font-medium uppercase tracking-widest',
            )}
          >
            {fmtAgo(publishedAt)}
          </span>
        )}
        {topicSlug && (
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'text-white/80 font-bold ml-auto group-hover:translate-x-1 transition-transform inline-flex items-center gap-1',
            )}
          >
            {t('storyHeroCard.readStory', {}, { defaultValue: 'Read the spectrum' })}
            <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
              arrow_forward
            </span>
          </span>
        )}
      </div>

      {/* Decorative blurred orbs (translated from NetWorthCard) */}
      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-24 -bottom-24 bg-surface/10 blur-3xl pointer-events-none',
        )}
      />
      <div
        className={cm.cn(
          cm.w(20),
          cm.h(20),
          cm.roundedFull,
          'absolute right-10 top-10 bg-secondary/30 blur-xl pointer-events-none',
        )}
      />
    </Link>
  )
}

export default StoryHeroCard
