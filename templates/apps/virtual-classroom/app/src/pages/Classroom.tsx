import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import { ClassroomStage } from '../components/ClassroomStage.js'
import type { ChatMessageRow, RoomRow } from '../lib/api.js'
import { isUuid } from '../lib/api.js'
import { getRealtimeConnection } from '../lib/realtime.js'

interface AuthUser {
  id: string
  email?: string
}

export function Classroom() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user } = useAuth<AuthUser>()
  const params = useParams()
  const roomId = params.id ?? ''

  const [room, setRoom] = useState<RoomRow | null>(null)
  const [messages, setMessages] = useState<ChatMessageRow[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const myId = user?.id ?? ''
  const isHost = !!room && room.host_id === myId

  // 1) Mount: fetch room (gates membership) + auto-join if not already a
  // member (idempotent on the server). Then load chat history.
  // A malformed (non-UUID) id can never resolve — the API validates every
  // :id as a UUID and answers 400 — so skip the network and show the
  // not-found state directly instead of firing doomed requests.
  useEffect(() => {
    if (!roomId) return
    if (!isUuid(roomId)) {
      setError(t('classroom.roomNotFound', {}, { defaultValue: 'Classroom not found.' }))
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        // Try to read the room first. If we get a 404 the user isn't a
        // member yet — call join, then re-read.
        let roomRes: { data: RoomRow } | null = null
        try {
          roomRes = await http.get<RoomRow>(`/api/rooms/${roomId}`)
        } catch (_error) {
          // 404 means not yet a member — auto-join then re-read
          await http.post(`/api/rooms/${roomId}/join`, {})
          roomRes = await http.get<RoomRow>(`/api/rooms/${roomId}`)
        }
        if (cancelled) return
        setRoom(roomRes.data)
        // Domain event: the student/instructor actually made it into the class.
        void track({
          name: 'class.joined',
          properties: { roomId, isHost: roomRes.data.host_id === myId },
        })
        const chat = await http.get<ChatMessageRow[]>(`/api/chat/room/${roomId}`)
        if (cancelled) return
        setMessages(chat.data)
      } catch (err: unknown) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to enter classroom')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, roomId, t, myId])

  // 2) Live chat: append new messages from the `room:<id>` room instantly (was a
  // 4 s poll — the server already broadcasts `new-message` via `safeBroadcast`).
  // Dedupe by id so our OWN optimistic append (sendMessage pushes the sent
  // message) is idempotent when the server echoes it back. A slow 20 s poll
  // remains as a reconnect safety net. Server: api/src/handlers/chat.ts.
  useEffect(() => {
    if (!room) return
    let active = true
    let connection: RealtimeConnection | null = null

    const onNewMessage = (data: unknown) => {
      if (typeof data !== 'object' || data === null) return
      const msg = data as ChatMessageRow
      if (typeof msg.id !== 'string') return
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
    }

    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        conn.on('new-message', onNewMessage)
        return conn.joinRoom(`room:${roomId}`)
      })
      .catch(() => {
        // Realtime is best-effort; the slow poll below still refreshes chat.
      })

    const poll = setInterval(() => {
      http
        .get<ChatMessageRow[]>(`/api/chat/room/${roomId}`)
        .then((res) => setMessages(res.data))
        .catch(() => {
          /* swallow — next tick will retry */
        })
    }, 20000)

    return () => {
      active = false
      clearInterval(poll)
      if (connection) {
        connection.off('new-message', onNewMessage)
        connection.leaveRoom(`room:${roomId}`).catch(() => {})
      }
    }
  }, [http, room, roomId])

  // Auto-scroll chat to the latest message after each render that adds one.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length])

  const sendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const text = draft.trim()
      if (!text || sending || !room) return
      setSending(true)
      try {
        const res = await http.post<ChatMessageRow>('/api/chat', {
          room_id: roomId,
          content: text,
          type: 'text',
        })
        // The server also broadcasts `new-message` to the room socket — our
        // own message can echo back BEFORE this POST response resolves. Dedupe
        // by id so the optimistic append can't double-render it (React would
        // warn about duplicate keys and could drop children).
        setMessages((prev) => (prev.some((m) => m.id === res.data.id) ? prev : [...prev, res.data]))
        setDraft('')
        // Domain event: chat engagement inside a live class.
        void track({ name: 'chat.message_sent', properties: { roomId, messageId: res.data.id } })
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to send message')
      } finally {
        setSending(false)
      }
    },
    [draft, http, room, roomId, sending],
  )

  const leaveClass = useCallback(async () => {
    try {
      await http.post(`/api/rooms/${roomId}/leave`, {})
    } catch (_error) {
      // best-effort leave — navigate away regardless
    }
    navigate('/dashboard')
  }, [http, navigate, roomId])

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    } catch (_error) {
      // invalid date string — fall back to empty display
      return ''
    }
  }

  const headerTitle = useMemo(() => {
    if (room) return room.name
    if (!loading && error)
      return t('classroom.titleNotFound', {}, { defaultValue: 'Classroom unavailable' })
    return t('classroom.titleLoading', {}, { defaultValue: 'Joining classroom…' })
  }, [room, loading, error, t])

  return (
    <div
      className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }), 'items-stretch')}
      data-testid="classroom-root"
    >
      <div className={cm.cn('col-span-12 xl:col-span-8', cm.stack(4))}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-3')}>
          <div className={cm.stack(1)}>
            <Link
              to="/dashboard"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 1 }),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')}>arrow_back</span>
              {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
            </Link>
            <h1
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                'tracking-tight text-on-surface',
              )}
              data-testid="classroom-title"
            >
              {headerTitle}
            </h1>
            {room ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'classroom.joinCode',
                  { code: room.join_code },
                  { defaultValue: 'Join code · {{code}}' },
                )}{' '}
                · {t('nav.status', {}, { defaultValue: 'Status' })}: {room.status}
              </p>
            ) : null}
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
            <Link
              to={`/whiteboard/${roomId}`}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 1 }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>edit_square</span>
              {t('classroom.openWhiteboard', {}, { defaultValue: 'Whiteboard' })}
            </Link>
            <button
              type="button"
              onClick={leaveClass}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 1 }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-xl bg-error text-on-error hover:bg-error/90 transition-colors',
              )}
              data-testid="classroom-leave"
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>call_end</span>
              {t('classroom.leave', {}, { defaultValue: 'Leave class' })}
            </button>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {error}
          </div>
        ) : null}

        <ClassroomStage participantCount={Math.max(1, room?.participant_count ?? 1)} />
      </div>

      <aside className={cm.cn('col-span-12 xl:col-span-4', cm.stack(4))}>
        <section
          className={cm.cn(
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/10 overflow-hidden flex flex-col h-[520px]',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 5),
              cm.sp('py', 4),
              'border-b border-outline-variant/15',
            )}
          >
            <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('classroom.chatTitle', {}, { defaultValue: 'Class chat' })}
            </h2>
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'py-0.5 rounded-full bg-primary-container text-on-primary-container',
              )}
              data-testid="classroom-chat-count"
            >
              {t(
                'classroom.chatCount',
                { count: messages.length },
                { defaultValue: '{{count}} messages' },
              )}
            </span>
          </div>
          <div
            ref={scrollRef}
            className={cm.cn(cm.sp('p', 5), cm.stack(4), cm.flex1, 'overflow-y-auto')}
            data-testid="classroom-chat-list"
          >
            {loading ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('classroom.chatLoading', {}, { defaultValue: 'Loading conversation…' })}
              </p>
            ) : messages.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant italic')}>
                {t(
                  'classroom.chatEmpty',
                  {},
                  { defaultValue: 'No messages yet — say hello to break the silence.' },
                )}
              </p>
            ) : (
              messages.map((m) => {
                const mine = m.user_id === myId
                return (
                  <div
                    key={m.id}
                    className={cm.cn(cm.stack(1))}
                    data-testid="classroom-chat-message"
                  >
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.textSize('xs'))}>
                      <span
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          mine ? 'text-primary' : 'text-on-surface',
                        )}
                      >
                        {mine
                          ? t('nav.you', {}, { defaultValue: 'You' })
                          : `${m.user_id.slice(0, 8)}…`}
                      </span>
                      {m.user_id === room?.host_id ? (
                        <span
                          className={cm.cn(
                            'text-[10px] font-bold uppercase tracking-widest text-primary bg-primary-container px-2 py-0.5 rounded',
                          )}
                        >
                          {t('classroom.instructorBadge', {}, { defaultValue: 'Host' })}
                        </span>
                      ) : null}
                      <span className={cm.cn('text-on-surface-variant tabular-nums')}>
                        {formatTime(m.created_at)}
                      </span>
                    </div>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        'leading-relaxed text-on-surface whitespace-pre-wrap break-words',
                      )}
                    >
                      {m.content}
                    </p>
                  </div>
                )
              })
            )}
          </div>
          <form
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('p', 4),
              'border-t border-outline-variant/15',
            )}
            onSubmit={sendMessage}
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={!room || sending}
              placeholder={t(
                'classroom.chatPlaceholder',
                {},
                { defaultValue: 'Send to the class…' },
              )}
              aria-label={t('classroom.chatInputLabel', {}, { defaultValue: 'Class chat message' })}
              data-testid="classroom-chat-input"
              className={cm.cn(
                cm.flex1,
                cm.textSize('sm'),
                cm.sp('px', 4),
                cm.sp('py', 2.5),
                'rounded-xl bg-surface-container-low border-0 text-on-surface placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary/30 outline-none disabled:opacity-50',
              )}
            />
            <button
              type="submit"
              disabled={!room || sending || draft.trim().length === 0}
              aria-label={t('common.send', {}, { defaultValue: 'Send' })}
              data-testid="classroom-chat-send"
              className={cm.cn(
                'h-10 w-10 rounded-xl bg-primary text-on-primary hover:bg-primary-dark transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[20px]')}>send</span>
            </button>
          </form>
        </section>

        <section
          className={cm.cn(
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/10 overflow-hidden',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 5),
              cm.sp('py', 4),
              'border-b border-outline-variant/15',
            )}
          >
            <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('classroom.roomDetailsTitle', {}, { defaultValue: 'Room details' })}
            </h2>
          </div>
          <dl className={cm.cn(cm.sp('p', 5), cm.stack(3), cm.textSize('sm'))}>
            <div className={cm.cn(cm.flex({ justify: 'between' }))}>
              <dt className={cm.cn('text-on-surface-variant')}>
                {t('classroom.detailRole', {}, { defaultValue: 'Your role' })}
              </dt>
              <dd className={cm.cn(cm.fontWeight('semibold'))}>
                {isHost
                  ? t('classroom.roleHost', {}, { defaultValue: 'Host (can draw)' })
                  : t('classroom.roleParticipant', {}, { defaultValue: 'Participant' })}
              </dd>
            </div>
            <div className={cm.cn(cm.flex({ justify: 'between' }))}>
              <dt className={cm.cn('text-on-surface-variant')}>
                {t('classroom.detailJoin', {}, { defaultValue: 'Join code' })}
              </dt>
              <dd className={cm.cn(cm.fontWeight('semibold'), 'tabular-nums')}>
                {room?.join_code ?? '—'}
              </dd>
            </div>
            <div className={cm.cn(cm.flex({ justify: 'between' }))}>
              <dt className={cm.cn('text-on-surface-variant')}>
                {t('classroom.detailParticipants', {}, { defaultValue: 'Participants' })}
              </dt>
              <dd className={cm.cn(cm.fontWeight('semibold'), 'tabular-nums')}>
                {room?.participant_count ?? 0}
              </dd>
            </div>
          </dl>
        </section>
      </aside>
    </div>
  )
}

export default Classroom
