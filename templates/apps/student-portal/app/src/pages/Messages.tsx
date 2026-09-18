import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type ApiMessage, timeAgo } from '../lib/format.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface ThreadRow extends ApiMessage {
  unread: number
}

const CHANNEL_TONE = {
  teacher: 'bg-primary/10 text-primary',
  parent: 'bg-success-light text-success',
  school: 'bg-warning-light text-warning',
  other: 'bg-surface-container text-on-surface-variant',
} as const

function classify(senderName: string | null | undefined): keyof typeof CHANNEL_TONE {
  const name = (senderName ?? '').toLowerCase()
  if (/principal|office|admin/.test(name)) return 'school'
  if (/mom|dad|parent|carter|family/.test(name)) return 'parent'
  if (/^(ms|mr|mx|dr|sra|sr|coach|prof)\b/i.test(senderName ?? '')) return 'teacher'
  return 'other'
}

function initials(name: string | null | undefined): string {
  const parts = (name ?? 'Student').split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

export function Messages() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [threads, setThreads] = useState<ThreadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [composerError, setComposerError] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await http.get('/api/messages/threads')
      setThreads(unwrapList<ThreadRow>(res))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/messages/threads')
      .then((res) => {
        if (cancelled) return
        setThreads(unwrapList<ThreadRow>(res))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const send = async () => {
    setComposerError(null)
    if (!content.trim()) {
      setComposerError(
        t('messages.composer.errorEmpty', {}, { defaultValue: 'Message cannot be empty.' }),
      )
      return
    }
    if (!recipientName.trim()) {
      setComposerError(
        t('messages.composer.errorRecipient', {}, { defaultValue: 'Recipient name is required.' }),
      )
      return
    }
    setSending(true)
    try {
      // Demo composer addresses a synthetic teacher account; if no email is
      // provided we still persist the message locally and skip the email
      // delivery step.
      const recipientId = `00000000-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padStart(12, '0')}`
      const res = await http.post('/api/messages', {
        recipient_id: recipientId,
        recipient_email: recipientEmail.trim() || undefined,
        sender_name: recipientName.trim(),
        content: content.trim(),
        notify_email: Boolean(recipientEmail.trim()),
      })
      const created = unwrapSingle<ApiMessage>(res)
      setComposerOpen(false)
      setRecipientName('')
      setRecipientEmail('')
      setContent('')
      await refresh()
      if (created?.thread_id) {
        navigate(`/messages/${created.thread_id}`)
      }
    } catch (error) {
      logError('messages.sendMessage', error)
      setComposerError(
        t(
          'messages.composer.errorSend',
          {},
          { defaultValue: 'We couldn’t send that — try again in a moment.' },
        ),
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }))} data-mol-id="page-messages">
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <p
            className={cm.cn(cm.textSize('sm'), 'font-bold uppercase tracking-widest text-primary')}
          >
            {t('nav.inbox', {}, { defaultValue: 'Inbox' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('nav.messages', {}, { defaultValue: 'Messages' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
            {t(
              'messages.subtitle',
              {},
              {
                defaultValue:
                  'Conversations with teachers, family members, and the front office — all in one quiet thread list.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          data-mol-id="messages-compose-open"
          onClick={() => setComposerOpen(true)}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'inline-flex items-center gap-2 rounded-full bg-primary text-on-primary font-semibold hover:bg-primary/90 transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            edit
          </span>
          {t('messages.compose', {}, { defaultValue: 'New message' })}
        </button>
      </header>

      {composerOpen && (
        <section
          data-mol-id="messages-composer"
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col gap-3',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
            {t('messages.composer.title', {}, { defaultValue: 'New message' })}
          </h2>
          <label className={cm.cn(cm.flex({ direction: 'col' }), cm.textSize('sm'))}>
            <span className={cm.cn('font-semibold mb-1')}>
              {t('messages.composer.recipient', {}, { defaultValue: 'Recipient name' })}
            </span>
            <input
              data-mol-id="composer-recipient-name"
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder={t(
                'messages.composer.recipientPlaceholder',
                {},
                { defaultValue: 'Ms. Tran' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-lg bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/40',
              )}
            />
          </label>
          <label className={cm.cn(cm.flex({ direction: 'col' }), cm.textSize('sm'))}>
            <span className={cm.cn('font-semibold mb-1')}>
              {t('messages.composer.email', {}, { defaultValue: 'Recipient email (optional)' })}
            </span>
            <input
              data-mol-id="composer-recipient-email"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="name@example.com"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-lg bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/40',
              )}
            />
          </label>
          <label className={cm.cn(cm.flex({ direction: 'col' }), cm.textSize('sm'))}>
            <span className={cm.cn('font-semibold mb-1')}>
              {t('messages.composer.message', {}, { defaultValue: 'Message' })}
            </span>
            <textarea
              data-mol-id="composer-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder={t(
                'messages.composer.messagePlaceholder',
                {},
                { defaultValue: 'Write a friendly note…' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-lg bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/40',
              )}
            />
          </label>
          {composerError && (
            <p
              data-mol-id="composer-error"
              className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
            >
              {composerError}
            </p>
          )}
          <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
            <button
              type="button"
              data-mol-id="composer-send"
              disabled={sending}
              onClick={send}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-full bg-primary text-on-primary font-semibold hover:bg-primary/90 disabled:opacity-50',
              )}
            >
              {sending
                ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                : t('messages.composer.send', {}, { defaultValue: 'Send message' })}
            </button>
            <button
              type="button"
              data-mol-id="composer-cancel"
              onClick={() => {
                setComposerOpen(false)
                setComposerError(null)
              }}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-full border border-outline-variant text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        </section>
      )}

      <section
        className={cm.cn(cm.sp('p', 4), 'rounded-2xl bg-surface-container-lowest shadow-sm')}
      >
        {loading ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('messages.loading', {}, { defaultValue: 'Loading messages…' })}
          </p>
        ) : threads.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('messages.empty', {}, { defaultValue: 'No messages yet.' })}
          </p>
        ) : (
          <ul className={cm.cn(cm.flex({ direction: 'col' }))}>
            {threads.map((th) => {
              const channel = classify(th.sender_name)
              const threadKey = th.thread_id ?? th.id
              return (
                <li key={th.id}>
                  <Link
                    data-mol-id={`message-thread-${threadKey}`}
                    to={`/messages/${threadKey}`}
                    className={cm.cn(
                      cm.flex({ align: 'start', gap: 'md' }),
                      cm.sp('px', 4),
                      cm.sp('py', 4),
                      'rounded-xl hover:bg-surface-container-low transition-colors border-b border-outline-variant/30 last:border-b-0',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.w(10),
                        cm.h(10),
                        cm.roundedFull,
                        cm.flex({ align: 'center', justify: 'center' }),
                        'shrink-0 font-bold text-[14px]',
                        CHANNEL_TONE[channel],
                      )}
                      aria-hidden="true"
                    >
                      {initials(th.sender_name)}
                    </span>
                    <div className={cm.cn('min-w-0 flex-1')}>
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                        )}
                      >
                        <p
                          className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface truncate')}
                        >
                          {th.sender_name ??
                            t('messages.unknownSender', {}, { defaultValue: 'Unknown sender' })}
                        </p>
                        <span
                          className={cm.cn(cm.textSize('xs'), 'shrink-0 text-on-surface-variant')}
                        >
                          {timeAgo(th.created_at)}
                        </span>
                      </div>
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.sp('mt', 1),
                          'leading-relaxed',
                          th.unread > 0 ? 'text-on-surface font-medium' : 'text-on-surface-variant',
                        )}
                      >
                        {th.content}
                      </p>
                    </div>
                    {th.unread > 0 && (
                      <span
                        aria-label={t('status.unread', {}, { defaultValue: 'Unread' })}
                        className={cm.cn(
                          cm.w(2),
                          cm.h(2),
                          cm.roundedFull,
                          'bg-primary mt-2 shrink-0',
                        )}
                      />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default Messages
export { Messages as MessagesPage }
