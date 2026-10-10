import { type FormEvent, useEffect, useRef, useState } from 'react'

import type { MessageData } from '@molecule/app-message-bubble-react'
import { MessageBubble } from '@molecule/app-message-bubble-react'
import { useTranslation } from '@molecule/app-react'
import { TypingIndicator } from '@molecule/app-typing-indicator-react'
import { getClassMap } from '@molecule/app-ui'

type ApiMessage = {
  id: string
  user_id: string
  content: string
  created_at: string
  user_name?: string
}

const CURRENT_USER_ID = 'me'

function toMessageData(m: ApiMessage): MessageData {
  return {
    id: m.id,
    author: { id: m.user_id, name: m.user_name ?? m.user_id },
    body: m.content,
    timestamp: m.created_at,
  }
}

const cm = getClassMap()

export function ChatPage({ channelId }: { channelId: string }) {
  const { t } = useTranslation()
  const [messages, setMessages] = useState<ApiMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState(false)
  const [typing, setTyping] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  // The hide-typing timeout is held so the next `typing` event RESETS it
  // instead of stacking a second one (an earlier timer would otherwise flip
  // the indicator off while the peer is still typing), and so cleanup can
  // clear a pending one on unmount / channel switch.
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Switching rooms must never show the previous room's history: the state is
    // cleared up front (the fetch below fills it) instead of leaving room A's
    // messages on screen under room B.
    setMessages([])
    // A channel switch starts a NEW history request while the previous one may
    // still be in flight. Without this guard the LATE response wins and room A's
    // history is rendered under room B. Same guard as the paginated-user-list
    // example's page.
    let cancelled = false
    // Coerce the body to an array: a 500's `{ error }` JSON (or any non-list
    // payload) would otherwise reach the render and crash `messages.map`.
    fetch(`/api/messages?channel_id=${channelId}`)
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled) setMessages(Array.isArray(body) ? body : [])
      })
      .catch(() => {
        // A failed history load shows an empty room; SSE still delivers live messages.
        if (!cancelled) setMessages([])
      })

    // Join the room via the `?room=` query — the SSE bond's subscribe protocol.
    // (A `/channel:${id}` path SEGMENT does NOT join the room and never matches the
    // endpoint path, so no broadcasts arrive.) `withCredentials` sends the session cookie.
    const events = new EventSource(`/api/realtime?room=channel:${channelId}`, {
      withCredentials: true,
    })
    events.addEventListener('message:created', (e) => {
      const msg = JSON.parse((e as MessageEvent).data) as ApiMessage
      setMessages((prev) => [...prev, msg])
    })
    // Extension point: lights up when the server broadcasts a `typing` event to
    // this room. To wire it, add a POST route that calls
    // broadcast(`channel:${channelId}`, 'typing', { userId }) and emit it from the
    // composer's onChange (throttled); filter out your own id so you don't see it.
    events.addEventListener('typing', () => {
      setTyping(true)
      if (typingTimer.current) clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => setTyping(false), 2000)
    })
    return () => {
      cancelled = true
      events.close()
      // No timer outlives the room: without this, a `typing` event that
      // arrived just before unmount (or a channel switch) fires its timeout
      // into a stale component.
      if (typingTimer.current) clearTimeout(typingTimer.current)
    }
  }, [channelId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.length])

  async function send(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!draft.trim()) return
    setSendError(false)
    // The draft is cleared only after the server accepted the message: a
    // rejected or !ok POST (offline, validation) must keep the user's text in
    // the composer, not silently discard it.
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: channelId, content: draft }),
      })
      if (!res.ok) {
        setSendError(true)
        return
      }
      setDraft('')
    } catch (_error) {
      setSendError(true)
    }
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), 'h-screen')}>
      <div
        ref={listRef}
        className={cm.cn(
          cm.flex1,
          cm.flex({ direction: 'col', gap: 'sm' }),
          cm.sp('p', 4),
          'overflow-y-auto',
        )}
      >
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={toMessageData(m)}
            isSelf={m.user_id === CURRENT_USER_ID}
          />
        ))}
        {typing && <TypingIndicator />}
      </div>
      <form
        onSubmit={send}
        className={cm.flex({ direction: 'row', gap: 'sm' })}
        style={{ padding: '1rem' }}
      >
        {sendError ? (
          <p className={cm.textError}>
            {t('chat.sendFailed', undefined, {
              defaultValue: 'Message not sent — try again.',
            })}
          </p>
        ) : null}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('chat.composerPlaceholder', undefined, {
            defaultValue: 'Type a message…',
          })}
          className={cm.cn(cm.flex1, cm.input())}
        />
        <button type="submit" className={cm.button()}>
          {t('chat.send', undefined, { defaultValue: 'Send' })}
        </button>
      </form>
    </div>
  )
}
