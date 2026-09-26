import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { SamplePhoto } from '../lib/sample-photos.js'

interface FeaturedPhotoHeroCardProps {
  /** Featured / cover photo. `null` renders a calm idle state. */
  photo: SamplePhoto | null
  /** Optional eyebrow ("Today's editor's pick", "Featured story", etc.). */
  eyebrow?: string
  /**
   * Primary CTA href. Defaults to `/photos/<photo.id>`, but the public
   * landing page passes `/signup` because sample photo IDs don't exist
   * in the real catalog and would 404 (and emit a UUID-syntax 500 in
   * the API logs) if a visitor clicked them.
   */
  primaryHref?: string
  /** Override the primary CTA label. */
  primaryLabel?: string
  /** Optional secondary CTA href (e.g. an album the photo belongs to). */
  secondaryHref?: string
  /** Optional secondary CTA label. */
  secondaryLabel?: string
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #c8872e 0%, #a66e1f 50%, #855615 100%)',
  'linear-gradient(135deg, #1e293b 0%, #334155 50%, #0c4a6e 100%)',
  'linear-gradient(135deg, #0e7490 0%, #155e75 50%, #134e4a 100%)',
  'linear-gradient(135deg, #1c1917 0%, #44403c 50%, #78716c 100%)',
  'linear-gradient(135deg, #c2410c 0%, #9a3412 50%, #7c2d12 100%)',
  'linear-gradient(135deg, #3a7ca5 0%, #2d6384 50%, #1e3a52 100%)',
  'linear-gradient(135deg, #7c2d12 0%, #5e2412 50%, #1c1917 100%)',
]

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/**
 * Cinematic full-bleed hero card — left column has eyebrow + huge editorial
 * title in Playfair, photographer byline, EXIF chips (camera + aperture +
 * shutter), Open photo / Open album CTA pair. Right column has a
 * frosted-glass square with the `camera` Material glyph and a floating
 * favourite-count disk.
 *
 * Translated from music-streaming's NowPlayingHeroCard.tsx, switched from
 * a play scrubber to EXIF chip strip and recoloured via Obscura's
 * warm-gold/blue-hour gradient palette. Uses Playfair Display only for
 * the headline (per DESIGN.md).
 */
export function FeaturedPhotoHeroCard({
  photo,
  eyebrow,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: FeaturedPhotoHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (!photo) {
    return (
      <section
        className={'relative overflow-hidden rounded-[2rem] text-white shadow-2xl'}
        style={{ background: COVER_GRADIENTS[3], minHeight: '320px' }}
      >
        <div
          className={'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/10 blur-3xl'}
          aria-hidden="true"
        />
        <div className={'relative z-10 p-10 flex flex-col justify-center min-h-[320px]'}>
          <p className={'text-[11px] font-bold uppercase tracking-widest text-white/70 mb-3'}>
            {t('featuredPhotoHeroCard.idleEyebrow', {}, { defaultValue: 'Quiet on the wire' })}
          </p>
          <h2
            className="text-4xl font-extrabold tracking-tight"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            {t(
              'featuredPhotoHeroCard.idleHeadline',
              {},
              { defaultValue: 'Upload your first frame' },
            )}
          </h2>
        </div>
      </section>
    )
  }

  const gradient = COVER_GRADIENTS[photo.cover_index % COVER_GRADIENTS.length]
  const headerEyebrow =
    eyebrow ??
    t('featuredPhotoHeroCard.defaultEyebrow', {}, { defaultValue: "Today's editorial pick" })

  return (
    <section
      className={
        'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-on-surface/10'
      }
      style={{ background: gradient, minHeight: '420px' }}
    >
      <div
        className={'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl'}
        aria-hidden="true"
      />
      <div
        className={'absolute right-12 top-12 w-20 h-20 rounded-full bg-foreground/10 blur-2xl'}
        aria-hidden="true"
      />

      <div
        className={'relative z-10 p-8 lg:p-10 grid grid-cols-1 gap-8 items-center min-h-[420px]'}
      >
        <div>
          <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            <span
              className={
                'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface/20 backdrop-blur-md'
              }
            >
              {headerEyebrow}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">
              {t(
                'featuredPhotoHeroCard.byline',
                { author: photo.author },
                { defaultValue: 'by {{author}}' },
              )}
            </span>
          </div>

          <h2
            className={
              'text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.02] mt-5'
            }
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            {photo.title}
          </h2>
          <p className={'text-base md:text-lg text-white/85 leading-relaxed mt-4 max-w-xl'}>
            {photo.caption}
          </p>

          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }), 'mt-6')}>
            <span
              className={
                'px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-foreground/20 backdrop-blur-md'
              }
            >
              {photo.exif.camera}
            </span>
            <span
              className={
                'px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-foreground/20 backdrop-blur-md'
              }
            >
              {photo.exif.focal_length} · {photo.exif.aperture}
            </span>
            <span
              className={
                'px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-foreground/20 backdrop-blur-md'
              }
            >
              {photo.exif.shutter_speed} · {photo.exif.iso}
            </span>
          </div>

          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), 'mt-7')}>
            <Link
              to={primaryHref ?? `/photos/${photo.id}`}
              className={
                'inline-flex items-center gap-2 px-7 py-3.5 font-semibold text-[15px] bg-surface text-on-surface rounded-full hover:bg-surface/90 transition-colors shadow-lg shadow-black/10'
              }
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                image
              </span>
              {primaryLabel ??
                t('featuredPhotoHeroCard.openCta', {}, { defaultValue: 'Open photo' })}
            </Link>
            {secondaryHref && (
              <Link
                to={secondaryHref}
                className={
                  'inline-flex items-center gap-2 px-7 py-3.5 font-semibold text-[15px] rounded-full border border-surface/30 hover:bg-surface/10 transition-colors'
                }
              >
                {secondaryLabel ??
                  t('featuredPhotoHeroCard.secondaryCta', {}, { defaultValue: 'View album' })}
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            )}
          </div>

          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
              'mt-7 text-[11px] text-white/70 tabular-nums',
            )}
          >
            <span className={'inline-flex items-center gap-1.5'}>
              <span
                className={'material-symbols-outlined text-base'}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                favorite
              </span>
              {fmtCount(photo.favorite_count)}
            </span>
            <span className={'inline-flex items-center gap-1.5'}>
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                visibility
              </span>
              {fmtCount(photo.view_count)}
            </span>
            <span className={'inline-flex items-center gap-1.5'}>
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                chat_bubble
              </span>
              {fmtCount(photo.comment_count)}
            </span>
          </div>
        </div>

        <div className={'flex justify-center'}>
          <div className="relative">
            <div
              className={
                'w-56 h-56 lg:w-72 lg:h-72 rounded-3xl shadow-2xl shadow-black/30 flex items-center justify-center'
              }
              style={{ background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)' }}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-[140px] text-white/90">image</span>
            </div>
            <div
              className={
                'absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-surface shadow-xl flex items-center justify-center'
              }
            >
              <span
                className="material-symbols-outlined text-[32px]"
                style={{ color: 'var(--color-primary)', fontVariationSettings: "'FILL' 1" }}
              >
                bookmark
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
