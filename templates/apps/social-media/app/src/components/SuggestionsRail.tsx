import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  fmtCount,
  type SampleHashtag,
  type SampleSuggestion,
  vividGradient,
} from '../lib/sample-feed.js'

interface SuggestionsRailProps {
  suggestions: SampleSuggestion[]
  hashtags: SampleHashtag[]
  /** Optional: extra className applied to the outer aside (e.g. sticky offsets). */
  className?: string
  /** Optional follow handler — called with the suggested author's id. */
  onFollow?: (userId: string) => void
  /** Set of author ids already followed by the viewer (renders as "Following"). */
  followingIds?: ReadonlySet<string>
}

/**
 * Right-rail companion column — Suggestions for you (avatar, handle,
 * mutual count, Follow chip) + Trending hashtags (uppercase eyebrow,
 * 5xl post count, delta percentage). Used by Feed + Explore.
 *
 * Translated from photo-sharing's GalleryFeatureRow.tsx — kept the
 * editorial typography and inset accent bar treatment but
 * collapsed into a single sticky column suited to the 320px sidebar
 * width DESIGN.md spec'd.
 */
export function SuggestionsRail({
  suggestions,
  hashtags,
  className,
  onFollow,
  followingIds,
}: SuggestionsRailProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <aside className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), className)}>
      <section
        className={cm.cn(
          'bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-sm overflow-hidden',
        )}
      >
        <header
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('pt', 5),
            cm.sp('pb', 3),
            cm.flex({ align: 'center', justify: 'between' }),
          )}
        >
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('suggestionsRail.eyebrow', {}, { defaultValue: 'For you' })}
            </p>
            <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight mt-0.5')}>
              {t('suggestionsRail.heading', {}, { defaultValue: 'Creators to follow' })}
            </h2>
          </div>
          <Link
            to="/explore"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('suggestionsRail.seeAll', {}, { defaultValue: 'See all' })}
          </Link>
        </header>
        <ul className={cm.cn('divide-y divide-outline-variant/40')}>
          {suggestions.map((s) => (
            <li
              key={s.author.id}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              )}
            >
              <Link
                to={`/profile/${s.author.handle}`}
                className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0 group')}
              >
                <span
                  className={cm.cn(
                    'inline-flex shrink-0 w-10 h-10 rounded-full items-center justify-center text-white font-extrabold text-base shadow-sm',
                  )}
                  style={{ background: vividGradient(s.author.cover_index) }}
                  aria-hidden="true"
                >
                  {s.author.display_name.charAt(0)}
                </span>
                <span className={cm.cn('min-w-0')}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-on-surface group-hover:text-primary transition-colors',
                    )}
                  >
                    <span className={cm.cn('truncate')}>@{s.author.handle}</span>
                    {s.author.is_verified && (
                      <span
                        className={cm.cn('material-symbols-outlined text-[14px] text-blue-500')}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                        aria-hidden="true"
                      >
                        verified
                      </span>
                    )}
                  </span>
                  <span
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate block')}
                  >
                    {s.reason}
                  </span>
                </span>
              </Link>
              {(() => {
                const isFollowing = followingIds?.has(s.author.id) ?? false
                return (
                  <button
                    type="button"
                    onClick={() => onFollow?.(s.author.id)}
                    disabled={!onFollow || isFollowing}
                    data-testid={`suggestion-follow-${s.author.handle}`}
                    className={cm.cn(
                      cm.sp('px', 3),
                      'h-8 rounded-full text-xs font-bold uppercase tracking-widest transition-colors shrink-0',
                      isFollowing
                        ? 'bg-surface-container border border-outline-variant text-on-surface-variant'
                        : 'bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50',
                    )}
                  >
                    {isFollowing
                      ? t('common.following', {}, { defaultValue: 'Following' })
                      : t('common.follow', {}, { defaultValue: 'Follow' })}
                  </button>
                )
              })()}
            </li>
          ))}
        </ul>
      </section>

      <section
        className={cm.cn(
          'bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-sm overflow-hidden',
        )}
      >
        <header className={cm.cn(cm.sp('px', 5), cm.sp('pt', 5), cm.sp('pb', 3))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('suggestionsRail.trendingEyebrow', {}, { defaultValue: 'Trending' })}
          </p>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight mt-0.5')}>
            {t('suggestionsRail.trendingHeading', {}, { defaultValue: 'Hashtags surging now' })}
          </h2>
        </header>
        <ul className={cm.cn('divide-y divide-outline-variant/40')}>
          {hashtags.map((h) => (
            <li
              key={h.tag}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              )}
            >
              <Link to={`/search?q=%23${h.tag}`} className={cm.cn('min-w-0 group')}>
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('extrabold'),
                    'text-on-surface group-hover:text-primary transition-colors block truncate',
                  )}
                >
                  #{h.tag}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
                  {t(
                    'suggestionsRail.postCount',
                    { count: fmtCount(h.post_count) },
                    {
                      defaultValue: '{{count}} posts',
                    },
                  )}
                </span>
              </Link>
              <span
                className={cm.cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary tabular-nums',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[12px]')} aria-hidden="true">
                  trending_up
                </span>
                +{h.delta_pct}%
              </span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
