import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { get, post } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ChatBubble } from '../components/ChatBubble.js'
import { RapportLayout } from '../components/RapportLayout.js'
import { StatusBadge, type StatusVariant } from '../components/StatusBadge.js'

interface MessageRow {
  id: string
  conversation_id: string
  sender: string
  role: string
  content: string
  created_at: string
}

interface ConversationDetailRow {
  id: string
  customer_name: string | null
  customer_email: string | null
  channel: string
  status: string
  escalated: boolean
  message_count: number
  csat: number | null
  satisfaction_score: number | null
  started_at: string
  last_message_at: string | null
  messages?: MessageRow[]
}

const QUICK_REPLIES = [
  {
    id: 'q1',
    key: 'conversationDetail.quick.greeting',
    fallback: 'Hi! Thanks for reaching out — happy to help.',
  },
  {
    id: 'q2',
    key: 'conversationDetail.quick.investigating',
    fallback: 'Let me look into that for you — one moment please.',
  },
  {
    id: 'q3',
    key: 'conversationDetail.quick.handoff',
    fallback: "I'm bringing in a senior teammate who can dig deeper.",
  },
  {
    id: 'q4',
    key: 'conversationDetail.quick.kb',
    fallback: "Here's a knowledge article that should help — you can find it in your docs.",
  },
]

