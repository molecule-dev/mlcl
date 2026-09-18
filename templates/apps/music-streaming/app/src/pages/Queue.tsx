import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface QueueItem {
  id: string
  position: number
  title: string
  artist: string
  album: string
  duration_seconds: number
  cover_index: number
  origin: 'now_playing' | 'next_up' | 'queue'
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

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )

  const nowPlaying = items.find((i) => i.origin === 'now_playing')
  const nextUp = items.filter((i) => i.origin === 'next_up')
  const queued = items.filter((i) => i.origin === 'queue')

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('queue.heading', {}, { defaultValue: 'Queue' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'queue.subheading',
              { count: items.length },
              { defaultValue: '{{count}} tracks queued up' },
            )}
          </p>
        </div>
        <button
          type="button"
          data-testid="queue-clear"
          onClick={async () => {
            const ok = await http
              .delete('/api/queue')
              .then(() => true)
              .catch(() => false)
            if (ok) setItems([])
          }}
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

      {items.length === 0 && (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('queue.empty', {}, { defaultValue: 'Your queue is empty.' })}
        </p>
      )}

      {nowPlaying && (
        <section className={cm.cn('space-y-2')}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
              'uppercase tracking-wider',
            )}
          >
            {t('queue.nowPlayingHeading', {}, { defaultValue: 'Now playing' })}
          </h2>
          <QueueRow item={nowPlaying} active />
        </section>
      )}

      {nextUp.length > 0 && (
        <section className={cm.cn('space-y-2')}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
              'uppercase tracking-wider',
            )}
          >
            {t('queue.nextUpHeading', {}, { defaultValue: 'Next up' })}
          </h2>
          <ul className={cm.cn('space-y-1')}>
            {nextUp.map((it) => (
              <li key={it.id}>
                <QueueRow item={it} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {queued.length > 0 && (
        <section className={cm.cn('space-y-2')}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
              'uppercase tracking-wider',
            )}
          >
            {t('queue.queuedHeading', {}, { defaultValue: 'Coming up' })}
          </h2>
          <ul className={cm.cn('space-y-1')}>
            {queued.map((it) => (
              <li key={it.id}>
                <QueueRow item={it} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function QueueRow({ item, active }: { item: QueueItem; active?: boolean }) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('px', 3),
        cm.sp('py', 2),
        cm.flex({ align: 'center', gap: 'md' }),
        'rounded hover:bg-surface-container',
        active ? 'bg-primary-container/30' : '',
      )}
    >
      <div
        className={cm.cn(cm.h(10), cm.w(10), 'rounded shrink-0')}
        style={{ background: `var(--color-cover-${item.cover_index})` }}
        aria-hidden="true"
      />
      <div className={cm.cn(cm.flex1, 'min-w-0')}>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'truncate',
            active ? cm.textPrimary : '',
          )}
        >
          {item.title}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'truncate')}>
          {item.artist} · {item.album}
        </p>
      </div>
      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'shrink-0 font-mono')}>
        {Math.floor(item.duration_seconds / 60)}:
        {(item.duration_seconds % 60).toString().padStart(2, '0')}
      </span>
    </div>
  )
}
