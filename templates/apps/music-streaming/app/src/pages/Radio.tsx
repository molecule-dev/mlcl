import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type PlayerTrack, usePlayer } from '../lib/player.js'
import { unwrapList } from '../lib/unwrap.js'

interface Artist {
  id: string
  name: string
  bio: string
  cover_index?: number
  monthly_listeners: number
  genres?: string[]
}

interface GenreStation {
  key: string
  label: string
  description: string
  cover_index: number
  bpm: string
}

const GENRE_STATIONS: GenreStation[] = [
  {
    key: 'indie',
    label: 'Indie & Dream Pop',
    description: 'Reverb-soaked guitars + autobiographical lyrics.',
    cover_index: 4,
    bpm: '92–116 BPM',
  },
  {
    key: 'electro',
    label: 'Electronic Sunrise',
    description: 'Sunrise-set techno into Afrohouse, daybreak loops.',
    cover_index: 6,
    bpm: '120–128 BPM',
  },
  {
    key: 'lofi',
    label: 'Late Night Lo-Fi',
    description: 'Crackle, hush, and tape saturation for the slow hours.',
    cover_index: 3,
    bpm: '70–88 BPM',
  },
  {
    key: 'classic',
    label: 'Old Bones',
    description: 'Six decades of folk, blues, and Americana.',
    cover_index: 5,
    bpm: '80–110 BPM',
  },
  {
    key: 'workout',
    label: 'Workout Power',
    description: 'Heavy hip-hop and electronic for the gym.',
    cover_index: 2,
    bpm: '140–180 BPM',
  },
  {
    key: 'jazz',
    label: 'Velvet Hour Jazz',
    description: 'Smooth jazz, neo-soul, bossa nova for the table.',
    cover_index: 1,
    bpm: '78–104 BPM',
  },
]

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
  'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #1e1b4b 0%, #c026d3 100%)',
]

export function Radio() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const player = usePlayer()
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // A station is an endless shuffled mix seeded from the catalogue —
  // fetch the tracks on first play, then hand them to the shared player.
  const handlePlayStation = async (stationKey: string) => {
    const res = await http.get('/api/tracks').catch(() => null)
    if (!res) return
    const tracks = unwrapList<PlayerTrack>(res)
    if (tracks.length === 0) return
    // Deterministic-ish per-station rotation: offset by the station index
    // so different stations don't all start on the same track.
    const offset = GENRE_STATIONS.findIndex((g) => g.key === stationKey)
    const rotated = [...tracks.slice(offset), ...tracks.slice(0, offset)]
    const shuffled = rotated
      .map((trk) => ({ trk, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ trk }) => trk)
    if (!player.isShuffled) player.toggleShuffle()
    await player.playList(shuffled, 0)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/artists')
      .then((res) => {
        if (!cancelled) setArtists(unwrapList<Artist>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('radio.loadError', {}, { defaultValue: 'Failed to load radio.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-12')}>
      <header className={cm.cn('space-y-2')}>
        <p className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
          {t('radio.eyebrow', {}, { defaultValue: 'Always-on stations' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]')}>
          {t('radio.heading', {}, { defaultValue: 'Radio that keeps going' })}
        </h1>
        <p className={cm.cn('text-base text-on-surface-variant max-w-2xl')}>
          {t(
            'radio.subheading',
            {},
            {
              defaultValue:
                'Genre stations refreshed daily plus an artist-seeded radio for everyone you follow.',
            },
          )}
        </p>
      </header>

      <section className={cm.cn('space-y-4')}>
        <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
          {t('radio.genreHeading', {}, { defaultValue: 'Genre stations' })}
        </h2>
        <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
          {GENRE_STATIONS.map((g) => {
            const gradient = COVER_GRADIENTS[g.cover_index % COVER_GRADIENTS.length]
            return (
              <article
                key={g.key}
                className={cm.cn(
                  'relative overflow-hidden rounded-2xl text-white p-5 shadow-md hover:shadow-2xl transition-all hover:-translate-y-0.5',
                )}
                style={{ background: gradient, minHeight: '180px' }}
              >
                <div
                  className={cm.cn(
                    'absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-surface/10 blur-2xl',
                  )}
                  aria-hidden="true"
                />
                <div className={cm.cn('relative z-10 h-full flex flex-col justify-between gap-4')}>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                      {t('radio.station', {}, { defaultValue: 'Station' })}
                    </p>
                    <h3 className={cm.cn('text-xl font-extrabold tracking-tight mt-1')}>
                      {t(`radio.station.${g.key}.label`, {}, { defaultValue: g.label })}
                    </h3>
                    <p className={cm.cn('text-xs text-white/80 leading-relaxed mt-1 line-clamp-2')}>
                      {t(`radio.station.${g.key}.description`, {}, { defaultValue: g.description })}
                    </p>
                  </div>
                  <div className={cm.cn('flex items-center justify-between')}>
                    <span className="text-[10px] font-mono tabular-nums text-white/70">
                      {g.bpm}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        void handlePlayStation(g.key)
                      }}
                      className={cm.cn(
                        'w-11 h-11 rounded-full bg-surface text-on-surface flex items-center justify-center shadow-lg hover:scale-105 transition-transform',
                      )}
                      aria-label={t(
                        'radio.playStationAria',
                        { station: g.label },
                        { defaultValue: 'Play {{station}} station' },
                      )}
                    >
                      <span className="material-symbols-outlined text-[24px]">play_arrow</span>
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className={cm.cn('space-y-4')}>
        <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
          {t('radio.artistHeading', {}, { defaultValue: 'Artist radio' })}
        </h2>
        {loading ? (
          <p className={cm.cn(cm.sp('py', 8), 'text-on-surface-variant text-sm')}>
            {t('radio.loading', {}, { defaultValue: 'Loading artists…' })}
          </p>
        ) : (
          <ul
            className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4')}
          >
            {artists.slice(0, 8).map((a) => {
              const gradient = COVER_GRADIENTS[(a.cover_index ?? 1) % COVER_GRADIENTS.length]
              return (
                <li key={a.id}>
                  <Link
                    to={`/artists/${a.id}`}
                    className={cm.cn(
                      'flex items-center gap-3 p-3 rounded-2xl bg-surface-container-lowest hover:shadow-lg transition-all hover:-translate-y-0.5 group',
                    )}
                  >
                    <div
                      className={cm.cn(
                        'w-14 h-14 rounded-full shrink-0 flex items-center justify-center',
                      )}
                      style={{ background: gradient }}
                      aria-hidden="true"
                    >
                      <span
                        className={cm.cn(
                          'material-symbols-outlined text-[24px] text-white/70 group-hover:scale-110 transition-transform',
                        )}
                      >
                        radio
                      </span>
                    </div>
                    <div className={cm.cn('min-w-0 flex-1')}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                        {t('radio.artistRadioLabel', {}, { defaultValue: 'Artist radio' })}
                      </p>
                      <p
                        className={cm.cn(
                          'text-sm font-extrabold tracking-tight truncate group-hover:text-primary transition-colors',
                        )}
                      >
                        {a.name}
                      </p>
                      {a.genres && a.genres.length > 0 && (
                        <p className="text-[11px] text-on-surface-variant truncate">
                          {a.genres.slice(0, 2).join(' · ')}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
