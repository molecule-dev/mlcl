import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { requireProvider } from '@molecule/app-gallery'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { GalleryFeatureRow } from '../components/GalleryFeatureRow.js'
import { PhotoMasonry } from '../components/PhotoMasonry.js'
import { type Gallery, listGalleries, type Photo } from '../lib/api.js'
import { SAMPLE_GALLERIES, SAMPLE_PHOTOS } from '../lib/sample-photos.js'

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #c8872e 0%, #855615 100%)',
  'linear-gradient(135deg, #1e293b 0%, #0c4a6e 100%)',
  'linear-gradient(135deg, #0e7490 0%, #134e4a 100%)',
  'linear-gradient(135deg, #1c1917 0%, #44403c 100%)',
]

/**
 * Editorial-style galleries view backed by `/api/galleries` (which
 * surfaces public albums sorted by photo_count + recent activity).
 *
 * When no real galleries exist yet (e.g. first-time signup, fresh DB)
 * we fall back to the SAMPLE_GALLERIES marketing data so the page
 * still teaches what galleries look like — but the CTAs always go to
 * real, working destinations.
 */
export function Galleries() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [galleries, setGalleries] = useState<Gallery[] | null>(null)
  const [featured, setFeatured] = useState<Gallery | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listGalleries()
      .then((res) => {
        if (cancelled) return
        setGalleries(res.data)
        setFeatured(res.featured ?? res.data[0] ?? null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Live data branch — real public albums.
  if (galleries && galleries.length > 0 && featured) {
    const featuredCover =
      featured.cover_photos[0]?.large_url ?? featured.cover_photos[0]?.thumbnail_url ?? null
    const featuredPhotos: Photo[] = featured.sample_photos.map((p) => ({
      id: p.id,
      owner_id: featured.curator_id,
      album_id: featured.id,
      title: null,
      caption: null,
      description: null,
      original_url: p.large_url,
      large_url: p.large_url,
      thumbnail_url: p.thumbnail_url,
      width: p.width,
      height: p.height,
      exif_data: null,
      tags: [],
      visibility: 'public',
      view_count: 0,
      favorite_count: 0,
      comment_count: 0,
      uploaded_at: featured.updated_at,
    }))
    const otherGalleries = galleries.filter((g) => g.id !== featured.id)
    // "Selected frames" tiles open the bonded PhotoSwipe lightbox (full-screen,
    // swipeable, zoomable) instead of navigating away — the editorial viewing
    // surface this page exists for. The masonry's onSelect contract turns each
    // tile into a button carrying an accessible label.
    const openLightbox = (photoId: string): void => {
      const index = featuredPhotos.findIndex((p) => p.id === photoId)
      if (index < 0) return
      const p = featuredPhotos[index]
      try {
        requireProvider()
          .createGallery({
            items: featuredPhotos.map((ph) => ({
              src: ph.large_url || ph.original_url,
              thumbnail: ph.thumbnail_url,
              width: ph.width ?? 1600,
              height: ph.height ?? 1000,
              alt:
                ph.title ??
                t('galleries.lightboxAlt', {}, { defaultValue: 'Photograph from the gallery' }),
              caption: ph.title ?? undefined,
            })),
            startIndex: index,
            zoomable: true,
          })
          .open(index)
      } catch (_error) {
        // No gallery provider bonded (should not happen — the bond is wired in
        // bonds/index.ts) — fall back to the photo detail page.
        window.location.href = `/photos/${p.id}`
      }
    }
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-12')}
      >
        <header className={'space-y-2'}>
          <p className="text-[11px] font-black uppercase tracking-widest text-primary">
            {t('galleries.eyebrow', {}, { defaultValue: 'Editor-curated · weekly' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              'font-extrabold tracking-tight leading-[1.05] md:text-5xl',
            )}
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            {t('galleries.heading', {}, { defaultValue: 'Galleries' })}
          </h1>
          <p className={'text-base text-on-surface-variant max-w-2xl'}>
            {t(
              'galleries.subheading',
              {},
              {
                defaultValue:
                  'Themed collections curated by photographers and editors. Long-form, slow-paced, and made to be looked at.',
              },
            )}
          </p>
        </header>

        <section
          className={
            'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-on-surface/10'
          }
          style={{ background: COVER_GRADIENTS[0], minHeight: '320px' }}
          data-testid="galleries-featured"
        >
          {featuredCover && (
            <div className={'absolute inset-0'} aria-hidden="true">
              <img
                src={featuredCover}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-50"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            </div>
          )}
          <div
            className={
              'relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-8 md:p-12 min-h-[320px]'
            }
          >
            <div className={'lg:col-span-7 space-y-5'}>
              <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
                <span
                  className={
                    'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface/20 backdrop-blur-md'
                  }
                >
                  {t('galleries.featuredPill', {}, { defaultValue: "Editor's gallery" })}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">
                  {t(
                    'galleries.featuredCurator',
                    { curator: featured.curator },
                    { defaultValue: 'curated by {{curator}}' },
                  )}
                </span>
              </div>
              <h2
                className={'text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]'}
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              >
                {featured.title}
              </h2>
              {featured.description && (
                <p className={'text-base md:text-lg text-white/85 leading-relaxed max-w-xl'}>
                  {featured.description}
                </p>
              )}
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }))}>
                <Link
                  to={`/albums/${featured.id}`}
                  className={
                    'inline-flex items-center gap-2 px-7 py-3.5 font-semibold text-[15px] bg-surface text-on-surface rounded-full hover:bg-surface/90 transition-colors shadow-lg shadow-black/10'
                  }
                  data-testid="galleries-featured-open"
                >
                  <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                    collections
                  </span>
                  {t('galleries.openGalleryCta', {}, { defaultValue: 'Open the gallery' })}
                </Link>
                <span className="text-[11px] font-mono tabular-nums text-white/80">
                  {t(
                    'galleries.featuredCount',
                    { count: featured.photo_count },
                    { defaultValue: '{{count}} frames inside' },
                  )}
                </span>
              </div>
            </div>
            <div className={'lg:col-span-5'}>
              <div
                className={'grid grid-cols-2 gap-2 p-3 rounded-3xl bg-surface/10 backdrop-blur-sm'}
              >
                {featured.cover_photos.slice(0, 4).map((p) => (
                  <div key={p.id} className={'aspect-square rounded-xl overflow-hidden'}>
                    <img
                      src={p.thumbnail_url || p.large_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={'space-y-4'}>
          <header>
            <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
              {t('galleries.featuredFramesEyebrow', {}, { defaultValue: 'A taste from inside' })}
            </p>
            <h2
              className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight mt-1')}
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              {t(
                'galleries.featuredFramesHeading',
                { title: featured.title },
                { defaultValue: 'Selected frames from "{{title}}"' },
              )}
            </h2>
          </header>
          <PhotoMasonry photos={featuredPhotos} onSelect={openLightbox} />
        </section>

        {otherGalleries.length > 0 && (
          <section data-testid="galleries-more" className="space-y-4">
            <header>
              <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                {t('galleries.moreEyebrow', {}, { defaultValue: 'More from the curators' })}
              </p>
              <h2
                className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight mt-1')}
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              >
                {t('galleries.moreHeading', {}, { defaultValue: 'Recent galleries' })}
              </h2>
            </header>
            <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
              {otherGalleries.map((g) => (
                <Link
                  key={g.id}
                  to={`/albums/${g.id}`}
                  className={
                    'col-span-12 md:col-span-6 lg:col-span-4 group rounded-2xl overflow-hidden bg-surface-container-lowest shadow-sm hover:shadow-lg transition-shadow'
                  }
                  data-testid={`galleries-card-${g.id}`}
                >
                  <div className={'relative aspect-[16/9] bg-surface-container'}>
                    {g.cover_photos[0] && (
                      <img
                        src={g.cover_photos[0].thumbnail_url || g.cover_photos[0].large_url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                  </div>
                  <div className={cm.cn(cm.sp('p', 5), 'space-y-2')}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                      {t(
                        'galleries.curatedBy',
                        { curator: g.curator },
                        { defaultValue: 'curated by {{curator}}' },
                      )}
                    </p>
                    <h3
                      className={'text-lg font-extrabold tracking-tight'}
                      style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                    >
                      {g.title}
                    </h3>
                    {g.description && (
                      <p className={'text-sm text-on-surface-variant line-clamp-2'}>
                        {g.description}
                      </p>
                    )}
                    <p className="text-[11px] font-mono tabular-nums text-on-surface-variant">
                      {t(
                        'galleries.frameCount',
                        { count: g.photo_count },
                        { defaultValue: '{{count}} photographs' },
                      )}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    )
  }

  // Empty / error / loading branch — fall back to sample marketing data
  // so the page still demonstrates the gallery concept. CTAs link to
  // /albums (the real index of public albums) so a click always goes
  // somewhere useful.
  const featuredSample = SAMPLE_GALLERIES.find((g) => g.is_featured) ?? SAMPLE_GALLERIES[0]
  const featuredSamplePhotos = SAMPLE_PHOTOS.slice(0, 6)
  const otherSamples = SAMPLE_GALLERIES.filter((g) => g.id !== featuredSample.id)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-12')}>
      <header className={'space-y-2'}>
        <p className="text-[11px] font-black uppercase tracking-widest text-primary">
          {t('galleries.eyebrow', {}, { defaultValue: 'Editor-curated · weekly' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            'font-extrabold tracking-tight leading-[1.05] md:text-5xl',
          )}
          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
        >
          {t('galleries.heading', {}, { defaultValue: 'Galleries' })}
        </h1>
        <p className={'text-base text-on-surface-variant max-w-2xl'}>
          {t(
            'galleries.subheading',
            {},
            {
              defaultValue:
                'Themed collections curated by photographers and editors. Long-form, slow-paced, and made to be looked at.',
            },
          )}
        </p>
      </header>

      {error && (
        <p className={'text-sm text-error'} role="alert" data-testid="galleries-error">
          {error}
        </p>
      )}
      {!error && galleries === null && (
        <p
          className={'text-sm text-on-surface-variant italic py-12 text-center'}
          data-testid="galleries-loading"
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      )}
      {galleries !== null && galleries.length === 0 && (
        <div
          className={
            'rounded-2xl bg-surface-container-lowest p-6 text-sm text-on-surface-variant border border-outline-variant/40'
          }
          data-testid="galleries-empty"
        >
          {t(
            'galleries.emptyNotice',
            {},
            {
              defaultValue:
                "No public album galleries yet. Make one of your own albums public from /albums and it'll appear here as a gallery.",
            },
          )}{' '}
          <Link to="/albums" className="text-primary hover:underline">
            {t('galleries.emptyCta', {}, { defaultValue: 'Open Albums' })}
          </Link>
        </div>
      )}

      <section
        className={
          'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-on-surface/10'
        }
        style={{ background: COVER_GRADIENTS[0], minHeight: '320px' }}
        data-testid="galleries-marketing-featured"
      >
        <div
          className={'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl'}
          aria-hidden="true"
        />
        <div
          className={
            'relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-8 md:p-12 min-h-[320px]'
          }
        >
          <div className={'lg:col-span-7 space-y-5'}>
            <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
              <span
                className={
                  'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface/20 backdrop-blur-md'
                }
              >
                {t('galleries.samplePill', {}, { defaultValue: 'Sample · how galleries look' })}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">
                {t(
                  'galleries.featuredCurator',
                  { curator: featuredSample.curator },
                  { defaultValue: 'curated by {{curator}}' },
                )}
              </span>
            </div>
            <h2
              className={'text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]'}
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              {featuredSample.title}
            </h2>
            <p className={'text-base md:text-lg text-white/85 leading-relaxed max-w-xl'}>
              {featuredSample.description}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }))}>
              <Link
                to="/albums"
                className={
                  'inline-flex items-center gap-2 px-7 py-3.5 font-semibold text-[15px] bg-surface text-on-surface rounded-full hover:bg-surface/90 transition-colors shadow-lg shadow-black/10'
                }
                data-testid="galleries-marketing-cta"
              >
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  collections
                </span>
                {t('galleries.startYourGallery', {}, { defaultValue: 'Start your own album' })}
              </Link>
              <span className="text-[11px] font-mono tabular-nums text-white/80">
                {t(
                  'galleries.featuredCount',
                  { count: featuredSample.photo_count },
                  { defaultValue: '{{count}} frames inside' },
                )}
              </span>
            </div>
          </div>
          <div className={'lg:col-span-5'}>
            <div
              className={'grid grid-cols-2 gap-2 p-3 rounded-3xl bg-surface/10 backdrop-blur-sm'}
            >
              {featuredSample.cover_indices.map((idx, i) => (
                <div
                  key={i}
                  className={
                    'aspect-square rounded-xl overflow-hidden flex items-center justify-center'
                  }
                  style={{ background: COVER_GRADIENTS[idx % COVER_GRADIENTS.length] }}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined text-[40px] text-white/40">image</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={'space-y-4'}>
        <header>
          <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
            {t('galleries.featuredFramesEyebrow', {}, { defaultValue: 'A taste from inside' })}
          </p>
          <h2
            className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight mt-1')}
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            {t(
              'galleries.featuredFramesHeading',
              { title: featuredSample.title },
              { defaultValue: 'Selected frames from "{{title}}"' },
            )}
          </h2>
        </header>
        {/* Sample photo ids don't exist in the real catalog — route tile
            clicks to the real Albums index instead of a 404ing detail page. */}
        <PhotoMasonry photos={featuredSamplePhotos} buildHref={() => '/albums'} />
      </section>

      <GalleryFeatureRow
        galleries={otherSamples}
        eyebrow={t('galleries.moreEyebrow', {}, { defaultValue: 'More from the curators' })}
        title={t('galleries.moreHeading', {}, { defaultValue: 'Recent galleries' })}
        seeAllHref="/albums"
        buildCardHref={() => '/albums'}
      />
    </div>
  )
}
