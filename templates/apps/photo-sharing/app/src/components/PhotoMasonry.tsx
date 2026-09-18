import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { Photo } from '../lib/api.js'
import type { SamplePhoto } from '../lib/sample-photos.js'

type AnyPhoto = Photo | SamplePhoto

interface PhotoMasonryProps {
  photos: AnyPhoto[]
  /** Optional empty-state copy override. */
  emptyMessage?: string
  /** Optional id of a photo currently focused in a lightbox / detail. */
  activeId?: string
  /** Optional callback for non-link interactions (e.g. lightbox open). */
  onSelect?: (photoId: string) => void
  /**
   * Per-tile href builder. Defaults to `/photos/<id>`. Callers rendering
   * SAMPLE photos (whose ids don't exist in the real catalog and would
   * 404) should route clicks to a real destination instead — the
   * Galleries empty-state fallback passes `() => '/albums'`.
   */
  buildHref?: (photo: AnyPhoto) => string
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #c8872e 0%, #a66e1f 100%)',
  'linear-gradient(135deg, #1e293b 0%, #0c4a6e 100%)',
  'linear-gradient(135deg, #0e7490 0%, #134e4a 100%)',
  'linear-gradient(135deg, #1c1917 0%, #44403c 100%)',
  'linear-gradient(135deg, #c2410c 0%, #7c2d12 100%)',
  'linear-gradient(135deg, #3a7ca5 0%, #1e3a52 100%)',
  'linear-gradient(135deg, #7c2d12 0%, #1c1917 100%)',
]

const ASPECT_CLASSES: Record<string, string> = {
  tall: 'row-span-2 aspect-[3/4]',
  wide: 'col-span-2 aspect-[16/10]',
  square: 'aspect-square',
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function isRealPhoto(p: AnyPhoto): p is Photo {
  return (
    'thumbnail_url' in p &&
    typeof (p as Photo).thumbnail_url === 'string' &&
    (p as Photo).thumbnail_url.length > 0
  )
}

function aspectFromDims(p: Photo): keyof typeof ASPECT_CLASSES {
  const w = p.width ?? 0
  const h = p.height ?? 0
  if (w && h) {
    const r = w / h
    if (r > 1.4) return 'wide'
    if (r < 0.75) return 'tall'
  }
  return 'square'
}

export function PhotoMasonry({
  photos,
  emptyMessage,
  activeId,
  onSelect,
  buildHref = (photo) => `/photos/${photo.id}`,
}: PhotoMasonryProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (photos.length === 0) {
    return (
      <p
        data-testid="photo-masonry-empty"
        className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant text-sm italic')}
      >
        {emptyMessage ??
          t('photoMasonry.empty', {}, { defaultValue: 'No photographs in this view yet.' })}
      </p>
    )
  }

  return (
    <ul
      data-testid="photo-masonry"
      className={'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-[180px]'}
    >
      {photos.map((photo, idx) => {
        const real = isRealPhoto(photo)
        const aspect = real ? aspectFromDims(photo) : (photo as SamplePhoto).aspect
        const aspectClass = ASPECT_CLASSES[aspect] ?? ASPECT_CLASSES.square
        const coverIndex = real ? idx % COVER_GRADIENTS.length : (photo as SamplePhoto).cover_index
        const gradient = COVER_GRADIENTS[coverIndex % COVER_GRADIENTS.length]
        const isActive = activeId === photo.id
        const title = (photo.title ?? '') as string
        const favCount =
          'favorite_count' in photo ? (photo as Photo | SamplePhoto).favorite_count : 0
        const handle = real
          ? (photo.owner?.username ??
            photo.owner?.name ??
            t('photoMasonry.selfHandle', {}, { defaultValue: 'me' }))
          : (photo as SamplePhoto).author_handle

        const tile = (
          <div
            className={cm.cn(
              'relative w-full h-full overflow-hidden rounded-md group transition-shadow duration-300',
              isActive ? 'ring-2 ring-primary ring-offset-2 shadow-lg' : 'hover:shadow-lg',
            )}
            style={{ background: gradient }}
          >
            {real ? (
              <img
                src={photo.thumbnail_url}
                alt={
                  title ||
                  t('photoMasonry.photoAlt', { handle }, { defaultValue: 'Photo by {{handle}}' })
                }
                loading="lazy"
                className={'absolute inset-0 w-full h-full object-cover'}
                data-testid={`photo-masonry-img-${photo.id}`}
              />
            ) : (
              <div
                className={'absolute inset-0 flex items-center justify-center pointer-events-none'}
                aria-hidden="true"
              >
                <span
                  className={
                    'material-symbols-outlined text-[64px] text-white/30 group-hover:scale-105 transition-transform duration-300'
                  }
                >
                  image
                </span>
              </div>
            )}
            <div
              className={
                'absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300'
              }
            />
            <div
              className={
                'absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300'
              }
            >
              <p
                className={'text-sm font-bold text-white line-clamp-1'}
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              >
                {title || t('status.untitled', {}, { defaultValue: 'Untitled' })}
              </p>
              <div
                className={'flex items-center gap-3 text-[11px] text-white/85 tabular-nums mt-0.5'}
              >
                <span className={'inline-flex items-center gap-1'}>
                  <span
                    className="material-symbols-outlined text-[14px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    favorite
                  </span>
                  {fmtCount(favCount)}
                </span>
                <span aria-hidden="true">·</span>
                <span className="truncate">@{handle}</span>
              </div>
            </div>
          </div>
        )

        return (
          <li
            key={photo.id}
            className={cm.cn(aspectClass, 'min-h-0')}
            data-testid={`photo-masonry-item-${photo.id}`}
          >
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(photo.id)}
                aria-label={t(
                  'photoMasonry.openAria',
                  { title: title || t('status.untitled', {}, { defaultValue: 'Untitled' }) },
                  { defaultValue: 'Open {{title}}' },
                )}
                className={'block w-full h-full text-left'}
              >
                {tile}
              </button>
            ) : (
              <Link
                to={buildHref(photo)}
                aria-label={t(
                  'photoMasonry.openAria',
                  { title: title || t('status.untitled', {}, { defaultValue: 'Untitled' }) },
                  { defaultValue: 'Open {{title}}' },
                )}
                className={'block w-full h-full'}
              >
                {tile}
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}
