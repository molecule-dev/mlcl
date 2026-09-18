import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { FeaturedAlbumsRow } from '../components/FeaturedAlbumsRow.js'
import { NowPlayingHeroCard } from '../components/NowPlayingHeroCard.js'
import { PlaylistGrid } from '../components/PlaylistGrid.js'
import { TrackTable } from '../components/TrackTable.js'
import { unwrapList } from '../lib/unwrap.js'

interface Playlist {
  id: string
  title: string
  description: string
  cover_index: number
  track_count: number
  duration_minutes: number
  category: 'made_for_you' | 'recently_played' | 'featured' | 'mood'
  created_by: string
}

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
  added_at: string
}

interface Album {
  id: string
  title: string
  artist: string
  artist_id: string
  year: number
  cover_index: number
  track_count: number
  duration_minutes: number
  description: string
  label: string
}

function greetingFor(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

export function Home() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([http.get('/api/playlists'), http.get('/api/tracks'), http.get('/api/albums')])
      .then(([p, ts, al]) => {
        if (cancelled) return
        setPlaylists(unwrapList<Playlist>(p))
        setTracks(unwrapList<Track>(ts))
        setAlbums(unwrapList<Album>(al))
      })
      .catch(() => {
        if (!cancelled) setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const heroTrack = useMemo(() => {
    if (tracks.length === 0) return null
    const sorted = [...tracks].sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0))
    return sorted[0]
  }, [tracks])

  const recentTracks = useMemo(() => {
    return [...tracks]
      .sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime())
      .slice(0, 6)
  }, [tracks])

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )

  const madeForYou = playlists.filter((p) => p.category === 'made_for_you')
  const recentlyPlayed = playlists.filter((p) => p.category === 'recently_played')
  const featured = playlists.filter((p) => p.category === 'featured')
  const moods = playlists.filter((p) => p.category === 'mood')
  const greeting = greetingFor(new Date().getHours())
  const featuredAlbums = albums.slice(0, 4)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-12')}>
      <header className={cm.cn('space-y-2')}>
        <p className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
          {t('status.today', {}, { defaultValue: 'Today' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]')}>
          {t(
            `home.greeting.${greeting}`,
            {},
            {
              defaultValue:
                greeting === 'morning'
                  ? 'Good morning'
                  : greeting === 'afternoon'
                    ? 'Good afternoon'
                    : 'Good evening',
            },
          )}
        </h1>
      </header>

      <NowPlayingHeroCard
        track={heroTrack}
        elapsedSeconds={heroTrack ? Math.floor(heroTrack.duration_seconds * 0.42) : 0}
        eyebrow={t('home.heroEyebrow', {}, { defaultValue: 'Picked for you' })}
      />

      {madeForYou.length > 0 && (
        <section className={cm.cn('space-y-4')}>
          <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
            <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
              {t('home.madeForYou', {}, { defaultValue: 'Made for you' })}
            </h2>
            <p className={cm.cn('text-xs text-on-surface-variant font-medium')}>
              {t('home.madeForYouSub', {}, { defaultValue: 'Refreshed daily by your taste' })}
            </p>
          </div>
          <PlaylistGrid playlists={madeForYou} />
        </section>
      )}

      <FeaturedAlbumsRow
        albums={featuredAlbums}
        title={t('home.newReleases', {}, { defaultValue: 'New releases for you' })}
        seeAllHref="/library"
      />

      <section className={cm.cn('space-y-4')}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('home.recentTracks', {}, { defaultValue: 'Picked from your recents' })}
          </h2>
        </div>
        <TrackTable tracks={recentTracks} showAlbum showAdded nowPlayingId={heroTrack?.id} />
      </section>

      {recentlyPlayed.length > 0 && (
        <section className={cm.cn('space-y-4')}>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('home.recentlyPlayed', {}, { defaultValue: 'Recently played' })}
          </h2>
          <PlaylistGrid playlists={recentlyPlayed} />
        </section>
      )}

      {featured.length > 0 && (
        <section className={cm.cn('space-y-4')}>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('home.featured', {}, { defaultValue: 'Featured editorial' })}
          </h2>
          <PlaylistGrid playlists={featured} trendingId={featured[0]?.id} />
        </section>
      )}

      {moods.length > 0 && (
        <section className={cm.cn('space-y-4')}>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('home.moods', {}, { defaultValue: 'Moods & moments' })}
          </h2>
          <PlaylistGrid playlists={moods} />
        </section>
      )}
    </div>
  )
}
