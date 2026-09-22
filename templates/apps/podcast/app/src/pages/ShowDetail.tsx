import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { play } from '../lib/player.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Show {
  id: string
  title: string
  publisher: string
  description: string
  cover_index: number
  category: string
  episodes_count: number
  rating: number
  subscribed: boolean
  language: string
  website: string
}

interface Episode {
  id: string
  show_id: string
  title: string
  description: string
  audio_url: string | null
  duration_seconds: number
  published_at: string
  played_position: number
  played: boolean
  cover_index: number
}

export function ShowDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id = '' } = useParams<{ id: string }>()
  const [show, setShow] = useState<Show | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [subscribed, setSubscribed] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/shows/${id}`),
      http.get(`/api/episodes?show_id=${id}`),
      http.get(`/api/subscriptions/status/${id}`).catch(() => ({ data: { subscribed: false } })),
    ])
      .then(([s, e, sub]) => {
        if (cancelled) return
        setShow(unwrapSingle<Show>(s))
        setEpisodes(unwrapList<Episode>(e))
        setSubscribed(Boolean(unwrapSingle<{ subscribed: boolean }>(sub)?.subscribed))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('showDetail.loadError', {}, { defaultValue: 'Failed to load show.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const handleSubscribe = async () => {
    if (!show || subscribing) return
    setSubscribing(true)
    try {
      const res =
        subscribed === true
          ? await fetch(`/api/subscriptions/${show.id}`, {
              method: 'DELETE',
              credentials: 'include',
            })
          : await fetch(`/api/subscriptions/${show.id}`, { method: 'POST', credentials: 'include' })
      if (res.ok) {
        const next = !subscribed
        setSubscribed(next)
        void track({
          name: 'subscribe.toggled',
          properties: { show_id: show.id, subscribed: next },
        })
      }
    } finally {
      setSubscribing(false)
    }
  }

  const handlePlayLatest = () => {
    if (!show || episodes.length === 0) return
    const latest = episodes[0]
    if (!latest) return
    void track({
      name: 'episode.played',
      properties: { episode_id: latest.id, show_id: show.id },
    })
    void play({
      episode_id: latest.id,
      show_id: show.id,
      episode_title: latest.title,
      show_title: show.title,
      audio_url: latest.audio_url,
      duration_seconds: latest.duration_seconds,
      cover_index: latest.cover_index,
      start_at: latest.played_position ?? 0,
    })
  }

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  if (!show)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('showDetail.notFound', {}, { defaultValue: 'Show not found.' })}
      </p>
    )

  return (
    <div className={cm.cn(cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6 px-4 sm:px-8')}>
      <header
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-lg flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6',
        )}
        style={{
          background: `var(--color-cover-${show.cover_index})`,
          color: 'white',
          minHeight: '240px',
        }}
      >
        <div
          className={cm.cn('h-28 w-28 rounded shadow-2xl shrink-0 sm:h-40 sm:w-40')}
          style={{ background: `var(--color-cover-${show.cover_index})` }}
          aria-hidden="true"
        />
        <div className={cm.flex1 + ' min-w-0'}>
          <p
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'uppercase tracking-wider')}
          >
            {t('showDetail.label', {}, { defaultValue: APP_NAME })}
          </p>
          <h1
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'text-3xl sm:text-5xl tracking-tight break-words',
            )}
          >
            {show.title}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), cm.sp('mt', 2))}
            style={{ opacity: 0.9 }}
          >
            {show.publisher} · {show.language} · {show.episodes_count}{' '}
            {t('showDetail.episodesLabel', {}, { defaultValue: 'episodes' })}
          </p>
        </div>
      </header>

      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.maxW('2xl'))}>
        {show.description}
      </p>

      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        <button
          type="button"
          data-testid="show-play-latest"
          onClick={handlePlayLatest}
          disabled={episodes.length === 0}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'rounded-full bg-primary text-on-primary disabled:opacity-50',
          )}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            play_arrow
          </span>
          {t('showDetail.playLatestLabel', {}, { defaultValue: 'Play latest' })}
        </button>
        <button
          type="button"
          data-testid="show-subscribe"
          onClick={handleSubscribe}
          disabled={subscribing}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-full border-2 border-outline-variant disabled:opacity-50',
          )}
        >
          {subscribed
            ? t('showDetail.subscribedLabel', {}, { defaultValue: '✓ Subscribed' })
            : t('showDetail.subscribeLabel', {}, { defaultValue: '+ Subscribe' })}
        </button>
      </div>

      {episodes.length === 0 ? (
        <p
          className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}
          data-testid="show-episodes-empty"
        >
          {t('showDetail.noEpisodes', {}, { defaultValue: 'No episodes published yet.' })}
        </p>
      ) : (
        <ul className={'space-y-2'}>
          {episodes.map((e) => {
            const progressPct =
              e.duration_seconds > 0
                ? Math.round((e.played_position / e.duration_seconds) * 100)
                : 0
            return (
              <li key={e.id}>
                <Link
                  to={`/episodes/${e.id}`}
                  className={cm.cn(
                    cm.card(),
                    cm.sp('p', 4),
                    cm.flex({ align: 'start', gap: 'md' }),
                    'hover:bg-surface-container',
                  )}
                >
                  <div
                    className={cm.cn(cm.h(11), cm.w(11), 'rounded shrink-0')}
                    style={{ background: `var(--color-cover-${e.cover_index})` }}
                    aria-hidden="true"
                  />
                  <div className={cm.cn(cm.flex1, 'min-w-0')}>
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate')}>
                      {e.title}
                    </p>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                        'line-clamp-2',
                        cm.sp('mt', 1),
                      )}
                    >
                      {e.description}
                    </p>
                    <div
                      className={cm.flex({ align: 'center', gap: 'sm' })}
                      style={{ marginTop: '8px' }}
                    >
                      <span
                        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'font-mono')}
                      >
                        {Math.floor(e.duration_seconds / 60)}:
                        {(e.duration_seconds % 60).toString().padStart(2, '0')}
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>·</span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {new Date(e.published_at).toLocaleDateString()}
                      </span>
                      {e.played_position > 0 && !e.played && (
                        <>
                          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                            ·
                          </span>
                          <span
                            className={cm.cn(
                              cm.textSize('xs'),
                              cm.textPrimary,
                              cm.fontWeight('medium'),
                            )}
                          >
                            {progressPct}% {t('showDetail.played', {}, { defaultValue: 'played' })}
                          </span>
                        </>
                      )}
                      {e.played && (
                        <>
                          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                            ·
                          </span>
                          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                            ✓ {t('showDetail.completed', {}, { defaultValue: 'Played' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
