import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ChatShell } from '../components/ChatShell.js'
import ParentMessage from '../components/ParentMessage.js'
import ReplyInput from '../components/ReplyInput.js'
import ThreadHeader from '../components/ThreadHeader.js'

interface Reply {
  id?: string | number
  user_name?: string
  content?: string
  created_at?: string
  avatar?: string
}

function Thread() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { channelId, messageId } = useParams<{ channelId: string; messageId: string }>()
  const http = useHttpClient()
  const [parentMessage, setParentMessage] = useState<Record<string, unknown> | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [newReply, setNewReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  useEffect(() => {
    if (!messageId) return
    setLoading(true)
    Promise.all([
      http
        .get<Record<string, unknown>>(`/api/messages/${messageId}`)
        .then((res) => setParentMessage(res.data ?? null))
        .catch((error: unknown) => {
          // A missing/unreachable parent renders the "Thread not found" state.
          logError('thread.fetchParentMessage', error)
          setParentMessage(null)
        }),
      http
        .get<Reply[] | { data: Reply[] }>(`/api/threads/${messageId}/replies`)
        .then((res) => {
          const body = res.data
          setReplies(Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [])
        })
        .catch((error: unknown) => {
          // Replies degrade to an empty list under the parent message.
          logError('thread.fetchReplies', error)
          setReplies([])
        }),
    ]).finally(() => setLoading(false))
  }, [http, messageId])

  const sendReply = useCallback(async () => {
    if (!newReply.trim() || sending || !messageId) return
    setSending(true)
    try {
      const res = await http.post<Reply | { data: Reply }>(`/api/threads/${messageId}/replies`, {
        content: newReply,
      })
      const body = res.data
      const created = body && 'data' in body ? body.data : body
      if (created) setReplies((prev) => [...prev, created])
      setNewReply('')
      setSendError(null)
      // Domain analytics: the thread-reply funnel's success point.
      track({
        name: 'thread.reply_sent',
        properties: {
          thread_id: String(messageId ?? ''),
          channel_id: String(channelId ?? ''),
          reply_id: String((created as { id?: string | number })?.id ?? ''),
        },
      })
    } catch (error) {
      // Keep the typed draft in the composer so the user can retry, and tell
      // them the send failed instead of only logging it.
      logError('thread.sendReply', error)
      setSendError(
        t('thread.replyError', {}, { defaultValue: 'Reply failed to send — try again.' }),
      )
    } finally {
      setSending(false)
    }
  }, [http, newReply, messageId, channelId, sending, t])

  if (loading) {
    return (
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.h('screen'))}>
        <div
          data-mol-id="thread-loading"
          className={cm.cn(
            cm.w(8),
            cm.h(8),
            cm.roundedFull,
            'border-4 border-primary border-t-transparent animate-spin',
          )}
          aria-label={t('common.loading', {}, { defaultValue: 'Loading' })}
        />
      </div>
    )
  }

  if (!parentMessage) {
    return (
      <div
        data-mol-id="thread-not-found"
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.h('screen'),
        )}
      >
        <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('medium'))}>
          {t('thread.notFound', {}, { defaultValue: 'Thread not found.' })}
        </p>
      </div>
    )
  }

  return (
    /* The shell owns the nav chrome; the thread (header + feed + composer) is
       page content in a bounded flex column. */
    <ChatShell
      className={cm.cn(
        cm.surface,
        cm.h('screen'),
        'text-on-surface selection:bg-primary-container/30 overflow-hidden',
      )}
      contentClassName={cm.cn(cm.flex({ direction: 'col' }), 'min-h-0 min-w-0 bg-surface')}
    >
      {/* ThreadHeader */}
      <ThreadHeader channelId={channelId} />
      {/* Thread Feed */}
      <div
        className={cm.cn(
          cm.flex1,
          'min-h-0 overflow-y-auto no-scrollbar px-4 py-5 md:px-12 md:py-8',
        )}
      >
        <div className={cm.cn(cm.maxW('4xl'), cm.mxAuto, cm.stack(10))}>
          {/* Parent Message */}
          <div data-mol-id="thread-parent">
            <ParentMessage message={parentMessage} />
          </div>
          {/* Replies */}
          <div
            data-mol-id="thread-replies"
            className={cm.cn(
              cm.stack(8),
              'border-l-2 border-surface-container-high/50 pl-4 md:pl-10',
            )}
          >
            {replies.map((reply, i) => (
              <div key={reply.id ?? i} className={cm.flex({ gap: 4 })}>
                <div className={cm.shrink0}>
                  {reply.avatar ? (
                    <img
                      className={cm.cn(cm.w(10), cm.h(10), 'rounded-xl object-cover shadow-sm')}
                      src={String(reply.avatar)}
                      alt={String(
                        reply.user_name ?? t('common.user', {}, { defaultValue: 'User' }),
                      )}
                    />
                  ) : (
                    <div
                      className={cm.cn(
                        cm.w(10),
                        cm.h(10),
                        cm.flex({ align: 'center', justify: 'center' }),
                        'rounded-xl bg-gradient-to-br from-primary-container to-primary text-sm font-bold text-on-primary shadow-sm',
                      )}
                      aria-hidden="true"
                    >
                      {String(reply.user_name || 'U')
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
                <div className={cm.flex1}>
                  <div className={cm.cn(cm.flex({ align: 'baseline', gap: 2 }), cm.sp('mb', 1))}>
                    <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                      {String(reply.user_name ?? t('common.user', {}, { defaultValue: 'User' }))}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('medium'),
                        'text-on-surface-variant',
                      )}
                    >
                      {reply.created_at
                        ? new Date(String(reply.created_at)).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : ''}
                    </span>
                  </div>
                  <div
                    className={cm.cn(cm.sp('p', 4), 'bg-surface-container-highest/30 rounded-xl')}
                  >
                    <p className={cm.cn('text-on-surface body-md leading-relaxed')}>
                      {String(reply.content ?? '')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {replies.length === 0 && (
              <p
                data-mol-id="thread-replies-empty"
                className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
              >
                {t(
                  'thread.noReplies',
                  {},
                  { defaultValue: 'No replies yet — start the thread below.' },
                )}
              </p>
            )}
          </div>
        </div>
      </div>
      {sendError && (
        <p
          role="alert"
          data-mol-id="thread-reply-error"
          className={cm.cn(cm.textSize('sm'), 'px-4 pb-1 text-error md:px-12')}
        >
          {sendError}
        </p>
      )}
      <ReplyInput value={newReply} onChange={setNewReply} onSend={sendReply} disabled={sending} />
    </ChatShell>
  )
}

export default Thread
export { Thread, Thread as ThreadPage }
