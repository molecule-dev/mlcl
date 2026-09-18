import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Playlist {
  id: string
  title: string
  description: string
  cover_index: number
  track_count: number
  duration_minutes?: number
  category?: string
  created_by?: string
}

interface PlaylistGridProps {
  playlists: Playlist[]
  /** Limit number of cards rendered. */
  limit?: number
  /** Optional pinned trending highlight on the first card. */
  trendingId?: string
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
  'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #1e1b4b 0%, #c026d3 100%)',
]

const CATEGORY_DEFAULT_LABEL: Record<string, string> = {
  made_for_you: 'Made for you',
  recently_played: 'Recently played',
  featured: 'Featured',
  mood: 'Mood',
}

/**
 * Cover-art grid with editorial cards — gradient cover with the
 * `library_music` glyph, title in tight tracking, byline, track count
 * meta strip, and a hover play overlay disk.
 *
 * Translated from podcast's ShowGrid.tsx, swapping the `graphic_eq`
 * cover glyph for `library_music` and using playlist-specific
 * metadata (creator, track count).
 */
export function PlaylistGrid({ playlists, limit, trendingId }: PlaylistGridProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visible = typeof limit === 'number' ? playlists.slice(0, limit) : playlists

  if (visible.length === 0) {
    return (
      <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant text-sm')}>
        {t('playlistGrid.empty', {}, { defaultValue: 'No playlists in this section yet.' })}
      </p>
    )
  }

  return (
    <div
      className={cm.cn(
        cm.grid({ gap: 'lg' }),
        'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
      )}
    >
      {visible.map((p) => {
        const gradient = COVER_GRADIENTS[p.cover_index % COVER_GRADIENTS.length]
        const isTrending = trendingId === p.id
        return (
          <Link key={p.id} to={`/playlists/${p.id}`} className="group block">
            <div className="relative">
              <div
                className={cm.cn(
                  'aspect-square rounded-2xl shadow-md group-hover:shadow-2xl group-hover:shadow-on-surface/15 transition-all overflow-hidden flex items-center justify-center relative',
                )}
                style={{ background: gradient }}
                aria-hidden="true"
              >
                <span
                  className={cm.cn(
                    'material-symbols-outlined text-[64px] text-white/40 group-hover:scale-110 transition-transform',
                  )}
                >
                  library_music
                </span>
                {isTrending && (
                  <span
                    className={cm.cn(
                      'absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-foreground/40 backdrop-blur-md text-white',
                    )}
                  >
                    {t('playlistGrid.trendingBadge', {}, { defaultValue: 'Trending' })}
                  </span>
                )}
                {p.category && CATEGORY_DEFAULT_LABEL[p.category] && (
                  <span
                    className={cm.cn(
                      'absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-surface/85 text-on-surface shadow',
                    )}
                  >
                    {t(
                      `playlistGrid.category.${p.category}`,
                      {},
                      { defaultValue: CATEGORY_DEFAULT_LABEL[p.category] },
                    )}
                  </span>
                )}
                <div
                  className={cm.cn(
                    'absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end pb-3 pr-3',
                  )}
                >
                  <div
                    className={cm.cn(
                      'w-12 h-12 rounded-full bg-surface shadow-lg flex items-center justify-center',
                    )}
                  >
                    <span className="material-symbols-outlined text-[28px] text-on-surface">
                      play_arrow
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className={cm.cn('mt-3')}>
              {p.created_by && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {p.created_by}
                </p>
              )}
              <h3
                className={cm.cn(
                  'text-sm font-extrabold tracking-tight text-on-surface line-clamp-1 mt-0.5 group-hover:text-primary transition-colors',
                )}
              >
                {p.title}
              </h3>
              {p.description && (
                <p
                  className={cm.cn(
                    'text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed',
                  )}
                >
                  {p.description}
                </p>
              )}
              <div
                className={cm.cn(
                  'flex items-center gap-2 mt-1.5 text-[11px] text-on-surface-variant',
                )}
              >
                <span className="tabular-nums">
                  {t(
                    'playlistGrid.tracksCount',
                    { count: p.track_count },
                    { defaultValue: '{{count}} tracks' },
                  )}
                </span>
                {typeof p.duration_minutes === 'number' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {t(
                        'playlistGrid.minutesCount',
                        { mins: p.duration_minutes },
                        { defaultValue: '{{mins}} min' },
                      )}
                    </span>
                  </>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
