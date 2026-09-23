import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface ThreadMessage {
  id: string
  fromHost: boolean
  body: string
  attachment_url?: string | null
  sent_at_iso: string
}

/** Shape of one message inside the endpoint's `{ thread, messages }` envelope. */
interface RawThreadMessage {
  id: string
  body: string
  is_self?: boolean
  attachments?: unknown[]
  created_at_iso: string
}

const FALLBACK_MESSAGES: ThreadMessage[] = [
  {
    id: 'tm1',
    fromHost: true,
    body: 'Hi! Got your booking request — wanted to confirm the freight elevator works for your team and that 14:00 setup is comfortable.',
    sent_at_iso: '2026-04-28T16:42:00Z',
  },
  {
    id: 'tm2',
    fromHost: false,
    body: 'Yes — we have a small lighting kit and two backdrop frames. We will arrive at 14:00 sharp.',
    sent_at_iso: '2026-04-28T16:55:00Z',
  },
  {
    id: 'tm3',
    fromHost: true,
    body: 'Sounds great — I will have the freight elevator unlocked from 14:30 onward. Photo of the breaker panel attached for your sound team.',
    attachment_url: 'https://picsum.photos/seed/alcove-msg-attach/600/400',
    sent_at_iso: '2026-04-28T17:42:00Z',
  },
]

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function MessageThread() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [messages, setMessages] = useState<ThreadMessage[]>(FALLBACK_MESSAGES)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  // Load the real thread; the demo fallback only stands in when the
  // API has nothing for this id yet. The endpoint answers the bespoke
  // `{ thread, messages }` envelope, so unwrapSingle hands back the
  // whole body for us to read `.messages` off.
  useEffect(() => {
    if (!id) return
    let cancelled = false
    http
      .get(`/api/messages/${encodeURIComponent(id)}`)
      .then((res) => {
        if (cancelled) return
        const body = unwrapSingle<{ messages?: RawThreadMessage[] }>(res)
        const list = body?.messages ?? []
        if (list.length > 0) {
          setMessages(
            list.map((m) => ({
              id: m.id,
              fromHost: !m.is_self,
              body: m.body,
              attachment_url:
                Array.isArray(m.attachments) && m.attachments.length > 0
                  ? String(m.attachments[0])
                  : null,
              sent_at_iso: m.created_at_iso,
            })),
          )
        }
      })
      .catch(() => {
        /* keep fallback */
      })
    return () => {
      cancelled = true
    }
  }, [http, id])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body || !id || sending) return
    setSending(true)
    const optimistic: ThreadMessage = {
      id: `tm-${Date.now()}`,
      fromHost: false,
      body,
      sent_at_iso: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    setDraft('')
    try {
      const res = await http.post(`/api/messages/${encodeURIComponent(id)}/messages`, { body })
      const saved = unwrapSingle<{ id: string; created_at_iso: string }>(res)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimistic.id
            ? { ...m, id: saved?.id ?? m.id, sent_at_iso: saved?.created_at_iso ?? m.sent_at_iso }
            : m,
        ),
      )
      // Domain event: guest↔host engagement.
      track({ name: 'message.sent', properties: { thread_id: id } })
    } catch (_error) {
      // Roll the optimistic bubble back out on a real rejection so the
      // user can retry instead of believing the host saw it.
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setDraft(body)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={cm.cn(cm.maxW('4xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <Link
        to="/messages"
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          cm.sp('mb', 4),
          'inline-flex items-center gap-1 text-primary hover:underline',
        )}
      >
        <span className={'material-symbols-outlined text-base'} aria-hidden="true">
          arrow_back
        </span>
        {t('messageThread.back', {}, { defaultValue: 'All conversations' })}
      </Link>

      <header
        className={cm.cn(
          cm.sp('p', 5),
          cm.sp('mb', 5),
          'bg-surface rounded-2xl border border-outline-variant/40',
          cm.flex({ align: 'center', gap: 'md' }),
        )}
      >
        <img
          src="https://picsum.photos/seed/alcove-host-maya/200/200"
          alt=""
          className={'w-14 h-14 rounded-full object-cover'}
        />
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 min-w-0')}>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('messageThread.host', {}, { defaultValue: 'Maya' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant truncate')}>
            {t('nav.about', {}, { defaultValue: 'About' })} · The Aerie Loft ·{' '}
            {t('messageThread.bookingDate', {}, { defaultValue: 'May 12 · 14:00–22:00' })}
          </p>
        </div>
        <Link
          to={`/reservations/${id ?? 'r_001'}`}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'rounded-full border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors text-sm hidden sm:inline',
          )}
        >
          {t('messageThread.viewBooking', {}, { defaultValue: 'View booking' })}
        </Link>
      </header>

      <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), cm.sp('mb', 6))}>
        {messages.map((m) => (
          <li key={m.id} className={cm.flex({ justify: m.fromHost ? 'start' : 'end' })}>
            <div className={cm.cn('max-w-[75%]', cm.flex({ direction: 'col', gap: 'xs' }))}>
              <div
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  'rounded-2xl shadow-sm',
                  m.fromHost
                    ? 'bg-surface-container-low border border-outline-variant/40 rounded-tl-sm'
                    : 'bg-primary text-on-primary rounded-tr-sm',
                )}
              >
                <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed whitespace-pre-wrap')}>
                  {m.body}
                </p>
                {m.attachment_url ? (
                  <img
                    src={m.attachment_url}
                    alt=""
                    className={cm.cn(cm.sp('mt', 3), 'rounded-lg max-w-xs')}
                  />
                ) : null}
              </div>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  m.fromHost ? '' : 'self-end',
                  'text-on-surface-variant',
                )}
              >
                {fmtTime(m.sent_at_iso)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <form
        onSubmit={send}
        className={cm.cn(
          cm.sp('p', 4),
          'bg-surface rounded-2xl border border-outline-variant/40',
          cm.flex({ align: 'end', gap: 'sm' }),
        )}
      >
        <button
          type="button"
          className={cm.cn(
            'w-10 h-10 rounded-full bg-surface-container-low text-on-surface-variant hover:text-primary flex items-center justify-center',
          )}
          aria-label={t('messageThread.attach', {}, { defaultValue: 'Add attachment' })}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            attach_file
          </span>
        </button>
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send(e as unknown as React.FormEvent)
            }
          }}
          placeholder={t('messageThread.placeholder', {}, { defaultValue: 'Reply to Maya…' })}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            'flex-1 bg-surface-container-low rounded-xl border border-outline-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none',
          )}
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'sm' }),
            'rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-md disabled:opacity-50',
          )}
        >
          <span className={'material-symbols-outlined text-xl'} aria-hidden="true">
            send
          </span>
          <span className={'hidden sm:inline'}>
            {t('common.send', {}, { defaultValue: 'Send' })}
          </span>
        </button>
      </form>
    </div>
  )
}
