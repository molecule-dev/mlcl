import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface EpisodeHero {
  id: string
  show_id: string
  show_title?: string
  title: string
  description?: string
  cover_index: number
  duration_seconds: number
  played_position?: number
  played?: boolean
  published_at?: string
}

interface EpisodeHeroCardProps {
  episode: EpisodeHero | null
  /** Optional listening-streak label rendered as an overlay pill. */
  streakLabel?: string
}

/** Cover-art gradient token (defined in theme.css, `cover_index` is 0..11). */
const coverBackground = (index: number): string => `var(--color-cover-${index % 12})`

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}

function fmtElapsed(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

/**
 * Cinematic full-bleed hero card — cover-art gradient panel with editorial
 * left-side text + right-side stylized cover, large progress bar, primary
 * CTA pill ("Resume" / "Play"), warm-paper aesthetic with a Material Symbols
 * play glyph in a frosted-glass disk.
 *
 * Translated from blog's HeroSection, recoloured to Wavelength's warm
 * paper + ember-orange palette and adapted for episode metadata.
 */
export function EpisodeHeroCard({ episode, streakLabel }: EpisodeHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (!episode) {
    return (
      <section
        className={'relative overflow-hidden rounded-[2rem] text-white shadow-2xl'}
        style={{ background: coverBackground(0), minHeight: '320px' }}
      >
        <div className={'relative z-10 p-10 flex flex-col justify-center min-h-[320px]'}>
          <p className={'text-[11px] font-bold uppercase tracking-widest text-white/70 mb-3'}>
            {t('episodeHeroCard.idleEyebrow', {}, { defaultValue: 'No episode loaded' })}
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight">
            {t('episodeHeroCard.idleHeadline', {}, { defaultValue: 'Pick something to listen to' })}
          </h2>
        </div>
      </section>
    )
  }

  const playedPosition = episode.played_position ?? 0
  const progress =
    episode.duration_seconds > 0 ? Math.min(1, playedPosition / episode.duration_seconds) : 0
  const remaining = Math.max(0, episode.duration_seconds - playedPosition)
  const gradient = coverBackground(episode.cover_index)
  const hasResume = playedPosition > 0 && !episode.played

  return (
    <section
      className={
        'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-on-surface/10'
      }
      style={{ background: gradient, minHeight: '380px' }}
    >
      {/* Decorative orbs */}
      <div
        className={'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl'}
        aria-hidden="true"
      />
      <div
        className={'absolute right-12 top-12 w-20 h-20 rounded-full bg-foreground/10 blur-2xl'}
        aria-hidden="true"
      />

      <div
        className={
          'relative z-10 p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[380px]'
        }
      >
        {/* Left: episode metadata */}
        <div className={'lg:col-span-7'}>
          <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            <span
              className={
                'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface/20 backdrop-blur-md'
              }
            >
              {hasResume
                ? t('episodeHeroCard.resumingLabel', {}, { defaultValue: 'Resuming' })
                : t('episodeHeroCard.featuredLabel', {}, { defaultValue: 'Featured episode' })}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">
              {episode.show_title}
            </span>
            {streakLabel && (
              <span
                className={
                  'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface/20 backdrop-blur-md'
                }
              >
                {streakLabel}
              </span>
            )}
          </div>

          <h2
            className={
              'text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05] mt-4'
            }
          >
            {episode.title}
          </h2>
          <p
            className={
              'text-sm md:text-base text-white/80 leading-relaxed mt-3 max-w-2xl line-clamp-3'
            }
          >
            {episode.description}
          </p>

          {/* Progress bar */}
          <div className={'mt-6 max-w-lg'}>
            <div
              className={'flex items-center gap-2 text-[11px] font-mono tabular-nums text-white/70'}
            >
              <span>{fmtElapsed(playedPosition)}</span>
              <div className={'flex-1 h-1.5 rounded-full bg-surface/20 overflow-hidden'}>
                <div
                  className={'h-full bg-surface rounded-full transition-all'}
                  style={{ width: `${progress * 100}%` }}
                  aria-hidden="true"
                />
              </div>
              <span>{fmtElapsed(episode.duration_seconds)}</span>
            </div>
          </div>

          <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
            <Link
              to={`/episodes/${episode.id}`}
              className={
                'inline-flex items-center gap-2 px-7 py-3.5 mt-6 font-semibold text-[15px] bg-surface text-on-surface rounded-full hover:bg-surface/90 transition-colors shadow-lg shadow-black/10'
              }
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                play_arrow
              </span>
              {hasResume
                ? t(
                    'episodeHeroCard.resumeCta',
                    { time: fmtDuration(remaining) },
                    { defaultValue: 'Resume · {{time}} left' },
                  )
                : t(
                    'episodeHeroCard.playCta',
                    { time: fmtDuration(episode.duration_seconds) },
                    { defaultValue: 'Play · {{time}}' },
                  )}
            </Link>
            <Link
              to={`/shows/${episode.show_id}`}
              className={
                'inline-flex items-center gap-2 px-7 py-3.5 mt-6 font-semibold text-[15px] rounded-full border border-surface/30 hover:bg-surface/10 transition-colors'
              }
            >
              {t('episodeHeroCard.viewShowCta', {}, { defaultValue: 'View show' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </div>

        {/* Right: stylized cover with play glyph */}
        <div className={'lg:col-span-5 flex justify-center lg:justify-end'}>
          <div className="relative">
            <div
              className={
                'w-56 h-56 lg:w-64 lg:h-64 rounded-2xl shadow-2xl shadow-black/30 flex items-center justify-center'
              }
              style={{ background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)' }}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-[120px] text-white/90">
                graphic_eq
              </span>
            </div>
            <div
              className={
                'absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-surface shadow-xl flex items-center justify-center'
              }
            >
              <span className="material-symbols-outlined text-[36px] text-on-surface">
                play_arrow
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
