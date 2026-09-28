import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList } from '../lib/unwrap.js'

interface MessageThread {
  id: string
  listing_id: string | null
  listing_title: string | null
  thumbnail_url?: string | null
  other_party_name: string | null
  other_party_photo: string | null
  other_party_is_host: boolean
  last_message: string | null
  last_message_at: string | null
  unread: boolean
}

function fmtTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 86400000)
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (diff < 7 * 86400000) return d.toLocaleDateString(undefined, { weekday: 'short' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Messages() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [threads, setThreads] = useState<MessageThread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/messages/threads')
      .then((res) => {
        if (!cancelled) setThreads(unwrapList<MessageThread>(res.data))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('messages.loadError', {}, { defaultValue: 'Failed to load messages.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.cn(cm.sp('mb', 6))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary-dark',
          )}
        >
          {t('messages.eyebrow', {}, { defaultValue: 'Conversations' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('extrabold'),
            cm.sp('mt', 2),
            'leading-tight tracking-tight',
          )}
          style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
        >
          {t('nav.messages', {}, { defaultValue: 'Messages' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'messages.subheading',
            {},
            { defaultValue: 'Keep every host conversation in one calm thread.' },
          )}
        </p>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={cm.cn('h-20 rounded-2xl bg-surface-container animate-pulse')} />
          ))}
        </div>
      ) : threads.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('py', 20),
            cm.textCenter,
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          )}
        >
          <span
            className="material-symbols-outlined text-6xl text-on-surface-variant"
            aria-hidden="true"
          >
            forum
          </span>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('messages.empty', {}, { defaultValue: 'No conversations yet.' })}
          </p>
        </div>
      ) : (
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {threads.map((thread) => (
            <li key={thread.id}>
              <Link
                to={`/messages/${thread.id}`}
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({ align: 'center', gap: 'md' }),
                  'group block bg-surface rounded-2xl shadow-sm hover:shadow-md transition-all',
                  cm.accentCard({ tone: 'custom' }),
                )}
                style={{
                  ['--mol-accent' as string]: thread.unread ? 'var(--color-accent)' : 'transparent',
                }}
              >
                <div className="relative shrink-0">
                  {thread.other_party_photo ? (
                    <img
                      src={thread.other_party_photo}
                      alt=""
                      className={cm.cn(cm.roundedFull, 'w-12 h-12 object-cover')}
                    />
                  ) : (
                    <div
                      className={cm.cn(
                        cm.roundedFull,
                        'w-12 h-12 bg-surface-container flex items-center justify-center text-on-surface-variant',
                      )}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        person
                      </span>
                    </div>
                  )}
                  {thread.thumbnail_url ? (
                    <img
                      src={thread.thumbnail_url}
                      alt=""
                      className={cm.cn(
                        cm.roundedFull,
                        'w-7 h-7 object-cover absolute -right-1 -bottom-1 ring-2 ring-surface',
                      )}
                    />
                  ) : null}
                </div>
                <div className={'flex-1 min-w-0'}>
                  <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                    <p
                      className={cm.cn(cm.fontWeight('bold'), 'truncate')}
                      style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
                    >
                      {thread.other_party_name ??
                        t(
                          'messages.anonName',
                          { appName: APP_NAME },
                          { defaultValue: '{{appName}} member' },
                        )}
                    </p>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant tabular-nums shrink-0',
                      )}
                    >
                      {fmtTime(thread.last_message_at)}
                    </span>
                  </div>
                  {thread.listing_title ? (
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'uppercase tracking-widest text-primary-dark',
                      )}
                    >
                      {thread.listing_title}
                    </p>
                  ) : null}
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.sp('mt', 1),
                      'text-on-surface-variant truncate',
                      thread.unread ? 'font-semibold text-on-surface' : '',
                    )}
                  >
                    {thread.last_message ?? ''}
                  </p>
                </div>
                {thread.unread ? (
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'shrink-0 rounded-full bg-accent text-on-primary tabular-nums uppercase tracking-widest',
                    )}
                  >
                    {t('status.new', {}, { defaultValue: 'New' })}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
