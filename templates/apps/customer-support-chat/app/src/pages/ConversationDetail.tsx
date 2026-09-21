import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { get, post, put as httpPut } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import { ChatBubble } from '../components/ChatBubble.js'
import { ConversationListItem } from '../components/ConversationListItem.js'
import { CustomerProfilePanel } from '../components/CustomerProfilePanel.js'
import { InboxLayout } from '../components/InboxLayout.js'
import { StatusPill } from '../components/StatusPill.js'
import { appendMessage, mergeConversation, replaceConversation } from '../lib/message-merge.js'
import { getRealtimeConnection } from '../lib/realtime.js'

interface ConversationRow {
  id: string
  subject: string | null
  visitor_name: string | null
  visitor_email: string | null
  status: 'open' | 'assigned' | 'closed' | string
  priority: 'low' | 'normal' | 'high' | 'urgent' | string
  agent_id: string | null
  last_message_at: string | null
  created_at: string
}

interface MessageRow {
  id: string
  conversation_id: string
  sender_type: 'visitor' | 'agent' | 'bot'
  sender_name: string | null
  content: string
  type: 'text' | 'internal_note' | 'image' | 'file' | string
  created_at: string
}

type ComposeMode = 'reply' | 'note'

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0 || Number.isNaN(ms)) return ''
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

