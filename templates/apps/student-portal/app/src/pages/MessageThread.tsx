import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type ApiMessage, timeAgo } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

const ROLE_TONE = {
  me: 'bg-primary text-on-primary',
  teacher: 'bg-primary/10 text-primary',
  parent: 'bg-success-light text-success',
  school: 'bg-warning-light text-warning',
} as const

function classify(senderName: string | null | undefined): keyof typeof ROLE_TONE {
  const name = (senderName ?? '').toLowerCase()
  if (/principal|office|admin/.test(name)) return 'school'
  if (/parent|carter/.test(name)) return 'parent'
  return 'teacher'
}

function initials(name: string | null | undefined): string {
  const parts = (name ?? 'Me').split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

export function MessageThread() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<{ id?: string; name?: string; email?: string }>()
  const { id: threadId } = useParams<{ id: string }>()

  const [messages, setMessages] = useState<ApiMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const refresh = async () => {
    if (!threadId) return
    const res = await http.get(`/api/messages/thread/${encodeURIComponent(threadId)}`)
    setMessages(unwrapList<ApiMessage>(res))
  }

  useEffect(() => {
    if (!threadId) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/messages/thread/${encodeURIComponent(threadId)}`)
      .then((res) => {
        if (cancelled) return
        setMessages(unwrapList<ApiMessage>(res))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, threadId])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim() || !threadId) return
    setSending(true)
    try {
      // Reply: recipient is the original sender of the most-recent inbound
      // message in this thread; if none, fall back to a synthetic id so the
      // POST validates.
      const otherUserId =
        messages.find((m) => m.user_id !== user?.id)?.user_id ??
        '00000000-0000-4000-8000-000000000000'
      await http.post('/api/messages', {
        recipient_id: otherUserId,
        thread_id: threadId,
        sender_name: user?.name ?? user?.email ?? 'Me',
        content: draft.trim(),
      })
      setDraft('')
      void track({ name: 'message.sent', properties: { threadId } })
      await refresh()
    } finally {
      setSending(false)
    }
  }

  const headerSender = messages.find((m) => m.user_id !== user?.id)?.sender_name ?? 'Conversation'

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}
      data-mol-id="page-message-thread"
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.textSize('sm'),
          'text-on-surface-variant',
        )}
      >
        <Link to="/messages" className={cm.cn('hover:text-primary font-semibold')}>
          {t('nav.inbox', {}, { defaultValue: 'Inbox' })}
        </Link>
        <span aria-hidden="true">/</span>
        <span className={cm.cn('text-on-surface font-bold')}>{headerSender}</span>
      </div>

      <header
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md' }),
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest shadow-sm',
        )}
      >
        <span
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'bg-primary/10 text-primary font-bold',
          )}
        >
          {initials(headerSender)}
        </span>
        <div>
          <p
            className={cm.cn(cm.textSize('xs'), 'font-bold uppercase tracking-widest text-primary')}
          >
            {t('messageThread.eyebrow', {}, { defaultValue: 'Conversation' })}
          </p>
          <h1 className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight')}>
            {t('messageThread.with', { name: headerSender }, { defaultValue: 'With {{name}}' })}
          </h1>
        </div>
      </header>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col gap-6 max-w-3xl w-full mx-auto min-h-[160px]',
        )}
      >
        {loading ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : messages.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('messageThread.empty', {}, { defaultValue: 'No messages in this thread yet.' })}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.user_id === user?.id
            const role = mine ? 'me' : classify(m.sender_name)
            return (
              <article
                key={m.id}
                data-mol-id={`thread-message-${m.id}`}
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 'sm' }),
                  mine ? 'flex-row-reverse text-right' : '',
                )}
              >
                <span
                  className={cm.cn(
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    'shrink-0 font-bold',
                    ROLE_TONE[role],
                  )}
                  aria-hidden="true"
                >
                  {initials(m.sender_name ?? (mine ? user?.name : 'Sender'))}
                </span>
                <div className={cm.cn('min-w-0 flex-1')}>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'baseline', gap: 'sm' }),
                      mine ? 'justify-end' : '',
                    )}
                  >
                    <p className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface')}>
                      {m.sender_name ?? (mine ? (user?.name ?? 'Me') : 'Sender')}
                    </p>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {timeAgo(m.created_at)}
                    </span>
                  </div>
                  <p
                    className={cm.cn(
                      cm.sp('mt', 1),
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'rounded-2xl text-sm leading-relaxed inline-block max-w-prose whitespace-pre-line',
                      mine
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-on-surface',
                    )}
                  >
                    {m.content}
                  </p>
                </div>
              </article>
            )
          })
        )}
      </section>

      <form
        className={cm.cn(
          cm.sp('p', 4),
          'rounded-2xl bg-surface-container-lowest shadow-sm max-w-3xl w-full mx-auto',
        )}
        onSubmit={send}
      >
        <label htmlFor="reply" className={cm.cn('sr-only')}>
          {t('messageThread.replyLabel', {}, { defaultValue: 'Type a reply' })}
        </label>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <input
            id="reply"
            data-mol-id="thread-reply-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t(
              'messageThread.replyPlaceholder',
              {},
              { defaultValue: 'Write a friendly reply…' },
            )}
            className={cm.cn(
              cm.flex1,
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-full bg-surface-container-low border-none text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40',
            )}
          />
          <button
            type="submit"
            data-mol-id="thread-reply-send"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              'inline-flex items-center gap-2 rounded-full bg-primary text-on-primary font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50',
            )}
            disabled={!draft.trim() || sending}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              send
            </span>
            {sending
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('common.send', {}, { defaultValue: 'Send' })}
          </button>
        </div>
      </form>
    </div>
  )
}

export default MessageThread
export { MessageThread as MessageThreadPage }
