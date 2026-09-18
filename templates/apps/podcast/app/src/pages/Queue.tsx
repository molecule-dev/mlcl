import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { play } from '../lib/player.js'
import { unwrapList } from '../lib/unwrap.js'

interface QueueItem {
  id: string
  episode_id: string
  position: number
  episode_title: string
  show_title: string
  show_id?: string | null
  duration_seconds: number
  audio_url: string | null
  cover_index?: number
}

export function Queue() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/queue')
      .then((res) => {
        if (!cancelled) setItems(unwrapList<QueueItem>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('queue.loadError', {}, { defaultValue: 'Failed to load queue.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const handleClear = async () => {
    await fetch('/api/queue', { method: 'DELETE', credentials: 'include' })
    setItems([])
  }
  const handleRemove = async (id: string) => {
    await fetch(`/api/queue/${id}`, { method: 'DELETE', credentials: 'include' })
    setItems((cur) => cur.filter((i) => i.id !== id))
  }
  const handlePlay = (it: QueueItem) => {
    void play({
      episode_id: it.episode_id,
      show_id: it.show_id ?? null,
      episode_title: it.episode_title,
      show_title: it.show_title,
      audio_url: it.audio_url,
      duration_seconds: it.duration_seconds,
      cover_index: it.cover_index ?? 0,
    })
  }

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('queue.eyebrow', {}, { defaultValue: 'Listening queue' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('status.upNext', {}, { defaultValue: 'Up next' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {(() => {
              const totalSec = items.reduce((s, x) => s + (x.duration_seconds ?? 0), 0)
              const hours = Math.floor(totalSec / 3600)
              const mins = Math.floor((totalSec % 3600) / 60)
              return t(
                'queue.subheadingWithTime',
                { count: items.length, hours, mins },
                { defaultValue: '{{count}} episodes · {{hours}}h {{mins}}m of listening' },
              )
            })()}
          </p>
        </div>
        <button
          type="button"
          data-testid="queue-clear"
          onClick={() => void handleClear()}
          disabled={items.length === 0}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'border border-outline-variant rounded-md disabled:opacity-50',
          )}
        >
          {t('queue.clearLabel', {}, { defaultValue: 'Clear queue' })}
        </button>
      </header>

      {items.length === 0 ? (
        <p
          className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}
          data-testid="queue-empty"
        >
          {t(
            'queue.empty',
            {},
            { defaultValue: 'Your queue is empty. Add episodes from any show page.' },
          )}
        </p>
      ) : (
        <ul className={'space-y-1'} data-testid="queue-list">
          {items.map((it) => (
            <li key={it.id}>
              <QueueRow
                item={it}
                onPlay={() => handlePlay(it)}
                onRemove={() => void handleRemove(it.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function QueueRow({
  item,
  onPlay,
  onRemove,
}: {
  item: QueueItem
  onPlay: () => void
  onRemove: () => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('px', 3),
        cm.sp('py', 2),
        cm.flex({ align: 'center', gap: 'md' }),
        'rounded hover:bg-surface-container',
      )}
    >
      <div
        className={cm.cn(cm.h(11), cm.w(11), 'rounded shrink-0')}
        style={{ background: `var(--color-cover-${item.cover_index ?? 0})` }}
        aria-hidden="true"
      />
      <div className={cm.cn(cm.flex1, 'min-w-0')}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate')}>
          {item.episode_title}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'truncate')}>
          {item.show_title}
        </p>
      </div>
      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'shrink-0 font-mono')}>
        {Math.floor((item.duration_seconds ?? 0) / 60)}:
        {((item.duration_seconds ?? 0) % 60).toString().padStart(2, '0')}
      </span>
      <button
        type="button"
        data-testid="queue-row-play"
        onClick={onPlay}
        className={cm.cn(
          cm.sp('px', 2),
          cm.sp('py', 1),
          cm.textSize('xs'),
          cm.fontWeight('medium'),
          'rounded border border-outline-variant',
        )}
      >
        {t('common.play', {}, { defaultValue: 'Play' })}
      </button>
      <button
        type="button"
        data-testid="queue-row-remove"
        onClick={onRemove}
        aria-label={t('queue.removeAria', {}, { defaultValue: 'Remove from queue' })}
        className={cm.cn(
          cm.sp('px', 2),
          cm.sp('py', 1),
          cm.textSize('xs'),
          'rounded text-on-surface-variant hover:text-error',
        )}
      >
        ×
      </button>
    </div>
  )
}
