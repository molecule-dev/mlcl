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
  useEffect(() => {
    if (!isLightboxOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLightboxOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isLightboxOpen])
  const photos = toPhotoArray(photosProp)
  const heroSrc =
    photos[activePhoto] ?? 'https://picsum.photos/seed/PropertyImageGallery-1/1200/800'
  const thumbs = photos.length > 1 ? photos.slice(1, 5) : []
  return (
    <section
      className={cm.cn(cm.grid({ cols: 12, gap: 'md' }), cm.sp('mb', 12), 'h-[500px]')}
      data-mol-id="gallery-section"
    >
      <div className={cm.cn('col-span-12 md:col-span-8 relative rounded-xl overflow-hidden group')}>
        <button
          type="button"
          className={cm.cn(cm.w('full'), cm.h('full'), cm.cursorPointer, 'block')}
          onClick={() => setIsLightboxOpen(true)}
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
            'fixed inset-0 z-50',
          )}
        >
          <div
            role="presentation"
            className={cm.cn('absolute inset-0 bg-foreground/95')}
            onClick={() => setIsLightboxOpen(false)}
          />
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
          <img
            alt={t('gallery.lightboxAlt', {}, { defaultValue: 'Full gallery view' })}
            className={cm.cn(cm.maxW('full'), 'relative max-h-full object-contain')}
            src={heroSrc}
          />
        </div>
      )}
    </section>
  )
}
export default PropertyImageGallery
export { PropertyImageGallery }
