import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { Album } from '../lib/api.js'
import type { SampleAlbum } from '../lib/sample-photos.js'

type AnyAlbum = Album | SampleAlbum

interface AlbumCardGridProps {
  albums: AnyAlbum[]
  /** Limit the number of cards rendered. Defaults to all. */
  limit?: number
  /** Optional empty-state copy override. */
  emptyMessage?: string
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #c8872e 0%, #855615 100%)',
  'linear-gradient(135deg, #1e293b 0%, #0c4a6e 100%)',
  'linear-gradient(135deg, #0e7490 0%, #134e4a 100%)',
  'linear-gradient(135deg, #1c1917 0%, #44403c 100%)',
  'linear-gradient(135deg, #c2410c 0%, #7c2d12 100%)',
  'linear-gradient(135deg, #3a7ca5 0%, #1e3a52 100%)',
  'linear-gradient(135deg, #7c2d12 0%, #1c1917 100%)',
]

type Translate = ReturnType<typeof useTranslation>['t']

function fmtRelative(iso: string, t: Translate): string {
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / 86_400_000)
  if (days < 1) return t('albumCardGrid.today', {}, { defaultValue: 'today' })
  if (days === 1) return t('albumCardGrid.yesterday', {}, { defaultValue: 'yesterday' })
  if (days < 30)
    return t('albumCardGrid.daysAgo', { count: days }, { defaultValue: '{{count}} days ago' })
  const months = Math.floor(days / 30)
  if (months < 12)
    return months === 1
      ? t('albumCardGrid.monthAgo', {}, { defaultValue: '1 month ago' })
      : t('albumCardGrid.monthsAgo', { count: months }, { defaultValue: '{{count}} months ago' })
  const years = Math.floor(months / 12)
  return years === 1
    ? t('albumCardGrid.yearAgo', {}, { defaultValue: '1 year ago' })
    : t('albumCardGrid.yearsAgo', { count: years }, { defaultValue: '{{count}} years ago' })
}

function isRealAlbum(a: AnyAlbum): a is Album {
  return 'owner_id' in a
}

function albumDisplay(
  album: AnyAlbum,
  t: Translate,
): {
  title: string
  description: string
  curator: string
  photoCount: number
  updatedAt: string
  coverIndex: number
} {
  if (isRealAlbum(album)) {
    return {
      title: album.title || t('albumCardGrid.untitled', {}, { defaultValue: 'Untitled album' }),
      description: album.description ?? '',
      curator: t('albumCardGrid.selfCurator', {}, { defaultValue: 'me' }),
      photoCount: album.photo_count ?? 0,
      updatedAt: album.updated_at ?? album.created_at ?? new Date().toISOString(),
      coverIndex: 0,
    }
  }
  return {
    title: album.title,
    description: album.description,
    curator: album.curator,
    photoCount: album.photo_count,
    updatedAt: album.updated_at,
    coverIndex: album.cover_index,
  }
}

/**
 * Album card grid — gradient cover with stacked-cover effect (3 layered
 * sheets behind the active gradient), Playfair album title, curator
 * byline + photo count + relative-update time.
 */
export function AlbumCardGrid({ albums, limit, emptyMessage }: AlbumCardGridProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visible = typeof limit === 'number' ? albums.slice(0, limit) : albums

  if (visible.length === 0) {
    return (
      <p
        data-testid="album-grid-empty"
        className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant text-sm italic')}
      >
        {emptyMessage ?? t('albumCardGrid.empty', {}, { defaultValue: 'No albums curated yet.' })}
      </p>
    )
  }

  return (
    <div
      data-testid="album-grid"
      className={cm.cn(
        cm.grid({ gap: 'lg' }),
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
      )}
    >
      {visible.map((album, idx) => {
        const display = albumDisplay(album, t)
        const gradient = COVER_GRADIENTS[(display.coverIndex + idx) % COVER_GRADIENTS.length]
        return (
          <Link
            key={album.id}
            to={`/albums/${album.id}`}
            data-testid={`album-card-${album.id}`}
            className={
              'group block bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300'
            }
          >
            <div className="relative aspect-[16/10]">
              <div
                className={
                  'absolute inset-x-3 top-2 h-3 rounded-t-md bg-surface-container-high opacity-70'
                }
                aria-hidden="true"
              />
              <div
                className={
                  'absolute inset-x-2 top-1 h-3 rounded-t-md bg-surface-container-highest opacity-90'
                }
                aria-hidden="true"
              />
              <div
                className={
                  'absolute inset-0 mt-2 mx-1 rounded-md flex items-center justify-center overflow-hidden'
                }
                style={{ background: gradient }}
                aria-hidden="true"
              >
                <span
                  className={
                    'material-symbols-outlined text-[56px] text-white/30 group-hover:scale-110 transition-transform duration-300'
                  }
                >
                  photo_album
                </span>
                <div
                  className={
                    'absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent'
                  }
                />
              </div>
            </div>
            <div className={cm.cn(cm.sp('p', 4))}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                {t(
                  'albumCardGrid.curatedBy',
                  { curator: display.curator },
                  { defaultValue: 'curated by {{curator}}' },
                )}
              </p>
              <h3
                className={cm.cn(
                  cm.textSize('lg'),
                  'font-extrabold tracking-tight mt-1 line-clamp-1 group-hover:text-primary transition-colors',
                )}
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              >
                {display.title}
              </h3>
              <p className={'text-xs text-on-surface-variant line-clamp-2 mt-1.5 leading-relaxed'}>
                {display.description}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'mt-3 text-[11px] text-on-surface-variant tabular-nums',
                )}
              >
                <span>
                  {t(
                    'albumCardGrid.photoCount',
                    { count: display.photoCount },
                    { defaultValue: '{{count}} photos' },
                  )}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {t(
                    'albumCardGrid.updatedAt',
                    { rel: fmtRelative(display.updatedAt, t) },
                    { defaultValue: 'updated {{rel}}' },
                  )}
                </span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
