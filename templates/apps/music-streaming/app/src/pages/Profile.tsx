import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PlaylistGrid } from '../components/PlaylistGrid.js'
import { TrackTable } from '../components/TrackTable.js'
import { unwrapList } from '../lib/unwrap.js'

interface Track {
  id: string
  title: string
  artist: string
  artist_id: string
  album: string
  album_id: string
  duration_seconds: number
  cover_index: number
  liked: boolean
  play_count: number
}

interface Playlist {
  id: string
  title: string
  description: string
  cover_index: number
  track_count: number
  duration_minutes: number
  category: string
  created_by: string
  is_public: boolean
}

interface Artist {
  id: string
  name: string
  cover_index: number
  monthly_listeners: number
  followers: number
  followed: boolean
  genres: string[]
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
  'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
]

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<{ name?: string | null }>()
  const { handle = 'me' } = useParams<{ handle: string }>()
  const [tracks, setTracks] = useState<Track[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/tracks'),
      http.get('/api/playlists?user=me'),
      http.get('/api/artists'),
    ])
      .then(([tr, pl, ar]) => {
        if (cancelled) return
        setTracks(unwrapList<Track>(tr))
        setPlaylists(unwrapList<Playlist>(pl))
        setArtists(unwrapList<Artist>(ar))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('nav.failedToLoadProfile', {}, { defaultValue: 'Failed to load profile.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const topTracks = useMemo(
    () => [...tracks].sort((a, b) => b.play_count - a.play_count).slice(0, 5),
    [tracks],
  )
  const publicPlaylists = useMemo(
    () => playlists.filter((p) => p.is_public).slice(0, 4),
    [playlists],
  )
  const followedArtists = useMemo(() => artists.filter((a) => a.followed).slice(0, 6), [artists])

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (_error) {
      // clipboard unavailable (permissions / insecure context) — nothing to surface
    }
  }

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('nav.loadingProfile', {}, { defaultValue: 'Loading profile…' })}
      </p>
    )

  const displayName =
    handle === 'me' ? user?.name || t('profile.you', {}, { defaultValue: 'You' }) : handle
  const handleLabel = `@${handle}`

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-10')}>
      {/* Profile hero */}
      <section
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] text-white p-8 md:p-10 shadow-2xl shadow-on-surface/10',
        )}
        style={{
          background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #be185d 100%)',
          minHeight: '260px',
        }}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'absolute right-12 top-12 w-24 h-24 rounded-full bg-foreground/10 blur-2xl',
          )}
          aria-hidden="true"
        />

        <div
          className={cm.cn(
            'relative z-10 flex flex-col md:flex-row items-start md:items-end gap-6',
          )}
        >
          <div
            className={cm.cn(
              'w-32 h-32 md:w-40 md:h-40 rounded-full shrink-0 flex items-center justify-center text-5xl md:text-6xl font-extrabold shadow-2xl shadow-black/30',
            )}
            style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
            aria-hidden="true"
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className={cm.cn('flex-1 min-w-0')}>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
              {t('profile.publicProfile', {}, { defaultValue: 'Public profile' })}
            </p>
            <h1
              className={cm.cn(
                'text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mt-1 leading-[1.05]',
              )}
            >
              {displayName}
            </h1>
            <p className={cm.cn('text-sm text-white/80 font-mono mt-1')}>{handleLabel}</p>
            <div className={cm.cn('flex items-center gap-5 mt-4 text-sm text-white/90')}>
              <span>
                <span className="font-extrabold tabular-nums">{followedArtists.length}</span>{' '}
                {t('profile.artistsFollowed', {}, { defaultValue: 'artists followed' })}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <span className="font-extrabold tabular-nums">{publicPlaylists.length}</span>{' '}
                {t('profile.publicPlaylists', {}, { defaultValue: 'public playlists' })}
              </span>
            </div>
            <div className={cm.cn('flex items-center gap-3 mt-5')}>
              <button
                type="button"
                onClick={() => {
                  void handleShare()
                }}
                className={cm.cn(
                  'px-6 py-2.5 rounded-full text-sm font-bold border border-surface/30 text-white hover:bg-surface/10 transition-colors',
                )}
              >
                {copied
                  ? t('profile.linkCopied', {}, { defaultValue: 'Link copied' })
                  : t('common.share', {}, { defaultValue: 'Share' })}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={cm.cn('space-y-4')}>
        <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
          {t('profile.topTracksHeading', {}, { defaultValue: 'Top tracks this month' })}
        </h2>
        <TrackTable tracks={topTracks} showAlbum showLiked={false} />
      </section>

      {publicPlaylists.length > 0 && (
        <section className={cm.cn('space-y-4')}>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('profile.publicPlaylistsHeading', {}, { defaultValue: 'Public playlists' })}
          </h2>
          <PlaylistGrid playlists={publicPlaylists} />
        </section>
      )}

      {followedArtists.length > 0 && (
        <section className={cm.cn('space-y-4')}>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('common.following', {}, { defaultValue: 'Following' })}
          </h2>
          <ul
            className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6')}
          >
            {followedArtists.map((a) => {
              const gradient = COVER_GRADIENTS[a.cover_index % COVER_GRADIENTS.length]
              return (
                <li key={a.id}>
                  <Link
                    to={`/artists/${a.id}`}
                    className={cm.cn(
                      'block bg-surface-container-lowest rounded-2xl p-4 text-center hover:shadow-lg transition-all hover:-translate-y-0.5 group',
                    )}
                  >
                    <div
                      className={cm.cn(
                        'w-20 h-20 mx-auto rounded-full flex items-center justify-center',
                      )}
                      style={{ background: gradient }}
                      aria-hidden="true"
                    >
                      <span
                        className={cm.cn(
                          'material-symbols-outlined text-[28px] text-white/80 group-hover:scale-110 transition-transform',
                        )}
                      >
                        person
                      </span>
                    </div>
                    <p
                      className={cm.cn(
                        'mt-3 text-sm font-extrabold tracking-tight truncate group-hover:text-primary transition-colors',
                      )}
                    >
                      {a.name}
                    </p>
                    <p className="text-[11px] text-on-surface-variant tabular-nums">
                      {(a.monthly_listeners / 1_000_000).toFixed(1)}M{' '}
                      {t('profile.monthlyListenersShort', {}, { defaultValue: 'monthly' })}
                    </p>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
