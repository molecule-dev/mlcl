import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import { authClient } from '../bonds/auth-default.js'
import { AVATAR_BG } from '../lib/avatarColors.js'
import type { ConversationMessage as Message } from '../lib/message-merge.js'
import {
  appendMessage,
  applyMessageUpdate,
  applyReceipt,
  isEventRow,
  isReceiptFromSelf,
  normalizeIncomingMessage,
  removeMessage,
} from '../lib/message-merge.js'
import { getRealtimeConnection } from '../lib/realtime.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Conversation {
  id: string
  type: 'direct' | 'group'
  name: string
  initials: string
  avatar_index: number
  presence: 'online' | 'away' | 'offline'
  member_count: number | null
  encrypted: boolean
  disappearing_seconds: number | null
  safety_number_verified: boolean
  is_archived: boolean
  group_id: string | null
  contact_id: string | null
}

// Avatar fills carry WHITE initials, so each is the step of its hue where white
// clears 4.5:1 — the 500-level originals measured 2.15-4.23:1 and the initials
// were the least readable text in the list. Verified with scripts/contrast.mjs.

export function Conversation() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id = '' } = useParams<{ id: string }>()
  const [convo, setConvo] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [composing, setComposing] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/conversations/${id}`),
      http.get(`/api/messages?conversation_id=${id}`),
    ])
      .then(([c, m]) => {
        if (cancelled) return
        setConvo(unwrapSingle<Conversation>(c))
        setMessages(unwrapList<Message>(m))
        // Mark as read on entry so unread counts deflate.
        http.post(`/api/conversations/${id}/read`, {}).catch(() => undefined)
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('conversation.loadError', {}, { defaultValue: 'Failed to load conversation.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  // Live updates: join this conversation's realtime room (`conversation:<id>`)
  // and apply message events as they arrive. The fetch effect above stays the
  // source of truth on mount; events keep it current without polling. The API
  // broadcasts raw rows, so payloads are normalized into the decorated shape
  // locally (self/receipts are viewer-specific — see lib/message-merge.ts).
  useEffect(() => {
    if (!id) return
    let disposed = false
    let conn: RealtimeConnection | null = null
    const room = `conversation:${id}`

    const normalize = (data: unknown) =>
      normalizeIncomingMessage(data, {
        selfId: authClient.getState().user?.id ?? null,
        fallbackSenderName: t('conversation.unknownSender', {}, { defaultValue: 'Someone' }),
      })
    const onCreated = (data: unknown) => {
      const incoming = normalize(data)
      setMessages((prev) => appendMessage(prev, incoming))
    }
    const onUpdated = (data: unknown) => setMessages((prev) => applyMessageUpdate(prev, data))
    const onDeleted = (data: unknown) => {
      if (!isEventRow(data)) return
      setMessages((prev) => removeMessage(prev, data.id))
    }
    const onRead = (data: unknown) => {
      // Another participant read my message → flip ✓✓. My own receipt (echoed
      // back to the room) says nothing about my outgoing messages — skip it.
      const selfId = authClient.getState().user?.id ?? null
      if (isReceiptFromSelf(data, selfId)) return
      setMessages((prev) => applyReceipt(prev, data, 'read'))
    }
    const onDelivered = (data: unknown) => {
      const selfId = authClient.getState().user?.id ?? null
      if (isReceiptFromSelf(data, selfId)) return
      setMessages((prev) => applyReceipt(prev, data, 'delivered'))
    }
    const onReconnect = () => {
      // Missed-window recovery: events emitted while disconnected are gone
      // for good, so refetch this conversation's messages after a reconnect.
      if (disposed) return
      http
        .get(`/api/messages?conversation_id=${id}`)
        .then((result) => {
          if (!disposed) setMessages(unwrapList<Message>(result))
        })
        .catch(() => {
          // Transient refetch failure — the feed keeps its last known state
          // and self-heals on the next event or reconnect.
        })
    }

    getRealtimeConnection()
      .then(async (connection) => {
        if (disposed) return
        conn = connection
        connection.on('message:created', onCreated)
        connection.on('message:updated', onUpdated)
        connection.on('message:deleted', onDeleted)
        connection.on('message:read', onRead)
        connection.on('message:delivered', onDelivered)
        // onReconnect has no un-register; the `disposed` flag makes stale
        // handlers inert after unmount / conversation switch.
        connection.onReconnect(onReconnect)
        await connection.joinRoom(room)
      })
      .catch(() => {
        // Join denied (non-participant) or transport unavailable — non-
        // participant access is already surfaced at the HTTP layer, so stay
        // quietly on the fetched data with no live updates.
      })

    return () => {
      disposed = true
      if (conn) {
        conn.off('message:created', onCreated)
        conn.off('message:updated', onUpdated)
        conn.off('message:deleted', onDeleted)
        conn.off('message:read', onRead)
        conn.off('message:delivered', onDelivered)
        conn.leaveRoom(room).catch(() => {
          // Connection already closed — nothing to leave.
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]) // http/t are stable across renders; including them would re-subscribe on every call

  const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = composing.trim()
    if (!text || !id || sending) return
    setSending(true)
    try {
      const result = await http.post('/api/messages', {
        conversation_id: id,
        content: text,
        type: 'text',
      })
      const created = unwrapSingle<Message>(result)
      if (created?.id) {
        // Dedupe by id: our own message:created broadcast may have landed first.
        setMessages((prev) => appendMessage(prev, created))
        setComposing('')
      }
    } catch (error) {
      logError('conversation.sendMessage', error)
      setError(
        t('conversation.sendError', {}, { defaultValue: 'Failed to send. Please try again.' }),
      )
    } finally {
      setSending(false)
    }
  }

  const handleArchiveToggle = async () => {
    if (!convo || archiving) return
    setArchiving(true)
    setActionError(null)
    try {
      if (convo.is_archived) {
        const res = await http.post(`/api/conversations/${id}/unarchive`, {})
        const updated = unwrapSingle<Conversation>(res)
        if (updated) setConvo(updated)
      } else {
        await http.post(`/api/conversations/${id}/archive`, {})
        navigate('/inbox')
      }
    } catch (error) {
      logError('conversation.archiveToggle', error)
      setActionError(
        t('conversation.archiveError', {}, { defaultValue: 'Could not update the archive state.' }),
      )
    } finally {
      setArchiving(false)
    }
  }

  // The conversation id is NOT a contact/group id — link to the details page
  // via the decorated contact_id/group_id, and hide the link when absent.
  const detailsTo = convo
    ? convo.type === 'direct'
      ? convo.contact_id
        ? `/contacts/${convo.contact_id}`
        : null
      : convo.group_id
        ? `/groups/${convo.group_id}`
        : null
    : null

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  if (!convo)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('conversation.notFound', {}, { defaultValue: 'Conversation not found.' })}
      </p>
    )

  return (
    <div className={cm.cn('flex flex-col')} style={{ height: '100vh', maxHeight: '100vh' }}>
      <header
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 3),
          'border-b border-outline-variant bg-surface',
          cm.flex({ align: 'center', gap: 'md' }),
        )}
      >
        <Link
          to="/inbox"
          className={cm.cn('text-on-surface-variant', 'hover:text-on-surface')}
          aria-label={t('conversation.backAria', {}, { defaultValue: 'Back to inbox' })}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_back
          </span>
        </Link>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.h(10),
            cm.w(10),
            'rounded-full text-white',
            cm.fontWeight('semibold'),
          )}
          style={{ backgroundColor: AVATAR_BG[convo.avatar_index % AVATAR_BG.length] }}
        >
          {convo.type === 'group' ? (
            <span className="material-symbols-outlined" aria-hidden="true">
              group
            </span>
          ) : (
            convo.initials
          )}
        </div>
        <div className={cm.flex1}>
          <div className={cm.flex({ align: 'baseline', gap: 'xs' })}>
            <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{convo.name}</p>
            {convo.encrypted && (
              <span
                className={'material-symbols-outlined text-base'}
                style={{ opacity: 0.5 }}
                aria-label={t(
                  'common.endToEndEncrypted',
                  {},
                  { defaultValue: 'End-to-end encrypted' },
                )}
              >
                lock
              </span>
            )}
            {convo.safety_number_verified && (
              <span
                className={'material-symbols-outlined text-base text-success'}
                aria-label={t(
                  'conversation.verifiedAria',
                  {},
                  { defaultValue: 'Safety number verified' },
                )}
              >
                verified
              </span>
            )}
          </div>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {convo.type === 'group'
              ? t(
                  'conversation.memberCount',
                  { count: convo.member_count ?? 0 },
                  { defaultValue: '{{count}} members' },
                )
              : t(`conversation.presence.${convo.presence}`, {}, { defaultValue: convo.presence })}
            {convo.disappearing_seconds && convo.disappearing_seconds > 0
              ? ` · ${t('conversation.disappearingActive', { seconds: convo.disappearing_seconds }, { defaultValue: 'Disappearing: {{seconds}}s' })}`
              : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleArchiveToggle}
          disabled={archiving}
          className={cm.cn(
            cm.h(9),
            cm.w(9),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-full hover:bg-surface-container disabled:opacity-50',
          )}
          aria-label={
            convo.is_archived
              ? t('conversation.unarchiveAria', {}, { defaultValue: 'Unarchive conversation' })
              : t('conversation.archiveAria', {}, { defaultValue: 'Archive conversation' })
          }
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {convo.is_archived ? 'unarchive' : 'archive'}
          </span>
        </button>
        {detailsTo && (
          <Link
            to={detailsTo}
            className={cm.cn(
              cm.h(9),
              cm.w(9),
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-full hover:bg-surface-container',
            )}
            aria-label={t('conversation.detailsAria', {}, { defaultValue: 'View details' })}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              info
            </span>
          </Link>
        )}
      </header>

      {actionError && (
        <p
          role="alert"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'text-error border-b border-outline-variant bg-surface',
          )}
        >
          {actionError}
        </p>
      )}

      <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 6), cm.flex1, 'overflow-y-auto space-y-3')}>
        {messages.map((m) => (
          <MessageRow key={m.id} message={m} />
        ))}
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.textCenter,
            'text-on-surface-variant',
            cm.sp('py', 2),
          )}
        >
          {t(
            'conversation.encryptionNote',
            {},
            {
              defaultValue:
                '🔒 Messages are end-to-end encrypted. Only you and the recipient can read them.',
            },
          )}
        </p>
      </div>

      <form
        onSubmit={handleSend}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          'border-t border-outline-variant bg-surface',
          cm.flex({ align: 'center', gap: 'sm' }),
        )}
      >
        <input
          type="text"
          name="message"
          value={composing}
          onChange={(e) => setComposing(e.target.value)}
          placeholder={t('conversation.composePlaceholder', {}, { defaultValue: 'Message…' })}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.flex1,
            'border border-outline-variant rounded-full',
          )}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!composing.trim() || sending}
          className={cm.cn(
            cm.h(10),
            cm.w(10),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-full bg-primary text-on-primary disabled:opacity-50 shrink-0',
          )}
          aria-label={t('conversation.sendAria', {}, { defaultValue: 'Send message' })}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {sending ? 'pending' : 'send'}
          </span>
        </button>
      </form>
    </div>
  )
}

function MessageRow({ message: m }: { message: Message }) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ direction: 'col', align: m.self ? 'end' : 'start' })}>
      {!m.self && (
        <p
          className={cm.cn(
            cm.textSize('xs'),
            'text-on-surface-variant',
            cm.sp('mb', 1),
            cm.fontWeight('medium'),
          )}
        >
          {m.sender_name}
        </p>
      )}
      <div
        className={cm.cn(cm.sp('px', 4), cm.sp('py', 2), 'rounded-2xl max-w-[480px]')}
        style={
          m.self
            ? {
                backgroundColor: 'var(--color-bubble-self)',
                color: 'var(--color-bubble-self-text)',
              }
            : {
                backgroundColor: 'var(--color-bubble-other)',
                color: 'var(--color-bubble-other-text)',
              }
        }
      >
        <p className={cm.cn(cm.textSize('sm'), 'whitespace-pre-wrap')}>{m.body}</p>
      </div>
      {m.reactions.length > 0 && (
        <div
          className={cm.flex({ align: 'center', gap: 'xs', justify: m.self ? 'end' : 'start' })}
          style={{ marginTop: '4px' }}
        >
          {m.reactions.map((r, i) => (
            <span
              key={i}
              className={cm.cn(
                cm.sp('px', 2),
                cm.sp('py', 1),
                cm.textSize('xs'),
                'rounded-full bg-surface-container',
              )}
              style={{ border: '1px solid var(--mol-color-border)' }}
            >
              {r.emoji} {r.count > 1 ? r.count : ''}
            </span>
          ))}
        </div>
      )}
      <p
        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
        style={{ marginTop: '4px' }}
      >
        {new Date(m.sent_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        {m.self && (
          <span className={cm.cn(cm.sp('ml', 1))}>· {m.read ? '✓✓' : m.delivered ? '✓' : '○'}</span>
        )}
      </p>
    </div>
  )
}
