import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import { getRealtimeConnection } from '../lib/realtime.js'

type ThreadRow = {
  id: string
  user_a_id: string
  user_b_id: string
  peer_id?: string
  peer_name?: string
  last_message_at?: string
  last_message_body?: string | null
}

type MessageRow = {
  id: string
  sender_id: string
  thread_id: string
  body: string
  created_at?: string
}

function relativeTime(iso?: string): string {
  if (!iso) return ''
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return ''
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatMessageTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (sameDay) return time
  return d.toLocaleDateString(undefined, { weekday: 'short' }) + ' ' + time
}

export function Messages() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserProfile>()
  const [params] = useSearchParams()
  const [threads, setThreads] = useState<ThreadRow[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const currentUserId = user?.id ?? null

  // Load threads + optionally start a new one if ?with=<userId>
  useEffect(() => {
    let active = true
    setLoading(true)
    setErrorMessage(null)

    const withUser = params.get('with')
    const fetchThreads = async (): Promise<ThreadRow[]> => {
      const res = await http.get<ThreadRow[]>('/api/messages/threads')
      const data = (res as { data?: ThreadRow[] | null }).data
      return Array.isArray(data) ? data : []
    }

    ;(async () => {
      try {
        let list = await fetchThreads()
        if (!active) return
        if (withUser) {
          const existing = list.find(
            (th) =>
              th.user_a_id === withUser || th.user_b_id === withUser || th.peer_id === withUser,
          )
          if (existing) {
            setActiveId(existing.id)
          } else {
            const created = (await http.post<ThreadRow>('/api/messages/threads', {
              recipient_id: withUser,
            })) as { data?: ThreadRow | null }
            if (!active) return
            if (created.data?.id) {
              list = await fetchThreads()
              if (!active) return
              setActiveId(created.data.id)
            }
          }
        } else if (list.length > 0 && !activeId) {
          setActiveId(list[0]!.id)
        }
        if (!active) return
        setThreads(list)
        setLoading(false)
      } catch (err) {
        if (!active) return
        setErrorMessage(
          (err as { message?: string }).message ??
            t(
              'messages.error.loadThreads',
              {},
              { defaultValue: 'Could not load message threads.' },
            ),
        )
        setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [http, params, t]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load messages whenever active thread changes
  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    let active = true
    http
      .get<MessageRow[]>(`/api/messages/threads/${activeId}/messages`)
      .then((res) => {
        if (!active) return
        const data = (res as { data?: MessageRow[] | null }).data
        setMessages(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!active) return
        setMessages([])
      })
    return () => {
      active = false
    }
  }, [http, activeId])

  // Live chat: append peer messages from the active thread's room. Dedupe by id
  // so our OWN optimistic append (the send handler already pushes the sent
  // message) is idempotent when the server echoes it back. Also refreshes the
  // thread-list preview. Server: api/src/handlers/messages.ts (broadcasts the
  // message row directly to `thread:<id>`); room-auth contract: lib/realtime.ts.
  useEffect(() => {
    if (!activeId) return
    const room = `thread:${activeId}`
    let active = true
    let connection: RealtimeConnection | null = null

    const asMessage = (data: unknown): MessageRow | null =>
      typeof data === 'object' &&
      data !== null &&
      typeof (data as { id?: unknown }).id === 'string' &&
      typeof (data as { thread_id?: unknown }).thread_id === 'string'
        ? (data as MessageRow)
        : null

    const onNewMessage = (data: unknown) => {
      const msg = asMessage(data)
      if (!msg) return
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
      setThreads((prev) =>
        prev.map((th) =>
          th.id === msg.thread_id
            ? { ...th, last_message_body: msg.body, last_message_at: msg.created_at }
            : th,
        ),
      )
    }

    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        conn.on('new-message', onNewMessage)
        return conn.joinRoom(room)
      })
      .catch(() => {
        // Realtime is best-effort; the initial fetch already populated the thread.
      })

    return () => {
      active = false
      if (connection) {
        connection.off('new-message', onNewMessage)
        connection.leaveRoom(room).catch(() => {})
      }
    }
  }, [activeId])

  const activeThread = useMemo(
    () => threads.find((th) => th.id === activeId) ?? null,
    [threads, activeId],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim() || !activeId) return
    setSending(true)
    try {
      const response = (await http.post<MessageRow>(`/api/messages/threads/${activeId}/messages`, {
        body: draft.trim(),
      })) as { data?: MessageRow | null }
      const newMsg = response.data
      if (newMsg?.id) {
        // The server broadcasts `new-message` BEFORE it answers this POST, so
        // the realtime echo can already be in the list — dedupe, never blind-append.
        setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]))
        setDraft('')
        void track({ name: 'message.sent', properties: { threadId: activeId } })
        // Bump thread's last_message_at to now in the sidebar
        setThreads((prev) =>
          prev.map((th) =>
            th.id === activeId
              ? {
                  ...th,
                  last_message_at: new Date().toISOString(),
                  last_message_body: draft.trim(),
                }
              : th,
          ),
        )
      }
    } catch (err) {
      setErrorMessage(
        (err as { message?: string }).message ??
          t('messages.error.send', {}, { defaultValue: 'Could not send message.' }),
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.stack(6))}>
      <header className={cm.stack(2)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('messages.eyebrow', {}, { defaultValue: 'Direct messages' })}
        </p>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'font-display text-4xl md:text-5xl tracking-tight',
          )}
        >
          {t('messages.title', {}, { defaultValue: 'Threads with your tutors.' })}
        </h1>
      </header>

      {errorMessage && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-2xl bg-warning-light text-warning border border-amber-200',
          )}
        >
          {errorMessage}
        </div>
      )}

      <div
        className={cm.cn(
          cm.grid({ cols: 1, gap: 'md' }),
          'lg:grid-cols-[320px_1fr] rounded-2xl border border-outline-variant/10 bg-surface-container-lowest shadow-sm overflow-hidden',
        )}
        style={{ minHeight: 520 }}
      >
        <aside
          className={cm.cn(
            cm.stack(0),
            'border-r border-outline-variant/20 bg-surface-container-low',
          )}
        >
          {loading ? (
            <p className={cm.cn(cm.sp('p', 4), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('messages.loading', {}, { defaultValue: 'Loading threads…' })}
            </p>
          ) : threads.length === 0 ? (
            <div className={cm.cn(cm.sp('p', 6), cm.stack(2))}>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('messages.empty.title', {}, { defaultValue: 'No threads yet.' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'messages.empty.body',
                  {},
                  {
                    defaultValue:
                      'Threads will appear here when you message a tutor or one messages you.',
                  },
                )}
              </p>
            </div>
          ) : (
            threads.map((th) => {
              const active = th.id === activeId
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setActiveId(th.id)}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('p', 4),
                    'text-left transition-colors border-l-4',
                    active
                      ? 'bg-surface-container-lowest border-primary'
                      : 'border-transparent hover:bg-surface-container',
                  )}
                >
                  <div
                    className={cm.cn(
                      'relative rounded-full overflow-hidden ring-2 ring-surface-container-lowest shadow-sm shrink-0',
                    )}
                    style={{ width: 44, height: 44 }}
                  >
                    <img
                      src={`https://i.pravatar.cc/96?u=${encodeURIComponent(th.peer_id ?? th.id)}`}
                      alt=""
                      className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                    />
                  </div>
                  <div className={cm.cn(cm.flex1, cm.stack(1), 'min-w-0')}>
                    <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                        {th.peer_name ?? 'Tutor'}
                      </span>
                      <span
                        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant shrink-0')}
                      >
                        {relativeTime(th.last_message_at)}
                      </span>
                    </div>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                      {th.last_message_body ??
                        t('messages.noMessages', {}, { defaultValue: 'No messages yet.' })}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </aside>

        <section className={cm.cn(cm.flex({ direction: 'col' }), cm.h('full'))}>
          {activeThread ? (
            <>
              <header
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('p', 4),
                  'border-b border-outline-variant/20',
                )}
              >
                <div
                  className={cm.cn(
                    'rounded-full overflow-hidden ring-2 ring-surface-container-lowest shadow-sm shrink-0',
                  )}
                  style={{ width: 40, height: 40 }}
                >
                  <img
                    src={`https://i.pravatar.cc/96?u=${encodeURIComponent(activeThread.peer_id ?? activeThread.id)}`}
                    alt=""
                    className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                  />
                </div>
                <div className={cm.flex1}>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                    {activeThread.peer_name ?? 'Tutor'}
                  </p>
                </div>
              </header>

              <div className={cm.cn(cm.flex1, cm.sp('p', 6), cm.stack(3), 'overflow-y-auto')}>
                {messages.length === 0 ? (
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      'text-on-surface-variant text-center my-12',
                    )}
                  >
                    {t(
                      'messages.thread.empty',
                      {},
                      { defaultValue: 'Say hi — start the conversation.' },
                    )}
                  </p>
                ) : (
                  messages.map((m) => {
                    const isMe = currentUserId !== null && m.sender_id === currentUserId
                    return (
                      <div
                        key={m.id}
                        className={cm.cn(
                          cm.flex({ direction: 'col' }),
                          isMe ? 'items-end' : 'items-start',
                        )}
                      >
                        <div
                          className={cm.cn(
                            cm.sp('px', 4),
                            cm.sp('py', 3),
                            cm.textSize('sm'),
                            'max-w-[80%] rounded-2xl shadow-sm',
                            isMe
                              ? 'rounded-tr-sm text-on-primary'
                              : 'rounded-tl-sm bg-surface-container-low text-on-surface',
                          )}
                          style={isMe ? { backgroundColor: 'var(--mol-color-primary)' } : undefined}
                        >
                          {m.body}
                        </div>
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.sp('mt', 1),
                            'text-on-surface-variant',
                          )}
                        >
                          {formatMessageTime(m.created_at)}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              <form
                onSubmit={handleSubmit}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('p', 4),
                  'border-t border-outline-variant/20',
                )}
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t(
                    'messages.draftPlaceholder',
                    {},
                    { defaultValue: 'Type a message…' },
                  )}
                  className={cm.cn(
                    cm.flex1,
                    cm.textSize('sm'),
                    'rounded-full bg-surface-container-low px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30',
                  )}
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'rounded-full text-on-primary shrink-0 transition-transform hover:scale-105 disabled:opacity-40',
                  )}
                  style={{ width: 44, height: 44, backgroundColor: 'var(--mol-color-primary)' }}
                  aria-label={t('messages.send', {}, { defaultValue: 'Send message' })}
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                    send
                  </span>
                </button>
              </form>
            </>
          ) : (
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.flex1,
                cm.sp('p', 12),
                'text-on-surface-variant text-center',
              )}
            >
              <p className={cm.cn(cm.textSize('sm'))}>
                {threads.length > 0
                  ? t('messages.selectThread', {}, { defaultValue: 'Select a thread on the left.' })
                  : t(
                      'messages.startThreadHint',
                      {},
                      {
                        defaultValue:
                          'Visit a tutor profile and tap "Message tutor" to start a conversation.',
                      },
                    )}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
