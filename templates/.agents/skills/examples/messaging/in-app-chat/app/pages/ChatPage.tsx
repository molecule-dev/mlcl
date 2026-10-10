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

/**
 * How many messages a room keeps rendered at once.
 *
 * `message:created` events are APPENDED by the SSE subscription below, so an
 * open room that stays on screen accumulated every message it ever received —
 * the array, the React tree and the DOM all grew with the session (a busy
 * channel reaches thousands), while the initial history load stayed at one
 * page. Keeping the NEWEST window bounds all three; that is the end of the
 * conversation the reader is looking at, and a room's earlier history is the
 * load above (`GET /api/messages?channel_id=`, see api/handlers/messages.ts),
 * not the live feed's to accumulate.
 */
const MAX_RENDERED_MESSAGES = 200

/** Keep only the newest `MAX_RENDERED_MESSAGES` — applied on every state write. */
function newestWindow(messages: ApiMessage[]): ApiMessage[] {
  return messages.slice(-MAX_RENDERED_MESSAGES)
}

/**
 * Parse one `message:created` frame, or null when the frame carries no message.
 *
 * A realtime frame is untrusted input: the SSE wire format puts ANYTHING after
 * `data:` on the wire (a `data: pong` keep-alive from a proxy, a payload
 * published by another writer in the room), and this frame goes straight into
 * the message list. An unvalidated value is dereferenced during render
 * (`toMessageData` reads `m.id`), so a frame whose payload is `null` — or any
 * other non-object — THREW `TypeError: Cannot read properties of null` out of
 * the render, and React unmounts a component that throws: the whole page went
 * blank, composer included. A frame that is not JSON at all threw `SyntaxError`
 * out of the listener itself.
 *
 * So: drop anything that is not an object carrying the string `id` the list
 * keys and maps on. Dropping is the right failure here — the history load
 * (`GET /api/messages`) is the durable record, and the live feed is
 * best-effort.
 *
 * @param data - The raw `event.data` string of one SSE frame.
 * @returns The frame's message, or null when the frame is not one.
 */
