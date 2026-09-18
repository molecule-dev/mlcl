import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface FeaturedVideo {
  id: string
  title: string
  description?: string
  channel_id: string
  channel_name: string
  duration_seconds: number
  view_count: number
  cover_index: number
  thumbnail_url?: string | null
  live?: boolean
  watch_progress_seconds?: number
}

interface FeaturedHeroCardProps {
  /** Featured / continue-watching video. `null` renders an idle hero. */
  video: FeaturedVideo | null
  /** Optional eyebrow ("Featured today", "Continue watching", …). */
  eyebrow?: string
  /** Optional secondary CTA link (defaults to channel page). */
  secondaryCtaLabel?: string
  secondaryCtaHref?: string
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4c1d95 100%)',
  'linear-gradient(135deg, #f43f5e 0%, #db2777 50%, #9d174d 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #155e75 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #c2410c 100%)',
  'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f43f5e 100%)',
  'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #c026d3 100%)',
]

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}

function fmtElapsed(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function fmtViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

/**
 * Cinematic full-bleed hero card for the Home page — left column has
 * eyebrow chip + huge tracking-tight title + description + scrubber +
 * "Watch now" + secondary CTA pair, right column has a frosted-glass
 * thumbnail panel with a Material `play_circle` glyph and a floating
 * play disk.
 *
 * Translated from podcast's EpisodeHeroCard.tsx (cover gradient + decor
 * orbs + frosted-glass cover + dual CTAs) and recoloured per Spool's
 * dark-violet/rose palette. Adapted for video duration/view metadata.
 */
export function FeaturedHeroCard({
  video,
  eyebrow,
  secondaryCtaLabel,
  secondaryCtaHref,
}: FeaturedHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (!video) {
    return (
      <section
        className={cm.cn('relative overflow-hidden rounded-[2rem] text-white shadow-2xl')}
        style={{ background: COVER_GRADIENTS[0], minHeight: '320px' }}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div className={cm.cn('relative z-10 p-10 flex flex-col justify-center min-h-[320px]')}>
          <p
            className={cm.cn('text-[11px] font-bold uppercase tracking-widest text-white/70 mb-3')}
          >
            {t('featuredHeroCard.idleEyebrow', {}, { defaultValue: 'Nothing queued up' })}
          </p>
          <h2 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
            {t('featuredHeroCard.idleHeadline', {}, { defaultValue: 'Pick something to watch' })}
          </h2>
        </div>
      </section>
    )
  }

  const progress =
    video.watch_progress_seconds && video.duration_seconds > 0
      ? Math.min(1, video.watch_progress_seconds / video.duration_seconds)
      : 0
  const remaining = Math.max(0, video.duration_seconds - (video.watch_progress_seconds ?? 0))
  const gradient = COVER_GRADIENTS[video.cover_index % COVER_GRADIENTS.length]
  const headerEyebrow =
    eyebrow ?? t('featuredHeroCard.defaultEyebrow', {}, { defaultValue: 'Featured today' })
  const hasResume = (video.watch_progress_seconds ?? 0) > 0

  const secondaryHref = secondaryCtaHref ?? `/channel/${video.channel_id}`
  const secondaryLabel =
    secondaryCtaLabel ?? t('featuredHeroCard.viewChannelCta', {}, { defaultValue: 'View channel' })

  return (
    <section
      className={cm.cn(
        'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-on-surface/10',
      )}
      style={{ background: gradient, minHeight: '380px' }}
    >
      <div
        className={cm.cn(
          'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute right-12 top-12 w-20 h-20 rounded-full bg-foreground/10 blur-2xl',
        )}
        aria-hidden="true"
      />

      <div
        className={cm.cn(
          'relative z-10 p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[380px]',
        )}
      >
        <div className={cm.cn('lg:col-span-7')}>
          <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            <span
              className={cm.cn(
                'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface/20 backdrop-blur-md',
              )}
            >
              {headerEyebrow}
            </span>
            <span
              className={cm.cn('text-[11px] font-bold uppercase tracking-widest text-white/80')}
            >
              {video.channel_name}
            </span>
            {video.live && (
              <span
                className={cm.cn(
                  'inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-error text-on-error',
                )}
              >
                <span
                  className={cm.cn('w-1.5 h-1.5 rounded-full bg-surface animate-pulse')}
                  aria-hidden="true"
                />
                {t('status.live', {}, { defaultValue: 'Live' })}
              </span>
            )}
          </div>

          <h2
            className={cm.cn(
              'text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05] mt-4',
            )}
          >
            {video.title}
          </h2>
          {video.description && (
            <p
              className={cm.cn(
                'text-sm md:text-base text-white/85 leading-relaxed mt-3 max-w-2xl line-clamp-3',
              )}
            >
              {video.description}
            </p>
          )}

          <div className={cm.cn('mt-6 max-w-lg')}>
            <div
              className={cm.cn(
                'flex items-center gap-2 text-[11px] font-mono tabular-nums text-white/70',
              )}
            >
              <span>{fmtElapsed(video.watch_progress_seconds ?? 0)}</span>
              <div className={cm.cn('flex-1 h-1.5 rounded-full bg-surface/20 overflow-hidden')}>
                <div
                  className={cm.cn('h-full bg-surface rounded-full transition-all')}
                  style={{ width: `${progress * 100}%` }}
                  aria-hidden="true"
                />
              </div>
              <span>{fmtElapsed(video.duration_seconds)}</span>
            </div>
            <p className={cm.cn('text-[11px] text-white/70 font-medium mt-2 tabular-nums')}>
              {t(
                'common.countViews',
                { count: fmtViews(video.view_count) },
                { defaultValue: '{{count}} views' },
              )}
            </p>
          </div>

          <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
            <Link
              to={`/watch/${video.id}`}
              className={cm.cn(
                'inline-flex items-center gap-2 px-7 py-3.5 mt-6 font-semibold text-[15px] bg-surface text-on-surface rounded-full hover:bg-surface/90 transition-colors shadow-lg shadow-black/10',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-base')}
                aria-hidden="true"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_arrow
              </span>
              {hasResume
                ? t(
                    'featuredHeroCard.resumeCta',
                    { time: fmtDuration(remaining) },
                    { defaultValue: 'Resume · {{time}} left' },
                  )
                : t(
                    'featuredHeroCard.watchCta',
                    { time: fmtDuration(video.duration_seconds) },
                    { defaultValue: 'Watch · {{time}}' },
                  )}
            </Link>
            <Link
              to={secondaryHref}
              className={cm.cn(
                'inline-flex items-center gap-2 px-7 py-3.5 mt-6 font-semibold text-[15px] rounded-full border border-surface/30 hover:bg-surface/10 transition-colors',
              )}
            >
              {secondaryLabel}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </div>

        <div className={cm.cn('lg:col-span-5 flex justify-center lg:justify-end')}>
          <div className={cm.cn('relative')}>
            <div
              className={cm.cn(
                'w-56 h-56 lg:w-64 lg:h-72 rounded-2xl shadow-2xl shadow-black/30 flex items-center justify-center overflow-hidden',
              )}
              style={{ background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)' }}
              aria-hidden="true"
            >
              {video.thumbnail_url ? (
                <img
                  src={video.thumbnail_url}
                  alt=""
                  className={cm.cn('w-full h-full object-cover')}
                />
              ) : (
                <span className={cm.cn('material-symbols-outlined text-[120px] text-white/90')}>
                  play_circle
                </span>
              )}
            </div>
            <div
              className={cm.cn(
                'absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-surface shadow-xl flex items-center justify-center',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[36px] text-on-surface')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_arrow
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export type { FeaturedVideo }
