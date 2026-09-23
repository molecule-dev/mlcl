import { useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Message {
  id: string
  thread_id: string
  from_id: string
  from_name: string
  from_role: 'doctor' | 'nurse' | 'patient' | 'admin'
  preview: string
  body: string
  unread: boolean
  created_at: string
}

const ROLE_COLOR: Record<Message['from_role'], string> = {
  doctor: 'var(--color-role-doctor)',
  nurse: 'var(--color-role-nurse)',
  patient: 'var(--color-role-patient)',
  admin: 'var(--color-role-admin)',
}

export function Messages() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Message[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/messages')
      .then((res) => {
        if (cancelled) return
        const items = unwrapList<Message>(res)
        setList(items)
        if (!selectedId && items.length > 0) setSelectedId(items[0]!.id)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedId intentionally omitted: only pre-selects the first item on initial load, not on every selection change
  }, [http, t, refreshKey])

  const selected = useMemo(() => list.find((m) => m.id === selectedId), [list, selectedId])

  const sendReply = async (): Promise<void> => {
    const body = reply.trim()
    if (!body || sending) return
    setSending(true)
    setError(null)
    try {
      await http.post('/api/messages', {
        body,
        ...(selected ? { thread_id: selected.thread_id } : {}),
      })
      // Domain event — thread id only, never message content (health data).
      track({
        name: 'message.sent',
        properties: { thread_id: selected?.thread_id },
      })
      setReply('')
      setRefreshKey((k) => k + 1)
    } catch (_error) {
      // send failure; error is shown via setError UI state
      setError(t('messages.sendError', {}, { defaultValue: 'Failed to send. Try again.' }))
    } finally {
      setSending(false)
    }
  }

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto)}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('messages.eyebrow', {}, { defaultValue: 'Secure inbox' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.messages', {}, { defaultValue: 'Messages' })}
        </h1>
        {list.length > 0
          ? (() => {
              const unread = list.filter((m) => m.unread).length
              return (
                <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 4))}>
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      cm.roundedFull,
                      'bg-primary-container text-primary uppercase tracking-wider',
                    )}
                  >
                    {t(
                      'common.countUnread',
                      { count: unread },
                      { defaultValue: '{{count}} unread' },
                    )}
                  </span>
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      cm.roundedFull,
                      'bg-success-light text-success uppercase tracking-wider',
                    )}
                  >
                    {t(
                      'messages.totalCount',
                      { count: list.length },
                      { defaultValue: '{{count}} total' },
                    )}
                  </span>
                </div>
              )
            })()
          : null}
      </header>

      <div
        className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 lg:grid-cols-12')}
        style={{ minHeight: '480px' }}
      >
        <aside
          className={cm.cn('col-span-1 lg:col-span-4', cm.card(), 'overflow-y-auto')}
          style={{ maxHeight: '600px' }}
        >
          <ul className="divide-y divide-outline-variant">
            {list.map((m) => {
              const isSelected = m.id === selectedId
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'block w-full text-left',
                      isSelected ? 'bg-primary-container' : 'hover:bg-surface-container',
                    )}
                  >
                    <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
                      <p
                        className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate')}
                      >
                        {m.from_name}
                      </p>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('medium'),
                          'shrink-0 uppercase tracking-wider',
                        )}
                        style={{ color: ROLE_COLOR[m.from_role] }}
                      >
                        {m.from_role}
                      </span>
                      {m.unread && (
                        <span
                          className={cm.cn(
                            cm.h(2),
                            cm.w(2),
                            'rounded-full bg-primary shrink-0 ml-auto',
                          )}
                          aria-label={t('status.unread', {}, { defaultValue: 'Unread' })}
                        />
                      )}
                    </div>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                        'truncate',
                        cm.sp('mt', 1),
                      )}
                    >
                      {m.preview}
                    </p>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                        cm.sp('mt', 1),
                      )}
                    >
                      {new Date(m.created_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        <main className={cm.cn('col-span-1 lg:col-span-8 space-y-3', cm.card(), cm.sp('p', 5))}>
          {selected ? (
            <>
              <header className={cm.cn(cm.sp('pb', 3), 'border-b border-outline-variant')}>
                <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
                  <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                    {selected.from_name}
                  </h2>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'uppercase tracking-wider',
                    )}
                    style={{ color: ROLE_COLOR[selected.from_role] }}
                  >
                    {selected.from_role}
                  </span>
                </div>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}>
                  {new Date(selected.created_at).toLocaleString()}
                </p>
              </header>
              <p
                className={cm.cn(cm.textSize('sm'), 'whitespace-pre-wrap')}
                style={{ minHeight: '160px' }}
              >
                {selected.body}
              </p>
              <div className={cm.cn(cm.sp('pt', 3), 'border-t border-outline-variant space-y-2')}>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={t(
                    'messages.replyPlaceholder',
                    {},
                    { defaultValue: 'Type a reply…' },
                  )}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'w-full border border-outline-variant rounded-md',
                  )}
                  rows={3}
                />
                <div className={cm.flex({ align: 'center', justify: 'end' })}>
                  <button
                    type="button"
                    onClick={() => {
                      void sendReply()
                    }}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'bg-primary text-on-primary rounded-md disabled:opacity-50',
                    )}
                    disabled={!reply.trim() || sending}
                  >
                    {sending
                      ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                      : t('messages.sendLabel', {}, { defaultValue: 'Send reply' })}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className={'space-y-3'}>
              <p className={cm.cn(cm.sp('py', 4), cm.textCenter, 'text-on-surface-variant')}>
                {list.length === 0
                  ? t(
                      'messages.startNew',
                      {},
                      {
                        defaultValue: 'Send a message to start a conversation with your care team.',
                      },
                    )
                  : t('messages.selectOne', {}, { defaultValue: 'Select a message on the left.' })}
              </p>
              {list.length === 0 ? (
                <>
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={t(
                      'messages.composePlaceholder',
                      {},
                      { defaultValue: 'Type your message…' },
                    )}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'w-full border border-outline-variant rounded-md',
                    )}
                    rows={4}
                  />
                  <div className={cm.flex({ align: 'center', justify: 'end' })}>
                    <button
                      type="button"
                      onClick={() => {
                        void sendReply()
                      }}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'bg-primary text-on-primary rounded-md disabled:opacity-50',
                      )}
                      disabled={!reply.trim() || sending}
                    >
                      {sending
                        ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                        : t('messages.sendNewLabel', {}, { defaultValue: 'Send message' })}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
