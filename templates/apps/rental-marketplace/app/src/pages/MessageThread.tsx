import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface ThreadHeader {
  id: string
  listing_id: string | null
  listing_title: string | null
  thumbnail_url?: string | null
  other_party_name: string | null
  other_party_photo: string | null
  other_party_is_host: boolean
  last_message?: string | null
  last_message_at?: string | null
}

interface Message {
  id: string
  thread_id: string
  sender_id: string
  sender_name: string | null
  body: string
  created_at_iso: string
  is_self: boolean
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function MessageThread() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [thread, setThread] = useState<ThreadHeader | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const refresh = async (): Promise<void> => {
    if (!id) return
    const res = (await http.get(`/api/messages/threads/${id}`)) as
      | { thread: ThreadHeader; messages: Message[] }
      | { data: { thread: ThreadHeader; messages: Message[] } }
    const obj = (res ?? {}) as Record<string, unknown>
    const payload = (
      'thread' in obj ? obj : ((obj.data as Record<string, unknown> | undefined) ?? obj)
    ) as {
      thread: ThreadHeader
      messages: Message[]
    }
    if (payload?.thread) {
      setThread(payload.thread)
      setMessages(payload.messages ?? [])
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    refresh()
      .catch(() => {
        if (!cancelled) {
          setThread(null)
          setMessages([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, id])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const grouped = useMemo(() => {
    const groups: { day: string; messages: Message[] }[] = []
    for (const m of messages) {
      const day = fmtDay(m.created_at_iso)
      const last = groups[groups.length - 1]
      if (last && last.day === day) last.messages.push(m)
      else groups.push({ day, messages: [m] })
    }
    return groups
  }, [messages])

  if (loading) {
    return (
      <div
        className={cm.cn(
          cm.maxW('2xl'),
          cm.sp('px', 6),
          cm.sp('py', 8),
          cm.mxAuto,
          'h-96 bg-surface-container animate-pulse rounded-2xl',
        )}
      />
    )
  }
  if (!thread) {
    return (
      <div
        className={cm.cn(cm.maxW('xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto, cm.textCenter)}
      >
        <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t('messageThread.notFound', {}, { defaultValue: 'Conversation not found.' })}
        </p>
        <Link
          to="/messages"
          className={cm.cn(
            cm.sp('mt', 6),
            cm.sp('px', 5),
            cm.sp('py', 2),
            'inline-block rounded-full bg-primary text-on-primary font-semibold',
          )}
        >
          {t('messageThread.backToInbox', {}, { defaultValue: 'Back to inbox' })}
        </Link>
      </div>
    )
  }

  return (
    <div
      className={cm.cn(
        cm.maxW('2xl'),
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.mxAuto,
        cm.flex({ direction: 'col', gap: 'md' }),
        'min-h-[calc(100vh-6rem)]',
      )}
    >
      <header
        className={cm.cn(
          cm.sp('p', 4),
          cm.flex({ align: 'center', gap: 'md' }),
          'bg-surface rounded-2xl shadow-sm',
        )}
      >
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
        <div className={'flex-1 min-w-0'}>
          <p
            className={cm.cn(cm.fontWeight('bold'))}
            style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
          >
            {thread.other_party_name ??
              t(
                'messageThread.anonName',
                { appName: APP_NAME },
                { defaultValue: '{{appName}} member' },
              )}
          </p>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-primary-dark',
            )}
          >
            {thread.other_party_is_host
              ? t('messageThread.hostBadge', {}, { defaultValue: 'Host' })
              : t('messageThread.guestBadge', {}, { defaultValue: 'Guest' })}
          </p>
        </div>
        {thread.listing_id ? (
          <Link
            to={`/listings/${thread.listing_id}`}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'rounded-full border border-outline-variant uppercase tracking-widest hover:border-primary hover:text-primary',
            )}
          >
            {t('messageThread.viewListing', {}, { defaultValue: 'View listing' })}
          </Link>
        ) : null}
      </header>

      <div ref={scrollRef} className={cm.cn('flex-1 space-y-6 overflow-y-auto')}>
        {grouped.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('py', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            {t('messageThread.empty', {}, { defaultValue: 'No messages yet — say hello.' })}
          </p>
        ) : (
          grouped.map((group) => (
            <div key={group.day} className={'space-y-3'}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.textCenter,
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {group.day}
              </p>
              {group.messages.map((m) => (
                <div
                  key={m.id}
                  className={cm.cn('flex', m.is_self ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.maxW('lg'),
                      'rounded-2xl shadow-sm',
                      m.is_self
                        ? 'bg-primary text-on-primary rounded-br-sm'
                        : 'bg-surface rounded-bl-sm',
                    )}
                  >
                    <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed whitespace-pre-wrap')}>
                      {m.body}
                    </p>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('mt', 1),
                        m.is_self ? 'text-white/70' : 'text-on-surface-variant',
                        'tabular-nums',
                      )}
                    >
                      {fmtTime(m.created_at_iso)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!id || !draft.trim() || sending) return
          setSending(true)
          setSendError(null)
          try {
            await http.post(`/api/messages/threads/${id}`, { body: draft.trim() })
            setDraft('')
            await refresh()
          } catch (err) {
            const ex = err as { message?: string }
            setSendError(
              ex?.message ??
                t('messageThread.sendError', {}, { defaultValue: 'Could not send. Try again.' }),
            )
          } finally {
            setSending(false)
          }
        }}
        className={cm.cn(
          cm.sp('p', 2),
          cm.flex({ align: 'center', gap: 'sm' }),
          'bg-surface rounded-full shadow-md border border-outline-variant',
        )}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t(
            'messageThread.placeholder',
            { name: thread.other_party_name ?? APP_NAME },
            { defaultValue: 'Reply to {{name}}…' },
          )}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'flex-1 bg-transparent border-0 outline-none',
          )}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className={cm.cn(
            cm.w(11),
            cm.h(11),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            'bg-primary text-on-primary hover:bg-primary-container disabled:opacity-60',
          )}
          aria-label={t('messageThread.send', {}, { defaultValue: 'Send message' })}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {sending ? 'hourglass_top' : 'send'}
          </span>
        </button>
      </form>
      {sendError ? (
        <p className={cm.cn(cm.textSize('xs'), cm.sp('px', 4), 'text-error')}>{sendError}</p>
      ) : null}
    </div>
  )
}
