import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { SampleGallery } from '../lib/sample-photos.js'

interface GalleryFeatureRowProps {
  galleries: SampleGallery[]
  /** Section heading. */
  title: string
  /** Section eyebrow (small uppercase label above the heading). */
  eyebrow?: string
  /** Optional href for the "See all" anchor. */
  seeAllHref?: string
  /** Cards to render. Defaults to 3. */
  limit?: number
  /**
   * Per-card href builder. Lets callers route clicks to a real
   * destination instead of the default (/galleries#<sampleId>) hash
   * anchor that doesn't actually point anywhere. Landing page passes
   * `() => '/signup'`; the empty-galleries fallback uses `/albums`.
   */
  buildCardHref?: (gallery: SampleGallery) => string
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

/**
 * Editorial gallery row — each card has a 2×2 mini-grid of gradient
 * thumbnails, curator byline, photo count, and a "Featured" pill on
 * editorial picks. Per DESIGN.md "Gallery Card" §.
 *
 * Translated from music-streaming's FeaturedAlbumsRow.tsx (kept the
 * row-rhythm with see-all link) but switched the visual to the 2×2
 * thumbnail mosaic the gallery section calls for.
 */
export function GalleryFeatureRow({
  galleries,
  title,
  eyebrow,
  seeAllHref,
  limit = 3,
  buildCardHref = (g) => `/galleries#${g.id}`,
}: GalleryFeatureRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visible = galleries.slice(0, limit)

  if (visible.length === 0) return null

  return (
    <section>
      <header className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }))}>
        <div>
          {eyebrow && (
            <p className={'text-[11px] font-bold uppercase tracking-widest text-primary mb-1'}>
              {eyebrow}
            </p>
          )}
          <h2
            className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight')}
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            {title}
          </h2>
        </div>
        {seeAllHref && (
          <Link to={seeAllHref} className={'text-sm font-bold text-primary hover:underline'}>
            {t('galleryFeatureRow.seeAll', {}, { defaultValue: 'See all →' })}
          </Link>
        )}
      </header>
      <div
        className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-5')}
      >
        {visible.map((gallery) => (
          <Link
            key={gallery.id}
            to={buildCardHref(gallery)}
            className={
              'group block bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300'
            }
          >
            <div className={'aspect-[16/10] grid grid-cols-2 grid-rows-2 gap-1 p-2'}>
              {gallery.cover_indices.map((idx, i) => {
                const gradient = COVER_GRADIENTS[idx % COVER_GRADIENTS.length]
                return (
                  <div
                    key={i}
                    className={'rounded-md overflow-hidden flex items-center justify-center'}
                    style={{ background: gradient }}
                    aria-hidden="true"
                  >
                    <span
                      className={
                        'material-symbols-outlined text-[32px] text-white/30 group-hover:scale-110 transition-transform duration-300'
                      }
                    >
                      image
                    </span>
                  </div>
                )
              })}
            </div>
            <div className={cm.cn(cm.sp('p', 4))}>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {t(
                    'galleryFeatureRow.curatedBy',
                    { curator: gallery.curator },
                    { defaultValue: 'curated by {{curator}}' },
                  )}
                </p>
                {gallery.is_featured && (
                  <span
                    className={
                      'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest'
                    }
                    style={{ background: 'var(--color-primary)', color: 'var(--color-surface)' }}
                  >
                    {t('galleryFeatureRow.featuredPill', {}, { defaultValue: 'Featured' })}
                  </span>
                )}
              </div>
              <h3
                className={cm.cn(
                  cm.textSize('xl'),
                  'font-extrabold tracking-tight mt-1 line-clamp-1 group-hover:text-primary transition-colors',
                )}
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              >
                {gallery.title}
              </h3>
              <p className={'text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed'}>
                {gallery.description}
              </p>
              <p className={'text-[11px] text-on-surface-variant tabular-nums mt-2'}>
                {t(
                  'galleryFeatureRow.photoCount',
                  { count: gallery.photo_count },
                  { defaultValue: '{{count}} photographs' },
                )}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
