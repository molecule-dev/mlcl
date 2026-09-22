import { useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function fmtPrice(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}
interface GalleryProps {
  photos?: string[] | unknown
  title?: string
  price?: number
}
/**
 * Postgres JSONB columns round-trip differently depending on the
 * driver: an empty array can come back as `{}`, and a stringified
 * value can come back as a `string`. Normalise to a plain `string[]`
 * before any `.length`/`.map`/`.slice` calls.
 */
function toPhotoArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as string[]) : []
    } catch (_error) {
      // JSON.parse failed — value is not a valid array string, fall back to empty
      return []
    }
  }
  return []
}

function PropertyImageGallery({ photos: photosProp, title: titleProp, price }: GalleryProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const title = titleProp ?? t('property.defaultTitle', {}, { defaultValue: 'Property' })
  const [activePhoto, setActivePhoto] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const photos = toPhotoArray(photosProp)
  const count = photos.length
  const showPhoto = (index: number) => {
    if (count === 0) return
    setActivePhoto(((index % count) + count) % count)
  }
  useEffect(() => {
    if (!isLightboxOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLightboxOpen(false)
      if (e.key === 'ArrowRight') showPhoto(activePhoto + 1)
      if (e.key === 'ArrowLeft') showPhoto(activePhoto - 1)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })
  const heroSrc =
    photos[activePhoto] ?? 'https://picsum.photos/seed/PropertyImageGallery-1/1200/800'
  const thumbs = photos.length > 1 ? photos.slice(1, 5) : []
  return (
    <section
      className={cm.cn(cm.grid({ cols: 12, gap: 'md' }), cm.sp('mb', 12), 'h-auto md:h-[500px]')}
      data-mol-id="gallery-section"
    >
      <div
        className={cm.cn(
          'col-span-12 md:col-span-8 relative rounded-xl overflow-hidden group h-64 sm:h-80 md:h-full',
        )}
      >
        <button
          type="button"
          className={cm.cn(cm.w('full'), cm.h('full'), cm.cursorPointer, 'block')}
          onClick={() => setIsLightboxOpen(true)}
          aria-label={
            count > 1
              ? t('gallery.openLightbox', { count }, { defaultValue: 'Open all {{count}} photos' })
              : t('gallery.zoomPhoto', {}, { defaultValue: 'View photo full screen' })
          }
        >
          <img
            alt={t('gallery.heroAlt', {}, { defaultValue: 'Hero Image' })}
            className={cm.cn(
              cm.w('full'),
              cm.h('full'),
              'object-cover transition-transform duration-700 group-hover:scale-105',
            )}
            src={heroSrc}
          />
        </button>
        {price != null && (
          <div
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              'absolute top-6 left-6 bg-surface/80 backdrop-blur-md shadow-lg',
            )}
          >
            <span
              className={cm.cn(
                cm.textPrimary,
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                'font-headline',
              )}
            >
              {fmtPrice(price)}
            </span>
          </div>
        )}
      </div>
      {/* Mobile photo strip — the 2x2 desktop thumb grid is hidden below md, so
          without this strip phones have no way to reach photos 2..n. */}
      {count > 1 && (
        <div
          className={cm.cn(
            'col-span-12 md:hidden flex gap-2 overflow-x-auto pb-1 -mt-2',
            '[&>button]:shrink-0 [&>button]:w-20 [&>button]:h-16 [&>button]:relative [&>button]:rounded-lg [&>button]:overflow-hidden',
          )}
          data-mol-id="gallery-mobile-strip"
        >
          {photos.map((photo, i) => (
            <button
              key={i}
              type="button"
              onClick={() => showPhoto(i)}
              aria-label={t(
                'gallery.showPhotoN',
                { index: i + 1, count },
                { defaultValue: 'Show photo {{index}} of {{count}}' },
              )}
              aria-current={i === activePhoto}
              className={cm.cn('block', i === activePhoto ? 'ring-2 ring-primary' : 'opacity-70')}
            >
              <img
                alt=""
                className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                src={photo}
              />
            </button>
          ))}
        </div>
      )}
      {thumbs.length > 0 && (
        <div
          className={cm.cn(
            cm.grid({ cols: 2, gap: 'md' }),
            'hidden md:grid col-span-4 grid-rows-2',
          )}
        >
          {thumbs.map((photo, i) => {
            const isLast = i === thumbs.length - 1 && photos.length > 5
            return (
              <div key={i} className={cm.cn('relative rounded-xl overflow-hidden')}>
                <button
                  type="button"
                  className={cm.cn(cm.w('full'), cm.h('full'), cm.cursorPointer, 'block')}
                  onClick={() => setActivePhoto(i + 1)}
                  aria-label={t(
                    'gallery.showPhotoN',
                    { index: i + 2, count },
                    { defaultValue: 'Show photo {{index}} of {{count}}' },
                  )}
                >
                  <img
                    alt={t(
                      'gallery.thumbnailAlt',
                      { title, index: i + 2 },
                      { defaultValue: '{{title}} photo {{index}}' },
                    )}
                    className={cm.cn(
                      cm.w('full'),
                      cm.h('full'),
                      `object-cover${isLast ? ' blur-[2px] brightness-50' : ''}`,
                    )}
                    src={photo}
                  />
                </button>
                {isLast && (
                  <button
                    type="button"
                    className={cm.cn(
                      cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
                      cm.fontWeight('semibold'),
                      'absolute inset-0 text-white',
                    )}
                    onClick={() => setIsLightboxOpen(true)}
                  >
                    <span
                      className={cm.cn(
                        cm.textSize('3xl'),
                        cm.sp('mb', 1),
                        'material-symbols-outlined',
                      )}
                    >
                      grid_view
                    </span>
                    <span className={cm.cn(cm.textSize('sm'))}>
                      {t(
                        'gallery.viewAllPhotos',
                        { count: photos.length },
                        { defaultValue: 'View all {{count}} photos' },
                      )}
                    </span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('gallery.lightboxLabel', {}, { defaultValue: 'Photo gallery' })}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('p', 4),
            'fixed inset-0 z-50 bg-foreground/95',
          )}
        >
          <button
            type="button"
            aria-label={t('gallery.closeLightbox', {}, { defaultValue: 'Close gallery' })}
            className={cm.cn(
              cm.textSize('3xl'),
              cm.sp('p', 2),
              cm.roundedFull,
              'absolute top-4 right-4 text-inverse-on-surface hover:bg-surface/10',
            )}
            onClick={() => setIsLightboxOpen(false)}
          >
            {t('common.close', {}, { defaultValue: '×' })}
          </button>
          {count > 1 && (
            <>
              <button
                type="button"
                aria-label={t('gallery.prevPhoto', {}, { defaultValue: 'Previous photo' })}
                className={cm.cn(
                  cm.sp('p', 2),
                  cm.roundedFull,
                  'absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-inverse-on-surface hover:bg-surface/10 min-w-11 min-h-11 flex items-center justify-center',
                )}
                onClick={() => showPhoto(activePhoto - 1)}
              >
                <span className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined')}>
                  chevron_left
                </span>
              </button>
              <button
                type="button"
                aria-label={t('gallery.nextPhoto', {}, { defaultValue: 'Next photo' })}
                className={cm.cn(
                  cm.sp('p', 2),
                  cm.roundedFull,
                  'absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-inverse-on-surface hover:bg-surface/10 min-w-11 min-h-11 flex items-center justify-center',
                )}
                onClick={() => showPhoto(activePhoto + 1)}
              >
                <span className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined')}>
                  chevron_right
                </span>
              </button>
            </>
          )}
          <img
            alt={t('gallery.lightboxAlt', {}, { defaultValue: 'Full gallery view' })}
            className={cm.cn(cm.maxW('full'), 'relative max-h-full object-contain')}
            src={heroSrc}
          />
          {count > 1 && (
            <div
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('sm'),
                cm.roundedFull,
                'absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface/20 text-inverse-on-surface',
              )}
              data-mol-id="gallery-counter"
            >
              {t(
                'gallery.photoPosition',
                { index: activePhoto + 1, count },
                { defaultValue: '{{index}} / {{count}}' },
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
export default PropertyImageGallery
export { PropertyImageGallery }
