import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type SampleStory, STORY_RING_GRADIENT, vividGradient } from '../lib/sample-feed.js'

interface StoryRailProps {
  stories: SampleStory[]
  /** Optional: handle "Your story" + segments selection from the Feed page. */
  onSelect?: (storyId: string) => void
  /** Optional: id of the currently-active group (highlights the bubble). */
  activeId?: string
}

/**
 * Horizontal-scroll story tray — each bubble gets a 64px gradient avatar,
 * conic-gradient unread ring (amber → pink → violet) per DESIGN.md, a
 * "Your story" composer slot pinned to the front, and a soft fade on
 * either side so overflow doesn't clip awkwardly.
 *
 * Translated from photo-sharing's PhotoMasonry hover-overlay treatment
 * — kept the gradient-tile aesthetic but reshaped into the canonical
 * Instagram/Vivid story-tray layout that DESIGN.md spec'd.
 */
export function StoryRail({ stories, onSelect, activeId }: StoryRailProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      className={cm.cn(
        cm.sp('p', 4),
        'bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-sm',
      )}
      aria-label={t('storyRail.label', {}, { defaultValue: 'Stories' })}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 3))}>
        <h2
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('storyRail.heading', {}, { defaultValue: 'Stories' })}
        </h2>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'text-on-surface-variant tabular-nums',
          )}
        >
          {t(
            'common.countNew',
            { count: stories.filter((s) => s.unread).length },
            {
              defaultValue: '{{count}} new',
            },
          )}
        </span>
      </div>
      <ul
        className={cm.cn(
          'flex gap-4 overflow-x-auto pb-1 -mx-1 px-1 [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:hidden',
        )}
      >
        <li className={cm.cn('shrink-0 w-[80px] [scroll-snap-align:start]')}>
          <button
            type="button"
            onClick={() => onSelect?.('me')}
            className={cm.cn('group flex flex-col items-center gap-2 w-full')}
            aria-label={t('storyRail.addAria', {}, { defaultValue: 'Add to your story' })}
          >
            <span
              className={cm.cn(
                'relative inline-flex w-[64px] h-[64px] items-center justify-center rounded-full border-2 border-dashed border-outline-variant bg-surface-container-low text-on-surface-variant group-hover:text-primary group-hover:border-primary transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[28px]')}>add</span>
            </span>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-on-surface line-clamp-1 max-w-full',
              )}
            >
              {t('storyRail.you', {}, { defaultValue: 'Your story' })}
            </span>
          </button>
        </li>

        {stories.map((story) => {
          const ring = story.unread ? STORY_RING_GRADIENT : 'var(--color-border)'
          const cover = vividGradient(story.cover_index)
          const isActive = activeId === story.id
          return (
            <li key={story.id} className={cm.cn('shrink-0 w-[80px] [scroll-snap-align:start]')}>
              <button
                type="button"
                onClick={() => onSelect?.(story.id)}
                className={cm.cn('group flex flex-col items-center gap-2 w-full')}
                aria-label={t(
                  'storyRail.openAria',
                  { handle: story.author.handle },
                  {
                    defaultValue: "Open {{handle}}'s story",
                  },
                )}
              >
                <span
                  className={cm.cn(
                    'relative inline-flex w-[70px] h-[70px] items-center justify-center rounded-full p-[3px] transition-transform group-hover:scale-105',
                  )}
                  style={{
                    background: ring,
                    boxShadow: isActive
                      ? `0 0 0 2px var(--color-surface), 0 0 0 4px ${ACCENT_RING}`
                      : undefined,
                  }}
                >
                  <span className={cm.cn('block w-full h-full rounded-full bg-surface p-[2px]')}>
                    <span
                      className={cm.cn(
                        'flex w-full h-full items-center justify-center rounded-full text-white',
                      )}
                      style={{ background: cover }}
                    >
                      <span className={cm.cn('text-[20px] font-extrabold drop-shadow')}>
                        {story.author.display_name.charAt(0)}
                      </span>
                    </span>
                  </span>
                  {story.author.is_verified && (
                    <span
                      className={cm.cn(
                        'material-symbols-outlined absolute -bottom-1 -right-1 text-[18px] text-on-secondary rounded-full bg-secondary p-0.5',
                      )}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                      aria-hidden="true"
                    >
                      verified
                    </span>
                  )}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'text-on-surface line-clamp-1 max-w-full',
                  )}
                >
                  @{story.author.handle}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const ACCENT_RING = 'var(--color-secondary)'
