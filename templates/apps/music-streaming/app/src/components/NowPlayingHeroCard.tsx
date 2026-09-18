import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface NowPlayingTrack {
  id: string
  title: string
  artist: string
  artist_id: string
  album: string
  album_id: string
  duration_seconds: number
  cover_index: number
  liked: boolean
  play_count?: number
}

interface NowPlayingHeroCardProps {
  /** Currently-playing or featured track. `null` renders a calm idle state. */
  track: NowPlayingTrack | null
  /** Seconds elapsed in the current track. */
  elapsedSeconds?: number
  /** Optional eyebrow ("Now playing", "Made for you", etc.). */
  eyebrow?: string
  /** Optional listening-streak label rendered as an overlay pill. */
  streakLabel?: string
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #c2410c 100%)',
  'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)',
  'linear-gradient(135deg, #ec4899 0%, #be185d 50%, #9d174d 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 50%, #5b21b6 100%)',
  'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #c026d3 100%)',
]

function fmtElapsed(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function fmtPlays(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

/**
 * Cinematic full-bleed hero card — left column has eyebrow + huge track
 * title + artist link + scrubber + Play / View album CTA pair, right
 * column has a frosted-glass square with a Material `graphic_eq` glyph
 * and a floating play disk.
 *
 * Translated from podcast's EpisodeHeroCard.tsx and recoloured per
 * Reverb's dark-violet/rose cover gradient palette.
 */
export function NowPlayingHeroCard({
  track,
  elapsedSeconds = 0,
  eyebrow,
  streakLabel,
}: NowPlayingHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (!track) {
    return (
      <section
        className={cm.cn('relative overflow-hidden rounded-[2rem] text-white shadow-2xl')}
        style={{ background: COVER_GRADIENTS[6], minHeight: '320px' }}
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
            {t('nowPlayingHeroCard.idleEyebrow', {}, { defaultValue: 'Nothing in the queue' })}
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight">
            {t('nowPlayingHeroCard.idleHeadline', {}, { defaultValue: 'Pick something to play' })}
          </h2>
        </div>
      </section>
    )
  }

  const progress =
    track.duration_seconds > 0 ? Math.min(1, elapsedSeconds / track.duration_seconds) : 0
  const gradient = COVER_GRADIENTS[track.cover_index % COVER_GRADIENTS.length]
  const headerEyebrow =
    eyebrow ?? t('nowPlayingHeroCard.defaultEyebrow', {}, { defaultValue: 'Now playing' })

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
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">
              {track.album}
            </span>
            {streakLabel && (
              <span
                className={cm.cn(
                  'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface/20 backdrop-blur-md',
                )}
              >
                {streakLabel}
              </span>
            )}
          </div>

          <h2
            className={cm.cn(
              'text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05] mt-4',
            )}
          >
            {track.title}
          </h2>
          <Link
            to={`/artists/${track.artist_id}`}
            className={cm.cn(
              'text-base md:text-lg text-white/85 leading-relaxed mt-3 inline-block hover:underline decoration-2 underline-offset-4',
            )}
          >
            {track.artist}
          </Link>

          <div className={cm.cn('mt-6 max-w-lg')}>
            <div
              className={cm.cn(
                'flex items-center gap-2 text-[11px] font-mono tabular-nums text-white/70',
              )}
            >
              <span>{fmtElapsed(elapsedSeconds)}</span>
              <div className={cm.cn('flex-1 h-1.5 rounded-full bg-surface/20 overflow-hidden')}>
                <div
                  className={cm.cn('h-full bg-surface rounded-full transition-all')}
                  style={{ width: `${progress * 100}%` }}
                  aria-hidden="true"
                />
              </div>
              <span>{fmtElapsed(track.duration_seconds)}</span>
            </div>
            {typeof track.play_count === 'number' && (
              <p className={cm.cn('text-[11px] text-white/70 font-medium mt-2')}>
                {t(
                  'nowPlayingHeroCard.playCount',
                  { plays: fmtPlays(track.play_count) },
                  { defaultValue: '{{plays}} plays' },
                )}
              </p>
            )}
          </div>

          <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
            <Link
              to="/now-playing"
              className={cm.cn(
                'inline-flex items-center gap-2 px-7 py-3.5 mt-6 font-semibold text-[15px] bg-surface text-on-surface rounded-full hover:bg-surface/90 transition-colors shadow-lg shadow-black/10',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                play_arrow
              </span>
              {t('nowPlayingHeroCard.playCta', {}, { defaultValue: 'Open player' })}
            </Link>
            <Link
              to={`/albums/${track.album_id}`}
              className={cm.cn(
                'inline-flex items-center gap-2 px-7 py-3.5 mt-6 font-semibold text-[15px] rounded-full border border-surface/30 hover:bg-surface/10 transition-colors',
              )}
            >
              {t('nowPlayingHeroCard.viewAlbumCta', {}, { defaultValue: 'View album' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </div>

        <div className={cm.cn('lg:col-span-5 flex justify-center lg:justify-end')}>
          <div className="relative">
            <div
              className={cm.cn(
                'w-56 h-56 lg:w-64 lg:h-64 rounded-2xl shadow-2xl shadow-black/30 flex items-center justify-center',
              )}
              style={{ background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)' }}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-[120px] text-white/90">
                graphic_eq
              </span>
            </div>
            <div
              className={cm.cn(
                'absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-surface shadow-xl flex items-center justify-center',
              )}
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