function statusVariant(status: string, escalated: boolean): StatusVariant {
  if (escalated) return 'escalated'
  if (status === 'resolved' || status === 'closed') return 'resolved'
  if (status === 'pending') return 'pending'
  return 'active'
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hr ago`
  return new Date(iso).toLocaleString()
}

function ConversationDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [composer, setComposer] = useState('')
  const [conversation, setConversation] = useState<ConversationDetailRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [acting, setActing] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [customerComposerOpen, setCustomerComposerOpen] = useState(false)
  const [customerMessage, setCustomerMessage] = useState('')
  const [sendingCustomer, setSendingCustomer] = useState(false)
  const [requestingAi, setRequestingAi] = useState(false)

  async function loadConversation() {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const response = await get<ConversationDetailRow>(`/api/conversations/${id}`)
      setConversation(response.data ?? null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('conversationDetail.loadError', {}, { defaultValue: 'Failed to load conversation' }),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadConversation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleSend() {
    if (!id) return
    const content = composer.trim()
    if (!content) return
    setSending(true)
    setError(null)
    try {
      await post(`/api/conversations/${id}/messages`, { content })
      track({ name: 'message.sent', properties: { conversation_id: id, sender: 'agent' } })
      setComposer('')
      await loadConversation()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('conversationDetail.sendError', {}, { defaultValue: 'Could not send message' }),
      )
    } finally {
      setSending(false)
    }
  }

  async function handleEscalate() {
    if (!id || !conversation) return
    setActing(true)
    setError(null)
    try {
      await post(`/api/conversations/${id}/escalate`, {})
      track({ name: 'escalation.triggered', properties: { conversation_id: id } })
      setActionMessage(
        t(
          'conversationDetail.escalatedConfirm',
          {},
          { defaultValue: 'Escalated to a senior agent' },
        ),
      )
      await loadConversation()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('conversationDetail.escalateError', {}, { defaultValue: 'Could not escalate' }),
      )
    } finally {
      setActing(false)
    }
  }

  async function handleResolve() {
    if (!id) return
    setActing(true)
    setError(null)
    try {
      await post(`/api/conversations/${id}/close`, { satisfactionScore: 5 })
      track({ name: 'conversation.resolved', properties: { conversation_id: id } })
      setActionMessage(
        t(
          'conversationDetail.resolvedConfirm',
          {},
          { defaultValue: 'Conversation marked resolved' },
        ),
      )
      await loadConversation()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'conversationDetail.resolveError',
              {},
              { defaultValue: 'Could not resolve conversation' },
            ),
      )
    } finally {
      setActing(false)
    }
  }

  async function handleSendCustomerMessage() {
    if (!id) return
    const content = customerMessage.trim()
    if (!content) return
    setSendingCustomer(true)
    setError(null)
    try {
      await post(`/api/conversations/${id}/messages`, { content, sender: 'customer' })
      track({ name: 'message.sent', properties: { conversation_id: id, sender: 'customer' } })
      setCustomerMessage('')
      setCustomerComposerOpen(false)
      setActionMessage(
        t(
          'conversationDetail.customerSimulated',
          {},
          { defaultValue: 'Customer message added — bot is replying…' },
        ),
      )
      await loadConversation()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'conversationDetail.customerSendError',
              {},
              { defaultValue: 'Could not add customer message' },
            ),
      )
    } finally {
      setSendingCustomer(false)
    }
  }

  async function handleRequestAiReply() {
    if (!id) return
    setRequestingAi(true)
    setError(null)
    try {
      const response = await post<{ source?: string; modelError?: string }>(
        `/api/conversations/${id}/ai-reply`,
        {},
      )
      const data = response?.data ?? {}
      const source =
        data.source === 'model'
          ? t('conversationDetail.aiReplySourceModel', {}, { defaultValue: 'AI' })
          : t(
              'conversationDetail.aiReplySourceFallback',
              {},
              { defaultValue: 'fallback (no AI key)' },
            )
      track({
        name: 'bot.reply',
        properties: { conversation_id: id, source: data.source ?? 'fallback' },
      })
      setActionMessage(
        t(
          'conversationDetail.aiReplyAdded',
          { source },
          { defaultValue: 'Bot reply added ({{source}})' },
        ),
      )
      await loadConversation()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'conversationDetail.aiReplyError',
              {},
              { defaultValue: 'Could not generate AI reply' },
            ),
      )
    } finally {
      setRequestingAi(false)
    }
  }

  async function handleFeedback(rating: 1 | 5) {
    if (!id) return
    try {
      await post('/api/feedback', { conversation_id: id, rating, comment: '' })
      track({ name: 'feedback.submitted', properties: { conversation_id: id, rating } })
      setActionMessage(
        t('conversationDetail.feedbackThanks', {}, { defaultValue: 'Thanks for the feedback!' }),
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'conversationDetail.feedbackError',
              {},
              { defaultValue: 'Failed to submit feedback' },
            ),
      )
    }
  }

  const messages = conversation?.messages ?? []
  const customerName =
    conversation?.customer_name ?? t('conversations.anonymous', {}, { defaultValue: 'Anonymous' })
  const customerEmail = conversation?.customer_email ?? ''
  const initials =
    (customerName || '?')
      .split(/\s+/)
      .map((s) => s[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'

  return (
    <RapportLayout bare>
      <div
        data-mol-id="page-conversation-detail"
        className={cm.cn(cm.flex(), cm.h('full'), 'overflow-hidden')}
      >
        <section
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            cm.flex1,
            cm.h('full'),
            'overflow-hidden bg-[var(--color-bg-sidebar)]',
          )}
        >
          <header
            className={cm.cn(
              cm.flex({ justify: 'between', align: 'center' }),
              cm.sp('px', 6),
              cm.sp('py', 4),
              'flex-wrap gap-y-2 bg-surface-container-lowest border-b border-outline-variant/30',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), 'min-w-0')}>
              <Link
                to="/conversations"
                data-mol-id="conversation-back"
                className="text-on-surface-variant hover:text-on-surface transition-colors"
                aria-label={t(
                  'conversationDetail.backAria',
                  {},
                  { defaultValue: 'Back to conversations' },
                )}
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(10),
                  cm.h(10),
                  cm.shrink0,
                  cm.roundedFull,
                  cm.fontWeight('bold'),
                  'bg-primary-container text-on-primary-container',
                )}
              >
                {initials}
              </div>
              <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
                <span
                  data-mol-id="conversation-customer-name"
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('base'),
                    'truncate text-on-background tracking-tight',
                  )}
                >
                  {customerName}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'truncate text-on-surface-variant')}>
                  {t(
                    'conversationDetail.subhead',
                    { id: (id ?? '').slice(0, 8) },
                    { defaultValue: 'Thread {{id}}' },
                  )}
                </span>
              </div>
            </div>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.shrink0, 'ml-auto')}>
              {conversation && (
                <span data-mol-id="conversation-status">
                  <StatusBadge
                    variant={statusVariant(conversation.status, conversation.escalated)}
                  />
                </span>
              )}
              <button
                data-mol-id="conversation-escalate"
                type="button"
                disabled={
                  acting ||
                  !conversation ||
                  conversation.escalated ||
                  conversation.status === 'resolved'
                }
                onClick={handleEscalate}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 1 }),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  cm.touchTargetCompact,
                  'rounded-full bg-surface-container-low text-on-surface px-3 py-1.5 hover:bg-surface-container transition-colors disabled:opacity-50',
                )}
              >
                <span className="material-symbols-outlined text-base">priority_high</span>
                {t('conversationDetail.escalateButton', {}, { defaultValue: 'Escalate' })}
              </button>
              <button
                data-mol-id="conversation-resolve"
                type="button"
                disabled={acting || !conversation || conversation.status === 'resolved'}
                onClick={handleResolve}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 1 }),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  cm.touchTargetCompact,
                  'rounded-full bg-[var(--color-status-resolved-accent)] text-white px-3 py-1.5 hover:scale-[1.02] transition-transform disabled:opacity-50',
                )}
              >
                <span className="material-symbols-outlined text-base">check</span>
                {t('conversationDetail.resolveButton', {}, { defaultValue: 'Mark resolved' })}
              </button>
            </div>
          </header>

          {actionMessage && (
            <div
              data-mol-id="conversation-action-message"
              role="status"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('mx', 6),
                cm.sp('mt', 4),
                cm.sp('p', 3),
                'rounded-lg bg-primary/10 text-primary text-sm',
              )}
            >
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>{actionMessage}</span>
            </div>
          )}

          {conversation?.escalated && !actionMessage && (
            <div
              data-mol-id="conversation-escalation-banner"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 3 }),
                cm.sp('mx', 6),
                cm.sp('mt', 4),
                cm.sp('p', 3),
                'rounded-lg bg-[var(--color-status-escalated-bg)] border-l-4 border-secondary-container',
              )}
            >
              <span className="material-symbols-outlined text-secondary-container text-xl">
                priority_high
              </span>
              <div className={cm.flex({ direction: 'col', gap: 0 })}>
                <span
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'text-[var(--color-status-escalated-text)]',
                  )}
                >
                  {t(
                    'conversationDetail.escalationTitle',
                    {},
                    { defaultValue: 'Escalated to senior agents' },
                  )}
                </span>
              </div>
            </div>
          )}

          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 4 }),
              cm.sp('px', 6),
              cm.sp('py', 6),
              cm.flex1,
              'overflow-y-auto',
            )}
            data-mol-id="conversation-thread"
          >
            {loading ? (
              <div
                data-mol-id="conversation-loading"
                className={cm.cn(cm.textCenter, cm.sp('p', 4), 'text-on-surface-variant')}
              >
                {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
              </div>
            ) : error ? (
              <div
                data-mol-id="conversation-error"
                role="alert"
                className={cm.cn(cm.textCenter, cm.sp('p', 4), 'text-error')}
              >
                {error}
              </div>
            ) : messages.length === 0 ? (
              <div
                data-mol-id="conversation-thread-empty"
                className={cm.cn(cm.textCenter, cm.sp('p', 8), 'text-on-surface-variant')}
              >
                {t(
                  'conversationDetail.noMessages',
                  {},
                  { defaultValue: 'No messages yet — send the first reply below.' },
                )}
              </div>
            ) : (
              messages.map((msg) => {
                const speaker =
                  msg.sender === 'bot' ? 'bot' : msg.sender === 'agent' ? 'agent' : 'user'
                const speakerName =
                  speaker === 'bot'
                    ? t('conversationDetail.botName', {}, { defaultValue: 'AI Bot' })
                    : speaker === 'agent'
                      ? t('conversationDetail.agentName', {}, { defaultValue: 'Agent' })
                      : customerName
                const speakerInitials =
                  speaker === 'bot' ? 'AI' : speaker === 'agent' ? 'AG' : initials
                return (
                  <div
                    key={msg.id}
                    data-mol-id={`conversation-message-${speaker}`}
                    className={cm.flex({ direction: 'col' })}
                  >
                    <ChatBubble
                      speaker={speaker}
                      name={speakerName}
                      initials={speakerInitials}
                      timestamp={relativeTime(msg.created_at)}
                    >
                      {msg.content}
                    </ChatBubble>
                  </div>
                )
              })
            )}
          </div>

          <footer
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 3 }),
              cm.sp('px', 6),
              cm.sp('py', 4),
              'bg-surface-container-lowest border-t border-outline-variant/30',
            )}
          >
            <div className={cm.cn(cm.flex({ gap: 2, align: 'center' }), 'flex-wrap')}>
              <button
                data-mol-id="conversation-ai-reply"
                type="button"
                disabled={requestingAi || !conversation || conversation.status === 'resolved'}
                onClick={handleRequestAiReply}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 1 }),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  cm.touchTargetCompact,
                  'rounded-full bg-primary text-on-primary px-3 py-1.5 hover:scale-[1.02] transition-transform disabled:opacity-50',
                )}
              >
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                {requestingAi
                  ? t('conversationDetail.aiReplyLoading', {}, { defaultValue: 'Drafting…' })
                  : t('conversationDetail.aiReplyButton', {}, { defaultValue: 'Bot reply' })}
              </button>
              <button
                data-mol-id="conversation-simulate-customer"
                type="button"
                disabled={!conversation || conversation.status === 'resolved'}
                onClick={() => setCustomerComposerOpen((prev) => !prev)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 1 }),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  cm.touchTargetCompact,
                  'rounded-full bg-surface-container-low text-on-surface px-3 py-1.5 hover:bg-surface-container transition-colors disabled:opacity-50',
                )}
              >
                <span className="material-symbols-outlined text-base">person</span>
                {t(
                  'conversationDetail.simulateCustomerButton',
                  {},
                  { defaultValue: 'Customer message' },
                )}
              </button>
            </div>
            {customerComposerOpen && (
              <form
                data-mol-id="conversation-customer-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  void handleSendCustomerMessage()
                }}
                className={cm.cn(cm.flex({ gap: 2 }))}
              >
                <input
                  data-mol-id="conversation-customer-input"
                  type="text"
                  value={customerMessage}
                  onChange={(e) => setCustomerMessage(e.target.value)}
                  placeholder={t(
                    'conversationDetail.customerPlaceholder',
                    {},
                    { defaultValue: 'What did the customer ask?' },
                  )}
                  className={cm.cn(
                    cm.flex1,
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'rounded-full border border-outline-variant/40 focus:border-primary bg-surface-container-low outline-none',
                  )}
                />
                <button
                  data-mol-id="conversation-customer-send"
                  type="submit"
                  disabled={sendingCustomer || !customerMessage.trim()}
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('xs'),
                    cm.touchTargetCompact,
                    'rounded-full bg-on-surface text-surface px-4 py-2 disabled:opacity-50',
                  )}
                >
                  {sendingCustomer
                    ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                    : t('conversationDetail.customerSend', {}, { defaultValue: 'Add as customer' })}
                </button>
              </form>
            )}
            <div className={cm.cn(cm.flex({ gap: 2 }), 'flex-wrap')}>
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q.id}
                  data-mol-id={`conversation-quick-${q.id}`}
                  type="button"
                  className={cm.cn(
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    cm.flex({ align: 'center', gap: 1 }),
                    cm.touchTargetCompact,
                    'rounded-full border border-primary text-primary px-4 py-1.5 hover:bg-primary/10 transition-colors',
                  )}
                  onClick={() => {
                    const text = t(q.key, {}, { defaultValue: q.fallback })
                    setComposer((prev) => (prev ? `${prev}\n${text}` : text))
                  }}
                >
                  <span className="material-symbols-outlined text-base">bolt</span>
                  {t(q.key, {}, { defaultValue: q.fallback })}
                </button>
              ))}
            </div>
            <form
              data-mol-id="conversation-composer-form"
              onSubmit={(e) => {
                e.preventDefault()
                void handleSend()
              }}
              className="relative"
            >
              <textarea
                data-mol-id="conversation-composer"
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                placeholder={t(
                  'conversationDetail.composerPlaceholder',
                  {},
                  { defaultValue: 'Reply to customer…' },
                )}
                rows={3}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('pl', 5),
                  cm.sp('pr', 16),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-2xl border-2 border-outline-variant/40 focus:border-primary bg-surface-container-low resize-none outline-none transition-colors',
                )}
              />
              <button
                data-mol-id="conversation-send"
                type="submit"
                aria-label={t('common.send', {}, { defaultValue: 'Send' })}
                disabled={sending || !composer.trim()}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(10),
                  cm.h(10),
                  cm.roundedFull,
                  'absolute right-3 bottom-3 bg-primary text-on-primary hover:scale-[1.05] transition-transform disabled:opacity-50',
                )}
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </form>
          </footer>
        </section>

        <aside
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 6 }),
            cm.w('[320px]'),
            cm.h('full'),
            cm.sp('p', 5),
            'hidden xl:flex border-l border-outline-variant/30 bg-surface-container-lowest overflow-y-auto',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'tracking-widest uppercase text-on-surface-variant',
              )}
            >
              {t('nav.customer', {}, { defaultValue: 'Customer' })}
            </span>
            <div
              className={cm.cn(
                cm.sp('p', 4),
                cm.flex({ direction: 'col', gap: 2 }),
                'rounded-xl bg-surface-container-low',
              )}
            >
              <div className={cm.flex({ align: 'center', gap: 3 })}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    'bg-primary-container text-on-primary-container',
                  )}
                >
                  {initials}
                </div>
                <div className={cm.flex({ direction: 'col' })}>
                  <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface text-sm')}>
                    {customerName}
                  </span>
                  {customerEmail && (
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {customerEmail}
                    </span>
                  )}
                </div>
              </div>
              <dl
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 1 }),
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                )}
              >
                <div className={cm.flex({ justify: 'between' })}>
                  <dt>
                    {t('conversationDetail.context.channel', {}, { defaultValue: 'Channel' })}
                  </dt>
                  <dd className="font-semibold text-on-surface">
                    {conversation?.channel ?? 'web'}
                  </dd>
                </div>
                <div className={cm.flex({ justify: 'between' })}>
                  <dt>{t('nav.messages', {}, { defaultValue: 'Messages' })}</dt>
                  <dd className="font-semibold text-on-surface tabular-nums">
                    {conversation?.message_count ?? 0}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'tracking-widest uppercase text-on-surface-variant',
              )}
            >
              {t('conversationDetail.context.feedback', {}, { defaultValue: 'Rate this thread' })}
            </span>
            <div className={cm.cn(cm.flex({ gap: 2 }))}>
              <button
                data-mol-id="conversation-feedback-up"
                type="button"
                onClick={() => void handleFeedback(5)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 1 }),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  cm.touchTargetCompact,
                  'rounded-full bg-surface-container-low hover:bg-primary/10 px-3 py-1.5',
                )}
              >
                <span className="material-symbols-outlined text-base text-[var(--color-feedback-positive)]">
                  thumb_up
                </span>
                {t('conversationDetail.feedbackUp', {}, { defaultValue: 'Helpful' })}
              </button>
              <button
                data-mol-id="conversation-feedback-down"
                type="button"
                onClick={() => void handleFeedback(1)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 1 }),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  cm.touchTargetCompact,
                  'rounded-full bg-surface-container-low hover:bg-error/10 px-3 py-1.5',
                )}
              >
                <span className="material-symbols-outlined text-base text-[var(--color-feedback-negative)]">
                  thumb_down
                </span>
                {t('conversationDetail.feedbackDown', {}, { defaultValue: 'Not helpful' })}
              </button>
            </div>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
            <Link
              to="/knowledge"
              className={cm.cn(
                cm.textSize('sm'),
                'text-primary hover:text-primary-container transition-colors',
              )}
            >
              {t(
                'conversationDetail.context.kbLink',
                {},
                { defaultValue: 'Browse knowledge articles →' },
              )}
            </Link>
          </div>
        </aside>
      </div>
    </RapportLayout>
  )
}

export default ConversationDetail
export { ConversationDetail, ConversationDetail as ConversationDetailPage }
