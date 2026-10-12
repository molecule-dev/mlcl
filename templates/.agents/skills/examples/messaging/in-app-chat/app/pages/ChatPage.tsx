import { type FormEvent, type ReactElement, useCallback, useEffect, useRef, useState } from 'react'

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
 * page. Keeping the NEWEST window bounds all three.
 *
 * What "the history" is here, plainly: `GET /api/messages?channel_id=` answers
 * the room's FIRST page — ascending by `created_at`, no `offset` (see
 * api/handlers/messages.ts) — so this page renders that opening page plus every
 * live frame that arrives, and anything between the two is NOT loaded. A room
 * longer than one page therefore has a gap the reader can scroll into. Wiring
 * "load older" over that endpoint's `offset` (and a `before=<created_at>` query
 * for the gap) is the app's job; the live feed must not accumulate it.
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

export function ChatPage({ channelId }: { channelId: string }): ReactElement {
  const { t } = useTranslation()
  const [messages, setMessages] = useState<ApiMessage[]>([])
  const [draft, setDraft] = useState('')
  // Whether this room's history READ failed (offline, a non-2xx, a 2xx body
  // that is not the list). The room effect clears the list up front, so without
  // this a failed load rendered an empty transcript — a wrong answer
  // indistinguishable from a genuinely empty room, with nothing to retry. The
  // sibling slices state the same rule at their own catches
  // (NotificationBell, AttachmentsPanel, Leaderboard, BlogIndexPage,
  // OrdersPage): a failed load is never presented as an empty one.
  const [loadFailed, setLoadFailed] = useState(false)
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
  // The in-flight send's ticket — the OWNERSHIP test for everything a send
  // writes after its await, not just for the flag. `sending` is ONE flag shared
  // by every send, so only the send that still OWNS it may clear it: a channel
  // switch releases the flag for the room being entered (the effect below), and
  // the send left behind in the old room must not release it a second time while
  // the new room's POST is still parked — that unfroze the composer mid-send and
  // let a double Enter post the same message twice (the endpoint has no
  // idempotency key).
  //
  // A monotonic ticket rather than a channel-name compare, and for the same
  // reason on every post-await write: switching A → B → A leaves an older A send
  // in flight under the SAME channel name, so `channelId === sentToChannel`
  // cannot tell it from a send the re-entered room started. Its late failure
  // then painted "Message not sent" into a room that never sent anything this
  // session, and its late success cleared a draft typed there (the text matched
  // the abandoned send's, so the guard that keeps newer typing could not help).
  // The ticket is bumped by exactly those two events — a room switch and a newer
  // send — so it is the room-and-session scope the writes actually need.
  const sendTicket = useRef(0)
  // The in-flight history read's ticket — the ownership test for everything the
  // read writes after its awaits, the same shape sendTicket applies to a send.
  // A room switch and a retry both start a NEW read while the previous one may
  // still be parked, and the LATE response must not win (a name compare cannot
  // tell A → B → A apart). Unmount bumps it too, so a late answer never writes
  // an unmounted component's state.
  const historySeq = useRef(0)

  /**
   * Load this room's first history page, merging in whatever the live feed
   * delivered while the request was in flight.
   *
   * A non-2xx — and a 2xx body that is not the list — is a FAILED load, never
   * an empty room: the failure body parsed as happily as the page did and was
   * then coerced to `[]`, so an outage rendered every room as if it had no
   * messages (`loadFailed` is what says otherwise, and the retry is how the
   * reader gets the room's real history back).
   */
  const loadHistory = useCallback(async (): Promise<void> => {
    const ticket = ++historySeq.current
    try {
      const res = await fetch(`/api/messages?channel_id=${encodeURIComponent(channelId)}`)
      // Superseded (room switch, retry, unmount)? The late answer writes nothing.
      if (ticket !== historySeq.current) return
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = (await res.json()) as unknown
      if (ticket !== historySeq.current) return
      if (!Array.isArray(body)) throw new Error('the answer is not a message list')
      const history: ApiMessage[] = body
      setLoadFailed(false)
      // MERGE rather than replace: a `message:created` frame can land while this
      // request is still in flight (the subscription is opened right after it,
      // and the response is a snapshot of the room taken BEFORE that message
      // existed), and `setMessages(history)` dropped it — the reader watched
      // their message appear and then vanish until a reload. The live arrivals
      // sitting in `prev` are the ones the history page does not have; a message
      // both know about is kept once. The window bound applies to the history
      // load too: the endpoint's page size is the server's, and a room must not
      // render an unbounded first page either (see MAX_RENDERED_MESSAGES).
      setMessages((prev) => {
        const inHistory = new Set(history.map((m) => m.id))
        return newestWindow([...history, ...prev.filter((m) => !inHistory.has(m.id))])
      })
    } catch (_error) {
      // A failed history load keeps whatever the live feed already delivered —
      // blanking them made a message the reader watched appear vanish until a
      // reload, the same "it vanished" symptom the success path's merge exists
      // for — and it is REPORTED, never rendered as an empty room (see
      // `loadFailed`). The rejection must not escape: nothing here awaits it.
      if (ticket !== historySeq.current) return
      setLoadFailed(true)
    }
  }, [channelId])

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
    // The previous room's history verdict goes with its rows — leaving it set
    // painted the old room's load failure over this one before its own read
    // answered.
    setLoadFailed(false)
    // The history read (see loadHistory): its ticket is what keeps a LATE
    // response from rendering room A's history under room B, and the channel id
    // rides the query string ENCODED — the id is DATA, and interpolated raw the
    // browser parses it as URL syntax: `#` starts a fragment (a channel `C#`
    // queried another room's history), `&` split it into a second parameter, and
    // `+` decoded back to a SPACE server-side. The POST body is JSON and carries
    // the id unchanged, so an unencoded read and write can even land in
    // different rooms.
    void loadHistory()

    // Join the room via the `?room=` query — the SSE bond's subscribe protocol.
    // (A `/channel:${id}` path SEGMENT does NOT join the room and never matches the
    // endpoint path, so no broadcasts arrive.) `withCredentials` sends the session cookie.
    //
    // The room NAME is encoded for the same reason the history request's channel
    // id is (see above): the provider reads it with `url.searchParams`, which
    // DECODES the value, so the wire form must be the encoded one. Raw, a room
    // named `C#` subscribed to `channel:C` (the fragment truncated the value) and
    // `c++` to `channel:c  ` (`+` decodes to a space) — the tab then received
    // another room's live messages while the reader believed they were in this
    // one, and `&` split the query into a second parameter. The notification
    // bell's `?room=${encodeURIComponent('user:' + userId)}` is the same shape.
    const events = new EventSource(
      `/api/realtime?room=${encodeURIComponent(`channel:${channelId}`)}`,
      {
        withCredentials: true,
      },
    )
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
      events.close()
      // No timer outlives the room: without this, a `typing` event that
      // arrived just before unmount (or a channel switch) fires its timeout
      // into a stale component.
      if (typingTimer.current) clearTimeout(typingTimer.current)
      // No in-flight history read outlives the room either: its ticket is dead,
      // so a late answer writes nothing.
      historySeq.current += 1
    }
  }, [channelId, loadHistory])

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
      // The user may have switched rooms while the POST was in flight — or left
      // and come BACK to this one, which a name compare cannot detect. The error
      // belongs to the session that sent it (and a late SUCCESS must not clear a
      // draft typed since), so the test is the send's own ticket: any room
      // switch and any newer send has taken it (see sendTicket).
      if (sendTicket.current !== ticket) return
      if (!res.ok) {
        setSendError(true)
        return
      }
      // Clear only what was SENT: text typed while the POST was in flight
      // (same room, so the channel guard above cannot help) must survive.
      setDraft((current) => (current.trim() === text ? '' : current))
    } catch (_error) {
      // Same ownership rule as the success path above (see sendTicket).
      if (sendTicket.current !== ticket) return
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
        {messages.length === 0 && loadFailed ? (
          // Nothing on screen AND the read failed: say so, and offer the retry —
          // an empty transcript over a failed load claims the room has no
          // messages. Rows already on screen keep priority below (the same rule
          // AttachmentsPanel applies): live frames that arrived are real rows,
          // not a failure to hide.
          <div
            className={cm.flex({ direction: 'col', align: 'center', gap: 'sm' })}
            role="alert"
            data-mol-id="chat-history-load-failed"
          >
            <p className={cm.textSize('sm')}>
              {t('chat.historyLoadFailed', undefined, {
                defaultValue: "Could not load this room's history — try again.",
              })}
            </p>
            <button
              type="button"
              onClick={() => void loadHistory()}
              data-mol-id="chat-history-retry"
              className={cm.button({ variant: 'ghost', size: 'sm' })}
            >
              {t('chat.retryHistory', undefined, { defaultValue: 'Try again' })}
            </button>
          </div>
        ) : null}
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