function ConversationListPanel({
  rows,
  selectedId,
}: {
  rows: ConversationRow[]
  selectedId: string | null
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }))}>
      <header
        className={cm.cn(
          cm.sp('p', 4),
          'border-b border-[color:var(--color-border)] sticky top-0 bg-surface z-10',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('nav.inbox', {}, { defaultValue: 'Inbox' })}
        </h2>
      </header>
      {rows.length === 0 ? (
        <p className={cm.cn(cm.sp('p', 4), cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('conversationDetail.empty', {}, { defaultValue: 'No conversations yet.' })}
        </p>
      ) : (
        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              <ConversationListItem
                id={row.id}
                customerName={
                  row.visitor_name ||
                  row.visitor_email ||
                  row.subject ||
                  t('contactDetail.conversationFallback', {}, { defaultValue: 'Conversation' })
                }
                preview={row.subject || ''}
                timestamp={relativeTime(row.last_message_at || row.created_at)}
                presence={row.status === 'closed' ? 'offline' : 'online'}
                channelIcon="chat"
                active={row.id === selectedId}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ConversationDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [conversation, setConversation] = useState<ConversationRow | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [allConversations, setAllConversations] = useState<ConversationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [composeMode, setComposeMode] = useState<ComposeMode>('reply')
  const [sending, setSending] = useState(false)
  const [actioning, setActioning] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)

  const reload = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [convResp, msgResp, listResp] = await Promise.all([
        get<ConversationRow>(`/api/conversations/${id}`),
        get<MessageRow[]>(`/api/messages/${id}`),
        get<ConversationRow[]>(`/api/conversations`),
      ])
      setConversation(convResp.data)
      setMessages(Array.isArray(msgResp.data) ? msgResp.data : [])
      setAllConversations(Array.isArray(listResp.data) ? listResp.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void reload()
  }, [reload])

  // Keep the newest message in view: a chat thread reads bottom-up, so
  // every load / live append scrolls the feed to its end.
  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading])

  // Quiet refetch for reconnect recovery: refresh the thread + header without
  // flipping the `loading` flag (no skeleton flash over live content).
  const refreshQuiet = useCallback(async () => {
    if (!id) return
    try {
      const [convResp, msgResp] = await Promise.all([
        get<ConversationRow>(`/api/conversations/${id}`),
        get<MessageRow[]>(`/api/messages/${id}`),
      ])
      setConversation(convResp.data)
      setMessages(Array.isArray(msgResp.data) ? msgResp.data : [])
    } catch (_error) {
      // Transient refetch failure — the feed keeps its last known state and
      // self-heals on the next event or reconnect.
    }
  }, [id])

  // Live updates: join this conversation's realtime room (`conversation:<id>`)
  // and apply message/lifecycle events as they arrive. The reload effect above
  // stays the source of truth on mount; events keep it current without polling.
  useEffect(() => {
    if (!id) return
    let disposed = false
    let conn: RealtimeConnection | null = null
    const room = `conversation:${id}`

    const onMessageCreated = (data: unknown) => setMessages((prev) => appendMessage(prev, data))
    // assigned/closed/reopened/updated all carry the full conversation row.
    const onConversationChanged = (data: unknown) => {
      setConversation((prev) => mergeConversation(prev, data))
      setAllConversations((prev) => replaceConversation(prev, data))
    }
    const onReconnect = () => {
      // Missed-window recovery: events emitted while disconnected are gone
      // for good, so refetch this conversation after a reconnect.
      if (disposed) return
      void refreshQuiet()
    }

    getRealtimeConnection()
      .then(async (connection) => {
        if (disposed) return
        conn = connection
        connection.on('message:created', onMessageCreated)
        connection.on('conversation:assigned', onConversationChanged)
        connection.on('conversation:closed', onConversationChanged)
        connection.on('conversation:reopened', onConversationChanged)
        connection.on('conversation:updated', onConversationChanged)
        // onReconnect has no un-register; the `disposed` flag makes stale
        // handlers inert after unmount / conversation switch.
        connection.onReconnect(onReconnect)
        await connection.joinRoom(room)
      })
      .catch(() => {
        // Join denied (not the owner) or transport unavailable — unauthorized
        // access is already surfaced at the HTTP layer, so stay quietly on
        // the fetched data with no live updates.
      })

    return () => {
      disposed = true
      if (conn) {
        conn.off('message:created', onMessageCreated)
        conn.off('conversation:assigned', onConversationChanged)
        conn.off('conversation:closed', onConversationChanged)
        conn.off('conversation:reopened', onConversationChanged)
        conn.off('conversation:updated', onConversationChanged)
        conn.leaveRoom(room).catch(() => {
          // Connection already closed — nothing to leave.
        })
      }
    }
  }, [id, refreshQuiet])

  const speakerOf = useCallback((m: MessageRow): 'agent' | 'customer' | 'bot' | 'note' => {
    if (m.type === 'internal_note') return 'note'
    if (m.sender_type === 'visitor') return 'customer'
    if (m.sender_type === 'bot') return 'bot'
    return 'agent'
  }, [])

  const handleSend = useCallback(async () => {
    if (!id || !draft.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      if (composeMode === 'note') {
        await post<MessageRow>(`/api/messages/${id}/note`, {
          content: draft.trim(),
        })
        void track({ name: 'message.note_saved', properties: { conversation_id: id } })
      } else {
        await post<MessageRow>(`/api/messages/${id}`, {
          sender_type: 'agent',
          content: draft.trim(),
          type: 'text',
        })
        void track({ name: 'message.sent', properties: { conversation_id: id } })
      }
      setDraft('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSending(false)
    }
  }, [composeMode, draft, id, reload, sending])

  const handleResolve = useCallback(async () => {
    if (!id || !conversation || actioning) return
    setActioning(true)
    setError(null)
    try {
      const action = conversation.status === 'closed' ? 'reopen' : 'close'
      await httpPut<ConversationRow>(`/api/conversations/${id}/${action}`, {})
      void track({
        name: action === 'close' ? 'conversation.resolved' : 'conversation.reopened',
        properties: { conversation_id: id },
      })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setActioning(false)
    }
  }, [actioning, conversation, id, reload])

  const handlePriorityChange = useCallback(
    async (priority: 'low' | 'normal' | 'high' | 'urgent') => {
      if (!id || actioning) return
      setActioning(true)
      setError(null)
      try {
        await httpPut<ConversationRow>(`/api/conversations/${id}/priority`, {
          priority,
        })
        void track({
          name: 'conversation.priority_changed',
          properties: { conversation_id: id, priority },
        })
        await reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setActioning(false)
      }
    },
    [actioning, id, reload],
  )

  const headerSubject = useMemo(() => {
    if (conversation?.subject) return conversation.subject
    if (conversation?.visitor_name)
      return t(
        'conversationDetail.subjectWithVisitor',
        { name: conversation.visitor_name },
        { defaultValue: 'Conversation with {{name}}' },
      )
    return t(
      'conversationDetail.subjectFallback',
      { id: id ?? '' },
      { defaultValue: 'Conversation {{id}}' },
    )
  }, [conversation, id, t])

  return (
    <InboxLayout
      list={<ConversationListPanel rows={allConversations} selectedId={id ?? null} />}
      main={
        <div className={cm.cn(cm.flex({ direction: 'col' }), cm.h('full'))}>
          <header
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('p', 5),
              'flex-wrap gap-3 border-b border-[color:var(--color-border)] bg-surface',
            )}
          >
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 1 }), 'min-w-0 flex-1')}>
              <h1
                className={cm.cn(
                  cm.textSize('lg'),
                  'font-extrabold tracking-tight text-on-surface truncate',
                )}
              >
                {headerSubject}
              </h1>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                {conversation?.visitor_email || ''}
                {conversation?.visitor_email && conversation?.priority ? ' · ' : ''}
                {conversation?.priority ? `priority ${conversation.priority}` : ''}
              </p>
            </div>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'flex-wrap')}>
              <StatusPill
                variant={
                  conversation?.status === 'closed'
                    ? 'resolved'
                    : conversation?.priority === 'urgent' || conversation?.priority === 'high'
                      ? 'urgent'
                      : 'pending'
                }
                label={conversation?.status ?? ''}
              />
              <select
                aria-label={t('form.priority', {}, { defaultValue: 'Priority' })}
                value={conversation?.priority ?? 'normal'}
                disabled={!conversation || actioning}
                onChange={(e) =>
                  void handlePriorityChange(e.target.value as 'low' | 'normal' | 'high' | 'urgent')
                }
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'rounded-md bg-surface-secondary border border-[color:var(--color-border)]',
                )}
              >
                <option value="low">{t('priority.low', {}, { defaultValue: 'Low' })}</option>
                <option value="normal">
                  {t('priority.normal', {}, { defaultValue: 'Normal' })}
                </option>
                <option value="high">{t('priority.high', {}, { defaultValue: 'High' })}</option>
                <option value="urgent">
                  {t('priority.urgent', {}, { defaultValue: 'Urgent' })}
                </option>
              </select>
              <button
                type="button"
                onClick={() => void handleResolve()}
                disabled={!conversation || actioning}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'rounded-md bg-success/10 text-[var(--color-status-success-text)] hover:bg-success/15 transition-colors disabled:opacity-50',
                )}
              >
                {conversation?.status === 'closed'
                  ? t('conversationDetail.reopenAction', {}, { defaultValue: 'Reopen' })
                  : t('conversationDetail.resolveAction', {}, { defaultValue: 'Mark resolved' })}
              </button>
            </div>
          </header>
          <div
            ref={threadRef}
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 4 }),
              cm.sp('p', 6),
              cm.flex1,
              'overflow-y-auto bg-surface-secondary',
            )}
            aria-label={t(
              'conversationDetail.threadAria',
              {},
              { defaultValue: 'Conversation messages' },
            )}
          >
            {error && (
              <div
                role="alert"
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.textSize('sm'),
                  'rounded bg-[var(--color-status-error-bg)] text-[var(--color-status-error-text)]',
                )}
              >
                {error}
              </div>
            )}
            {loading ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('conversationDetail.loading', {}, { defaultValue: 'Loading messages…' })}
              </p>
            ) : messages.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'conversationDetail.noMessages',
                  {},
                  { defaultValue: 'No messages yet. Send the first reply below.' },
                )}
              </p>
            ) : (
              messages.map((entry) => {
                const speaker = speakerOf(entry)
                // Fall back to a human label when the row carries no
                // sender_name: the visitor's name for customer bubbles,
                // "You" for the signed-in agent (bot keeps its AI avatar).
                const fallbackName =
                  speaker === 'customer'
                    ? (conversation?.visitor_name ?? undefined)
                    : speaker === 'agent'
                      ? t('conversationDetail.you', {}, { defaultValue: 'You' })
                      : undefined
                return (
                  <ChatBubble
                    key={entry.id}
                    speaker={speaker}
                    name={entry.sender_name ?? fallbackName}
                    timestamp={relativeTime(entry.created_at)}
                  >
                    {entry.content}
                  </ChatBubble>
                )
              })
            )}
          </div>
          <footer
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 3 }),
              cm.sp('p', 5),
              'border-t border-[color:var(--color-border)] bg-surface',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'flex-wrap')}>
              {[
                {
                  key: 'reply' as const,
                  icon: 'send',
                  label: t('common.reply', {}, { defaultValue: 'Reply' }),
                },
                {
                  key: 'note' as const,
                  icon: 'sticky_note_2',
                  label: t('conversationDetail.tab.note', {}, { defaultValue: 'Internal note' }),
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setComposeMode(tab.key)}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 1 }),
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.fontWeight('semibold'),
                    cm.textSize('xs'),
                    cm.roundedFull,
                    composeMode === tab.key
                      ? 'bg-primary text-white'
                      : 'bg-surface-secondary text-on-surface-variant hover:text-primary',
                  )}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 14 }}
                    aria-hidden="true"
                  >
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              ))}
            </div>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 2 }),
                cm.sp('p', 4),
                'rounded-xl border border-[color:var(--color-border)] bg-surface-secondary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-shadow',
              )}
            >
              <textarea
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label={
                  composeMode === 'note'
                    ? t('conversationDetail.notePlaceholder', {}, { defaultValue: 'Internal note' })
                    : t('common.reply', {}, { defaultValue: 'Reply' })
                }
                placeholder={
                  composeMode === 'note'
                    ? t(
                        'conversationDetail.notePlaceholder',
                        {},
                        { defaultValue: 'Internal note (only visible to your team)' },
                      )
                    : t(
                        'conversationDetail.draftPlaceholder',
                        { name: conversation?.visitor_name ?? 'visitor' },
                        { defaultValue: 'Reply to {{name}}…' },
                      )
                }
                className={cm.cn(
                  cm.sp('p', 0),
                  cm.textSize('sm'),
                  'w-full resize-none bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface',
                )}
              />
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'end' }))}>
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={draft.trim().length === 0 || sending}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'rounded-md bg-gradient-to-r from-primary to-secondary text-white shadow-sm hover:shadow-md transition-all disabled:opacity-50',
                  )}
                >
                  {sending
                    ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                    : composeMode === 'note'
                      ? t('conversationDetail.saveNote', {}, { defaultValue: 'Save note' })
                      : t('common.send', {}, { defaultValue: 'Send' })}
                </button>
              </div>
            </div>
          </footer>
        </div>
      }
      side={
        conversation ? (
          <CustomerProfilePanel
            name={
              conversation.visitor_name ||
              conversation.visitor_email ||
              t('conversationDetail.visitorFallback', {}, { defaultValue: 'Visitor' })
            }
            email={conversation.visitor_email || ''}
            presence={conversation.status === 'closed' ? 'offline' : 'online'}
            csat={null}
            properties={[
              {
                label: t('newConversation.subject', {}, { defaultValue: 'Subject' }),
                value: conversation.subject || '—',
              },
              {
                label: t('nav.status', {}, { defaultValue: 'Status' }),
                value: conversation.status,
              },
              {
                label: t('form.priority', {}, { defaultValue: 'Priority' }),
                value: conversation.priority,
              },
              {
                label: t('conversationDetail.createdLabel', {}, { defaultValue: 'Created' }),
                value: relativeTime(conversation.created_at),
              },
            ]}
            recent={[]}
          />
        ) : undefined
      }
    />
  )
}

export default ConversationDetail
export { ConversationDetail, ConversationDetail as ConversationDetailPage }