function parseMessageFrame(data: string): ApiMessage | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch (_error) {
    // Not JSON (a proxy keep-alive, a truncated payload) — nothing to render.
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const id = (parsed as { id?: unknown }).id
  if (typeof id !== 'string' || id.length === 0) return null
  return parsed as ApiMessage
}

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
  // A send in flight. Without it the composer stays live and a double Enter /
  // double click fires two identical POSTs — two duplicate messages, since the
  // endpoint has no idempotency key to collapse them.
  const [sending, setSending] = useState(false)
  const [typing, setTyping] = useState(false)
  // The signed-in user's real id — the server stamps every message with the
  // SESSION's userId (see api/handlers/messages.ts), so `isSelf` must compare
  // against that, never a placeholder: a literal like 'me' matches no row and
  // every message, the viewer's own included, renders as the other party.
  const [meId, setMeId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  // The hide-typing timeout is held so the next `typing` event RESETS it
  // instead of stacking a second one (an earlier timer would otherwise flip
  // the indicator off while the peer is still typing), and so cleanup can
  // clear a pending one on unmount / channel switch.
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The channel the CURRENT render belongs to. `send` captures the channel it
  // was invoked for; comparing the two after the POST's await keeps a late
  // response (error or success) from writing the room the user already left —
  // the same room-scoping the effect below enforces for history and typing.
  const activeChannelRef = useRef(channelId)
  activeChannelRef.current = channelId
  // The in-flight send's ticket. `sending` is ONE flag shared by every send, so
  // only the send that still OWNS it may clear it: a channel switch releases the
  // flag for the room being entered (the effect below), and the send left behind
  // in the old room must not release it a second time while the new room's POST
  // is still parked — that unfroze the composer mid-send and let a double Enter
  // post the same message twice (the endpoint has no idempotency key). A
  // monotonic ticket rather than a channel compare: switching A → B → A leaves an
  // older A send in flight under the same channel name, and its late release
  // would unfreeze the newer A send just the same.
  const sendTicket = useRef(0)

  useEffect(() => {
    // Own messages align right only once the viewer's id is known. The body is
    // the framework user resource's readSelf (GET /users/me), which WRAPS the
    // row — `{ props: { id, … } }`, plus an optional `plan` /
    // `twoFactorEnabled` — because createRequestHandler sends the handler's
    // body verbatim. Reading a top-level `id` off that body left `meId` null and
    // every message, the viewer's own included, rendered as the other party —
    // the exact symptom this id is fetched to avoid. A flat body is still
    // accepted, so a hand-rolled `/users/me` that returns the row directly (or
    // its `{ id }`) keeps working.
    let cancelled = false
    fetch('/api/users/me')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((body: unknown) => {
        const p = (body ?? {}) as { id?: unknown; props?: { id?: unknown } }
        const id = p.props?.id ?? p.id
        if (!cancelled && typeof id === 'string') setMeId(id)
      })
      .catch(() => {
        // Unresolvable (signed out, offline): every bubble renders as the other
        // party until the fetch succeeds on a later mount — history and the
        // live feed are unaffected.
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    // Switching rooms must never show the previous room's history: the state is
    // cleared up front (the fetch below fills it) instead of leaving room A's
    // messages on screen under room B.
    setMessages([])
    // The typing indicator and a send failure are room-scoped for the same
    // reason. The cleanup below clears the hide-typing TIMER, and clearing it
    // without resetting the flag the timer exists to clear left room B showing
    // "peer is typing" for a peer typing in A — with no timer left to turn it
    // off, so it stayed on screen until the next `typing` event or an unmount.
    setTyping(false)
    setSendError(false)
    // The in-flight send belonged to the room being left; the new room's
    // composer must not stay disabled waiting for it. Bumping the ticket is what
    // makes that release stick: the abandoned send's own completion path would
    // otherwise clear the flag again (see sendTicket).
    sendTicket.current += 1
    setSending(false)
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
        if (cancelled) return
        const history: ApiMessage[] = Array.isArray(body) ? body : []
        // The window bound applies to the history load too: the endpoint's page
        // size is the server's, and a room must not render an unbounded first
        // page either (see MAX_RENDERED_MESSAGES).
        //
        // MERGE rather than replace: a `message:created` frame can land while
        // this request is still in flight (the subscription is opened right
        // after it, and the response is a snapshot of the room taken BEFORE
        // that message existed), and `setMessages(history)` dropped it — the
        // reader watched their message appear and then vanish until a reload.
        // The live arrivals sitting in `prev` are the ones the history page
        // does not have; a message both know about is kept once.
        setMessages((prev) => {
          const inHistory = new Set(history.map((m) => m.id))
          return newestWindow([...history, ...prev.filter((m) => !inHistory.has(m.id))])
        })
      })
      .catch(() => {
        // A failed history load keeps whatever the live feed already delivered.
        // The effect cleared the list UP FRONT, so the only rows in state are
        // `message:created` frames that arrived for THIS room while the request
        // was in flight — blanking them made a message the reader watched appear
        // vanish until a reload, the same "it vanished" symptom the success
        // path's merge above exists for. Nothing to restore when none arrived
        // (the room renders empty, which is what the reset already said).
      })

    // Join the room via the `?room=` query — the SSE bond's subscribe protocol.
    // (A `/channel:${id}` path SEGMENT does NOT join the room and never matches the
    // endpoint path, so no broadcasts arrive.) `withCredentials` sends the session cookie.
    const events = new EventSource(`/api/realtime?room=channel:${channelId}`, {
      withCredentials: true,
    })
    events.addEventListener('message:created', (e) => {
      // Untrusted frame — see parseMessageFrame: an unvalidated payload crashed
      // the render (null) or threw out of this listener (non-JSON).
      const msg = parseMessageFrame((e as MessageEvent).data)
      if (!msg) return
      // Append, then keep the newest window: unbounded, this array (and the
      // message list it renders) grew with the session — see
      // MAX_RENDERED_MESSAGES.
      setMessages((prev) => newestWindow([...prev, msg]))
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
    const text = draft.trim()
    // `sending` is what makes a double submit idempotent: the second Enter
    // while the first POST is parked would otherwise send the same content
    // again (the endpoint has no key to dedupe on).
    if (!text || sending) return
    setSendError(false)
    setSending(true)
    // This send owns the `sending` flag until a newer one (or a room switch)
    // takes the ticket — see sendTicket.
    const ticket = ++sendTicket.current
    const sentToChannel = channelId
    // The draft is cleared only after the server accepted the message: a
    // rejected or !ok POST (offline, validation) must keep the user's text in
    // the composer, not silently discard it.
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: sentToChannel, content: text }),
      })
      // The user may have switched rooms while the POST was in flight. The
      // error belongs to the room it was sent FROM (and a late SUCCESS must not
      // clear the draft they have since typed into the new room's composer) —
      // the effect on a channel change already reset both.
      if (activeChannelRef.current !== sentToChannel) return
      if (!res.ok) {
        setSendError(true)
        return
      }
      // Clear only what was SENT: text typed while the POST was in flight
      // (same room, so the channel guard above cannot help) must survive.
      setDraft((current) => (current.trim() === text ? '' : current))
    } catch (_error) {
      if (activeChannelRef.current !== sentToChannel) return
      setSendError(true)
    } finally {
      // Only the send that still owns the flag may release it: an abandoned
      // send's late completion must not unfreeze the composer while a newer
      // POST is parked (see sendTicket).
      if (sendTicket.current === ticket) setSending(false)
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
            isSelf={meId !== null && m.user_id === meId}
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
        <button type="submit" disabled={sending} className={cm.button()}>
          {t('chat.send', undefined, { defaultValue: 'Send' })}
        </button>
      </form>
    </div>
  )
}
