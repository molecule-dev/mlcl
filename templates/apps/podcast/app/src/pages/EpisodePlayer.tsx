import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { play, seekTo } from '../lib/player.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Episode {
  id: string
  show_id: string
  show_title: string
  title: string
  description: string
  audio_url: string | null
  duration_seconds: number
  played_position: number
  published_at: string
  cover_index: number
  transcript: string
}

interface Chapter {
  id: string
  episode_id: string
  title: string
  start_seconds: number
}

const TABS = ['transcript', 'chapters', 'about'] as const
type Tab = (typeof TABS)[number]

export function EpisodePlayer() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id = '' } = useParams<{ id: string }>()
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [tab, setTab] = useState<Tab>('chapters')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([http.get(`/api/episodes/${id}`), http.get(`/api/chapters?episode_id=${id}`)])
      .then(([e, c]) => {
        if (cancelled) return
        setEpisode(unwrapSingle<Episode>(e))
        setChapters(unwrapList<Chapter>(c))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('episodePlayer.loadError', {}, { defaultValue: 'Failed to load episode.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  if (!episode)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('episodePlayer.notFound', {}, { defaultValue: 'Episode not found.' })}
      </p>
    )

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <Link
        to={`/shows/${episode.show_id}`}
        className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'hover:text-on-surface')}
      >
        ← {t('episodePlayer.backLink', { show: episode.show_title }, { defaultValue: '{{show}}' })}
      </Link>

      <header className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
        <div
          className={cm.cn(cm.h(40), cm.w(40), 'rounded shadow-xl shrink-0')}
          style={{ background: `var(--color-cover-${episode.cover_index})` }}
          aria-hidden="true"
        />
        <div className={cm.flex1}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'text-on-surface-variant',
              cm.fontWeight('medium'),
              'uppercase tracking-wider',
            )}
          >
            {episode.show_title}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
            {episode.title}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 2))}>
            {fmt(episode.duration_seconds)} · {new Date(episode.published_at).toLocaleDateString()}
          </p>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 4))}>
            <button
              type="button"
              data-testid="episode-play"
              onClick={() =>
                void play({
                  episode_id: episode.id,
                  show_id: episode.show_id,
                  episode_title: episode.title,
                  show_title: episode.show_title,
                  audio_url: episode.audio_url,
                  duration_seconds: episode.duration_seconds,
                  cover_index: episode.cover_index,
                  start_at: episode.played_position ?? 0,
                })
              }
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                'rounded-full bg-primary text-on-primary font-semibold',
              )}
            >
              {t('episodePlayer.playButton', {}, { defaultValue: 'Play episode' })}
            </button>
            <button
              type="button"
              data-testid="episode-add-queue"
              onClick={() => {
                void fetch('/api/queue', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ episode_id: episode.id }),
                })
              }}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-full border border-outline text-sm font-medium',
              )}
            >
              {t('episodePlayer.addToQueue', {}, { defaultValue: 'Add to queue' })}
            </button>
          </div>
        </div>
      </header>

      <nav
        aria-label={t('episodePlayer.tabsLabel', {}, { defaultValue: 'Episode tabs' })}
        className={cm.flex({ gap: 'md', align: 'center' }) + ' border-b border-outline-variant'}
      >
        {TABS.map((s) => {
          const active = tab === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => setTab(s)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'border-b-2',
                active
                  ? 'border-primary text-primary'
                  : cm.cn('border-transparent', 'text-on-surface-variant'),
              )}
              aria-pressed={active}
            >
              {t(
                `episodePlayer.tab.${s}`,
                {},
                { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
              )}
            </button>
          )
        })}
      </nav>

      {tab === 'chapters' && (
        <div className={'space-y-1'}>
          {chapters.length === 0 ? (
            <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
              {t(
                'episodePlayer.noChapters',
                {},
                { defaultValue: 'No chapter markers for this episode.' },
              )}
            </p>
          ) : (
            <ul className={'space-y-1'}>
              {chapters.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      void play({
                        episode_id: episode.id,
                        show_id: episode.show_id,
                        episode_title: episode.title,
                        show_title: episode.show_title,
                        audio_url: episode.audio_url,
                        duration_seconds: episode.duration_seconds,
                        cover_index: episode.cover_index,
                        start_at: c.start_seconds,
                      })
                      seekTo(c.start_seconds)
                    }}
                    data-testid={`chapter-jump-${i}`}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'md' }),
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'block w-full rounded text-left hover:bg-surface-container',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-on-surface-variant',
                        'w-8 text-right shrink-0 font-mono',
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className={cm.cn(cm.flex1, cm.textSize('sm'), cm.fontWeight('medium'))}>
                      {c.title}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                        'shrink-0 font-mono',
                      )}
                    >
                      {fmt(c.start_seconds)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'transcript' && (
        <div className={cm.cn(cm.card(), cm.sp('p', 6))}>
          <p className={cm.cn(cm.textSize('sm'), 'whitespace-pre-wrap leading-relaxed')}>
            {episode.transcript}
          </p>
        </div>
      )}

      {tab === 'about' && (
        <div className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}>
          <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed')}>{episode.description}</p>
        </div>
      )}
    </div>
  )
}
