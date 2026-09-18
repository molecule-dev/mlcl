import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Album {
  id: string
  title: string
  artist: string
  artist_id: string
  year: number
  cover_index: number
  track_count: number
  duration_minutes?: number
  description?: string
  label?: string
}

interface FeaturedAlbumsRowProps {
  albums: Album[]
  /** Section heading. */
  title: string
  /** Optional href for the "See all" anchor. */
  seeAllHref?: string
  /** Limit cards rendered. Defaults to 4. */
  limit?: number
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

/**
 * Wide editorial row with horizontal cover-art tiles + 2-line album
 * description, used for "Featured albums" / "New releases" sections on
 * Home and Library. Translated from podcast's FeaturedShowsRow.tsx.
 */
export function FeaturedAlbumsRow({
  albums,
  title,
  seeAllHref,
  limit = 4,
}: FeaturedAlbumsRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visible = albums.slice(0, limit)

  if (visible.length === 0) return null

  return (
    <section>
      <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
        <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>{title}</h2>
        {seeAllHref && (
          <Link to={seeAllHref} className={cm.cn('text-sm font-bold text-primary hover:underline')}>
            {t('featuredAlbumsRow.seeAll', {}, { defaultValue: 'See all →' })}
          </Link>
        )}
      </div>
      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 mt-4')}>
        {visible.map((album) => {
          const gradient = COVER_GRADIENTS[album.cover_index % COVER_GRADIENTS.length]
          return (
            <Link
              key={album.id}
              to={`/albums/${album.id}`}
              className={cm.cn(
                'group flex gap-4 p-4 rounded-2xl bg-surface-container-lowest hover:shadow-2xl hover:shadow-on-surface/5 transition-all',
              )}
            >
              <div
                className={cm.cn(
                  'w-28 h-28 rounded-xl shrink-0 flex items-center justify-center relative overflow-hidden',
                )}
                style={{ background: gradient }}
                aria-hidden="true"
              >
                <span
                  className={cm.cn(
                    'material-symbols-outlined text-[44px] text-white/40 group-hover:scale-110 transition-transform',
                  )}
                >
                  album
                </span>
              </div>
              <div className={cm.cn(cm.flex1, 'min-w-0 flex flex-col justify-center')}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {album.artist}
                </p>
                <h3
                  className={cm.cn(
                    'text-base font-extrabold tracking-tight text-on-surface line-clamp-1 mt-0.5 group-hover:text-primary transition-colors',
                  )}
                >
                  {album.title}
                </h3>
                {album.description && (
                  <p
                    className={cm.cn(
                      'text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed',
                    )}
                  >
                    {album.description}
                  </p>
                )}
                <div
                  className={cm.cn(
                    'flex items-center gap-2 mt-2 text-[11px] text-on-surface-variant',
                  )}
                >
                  <span className="tabular-nums">{album.year}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {t(
                      'featuredAlbumsRow.tracksCount',
                      { count: album.track_count },
                      { defaultValue: '{{count}} tracks' },
                    )}
                  </span>
                  {album.label && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{album.label}</span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
