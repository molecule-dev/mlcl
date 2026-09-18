---
name: in-app-chat
intent: |
  - "Let users chat with each other"
  - "DMs / direct messages between users"
  - "Customer support chat widget"
  - "Conversation thread"
  - "Real-time messaging"
  - "Use socket.io / websockets for live updates (the realtime-bond wiring pattern)"
keywords:
  [
    chat,
    message,
    dm,
    conversation,
    messaging,
    talk,
    realtime,
    socket.io,
    websocket,
    live,
    subscribe,
    broadcast,
  ]
---

# In-app chat (1-1 or threaded)

**When to copy this example:** the user wants any messaging UI inside
their app — DMs, support chat, group threads. The frontend primitives
(`MessageBubble`, `Composer`, `TypingIndicator`) work for all three.

## What you'll install

```bash
cd /workspace
npm install @molecule/app-message-bubble-react --workspace=app
npm install @molecule/app-typing-indicator-react --workspace=app
# Real-time delivery transport — pick one:
npm install @molecule/api-realtime-sse --workspace=api      # simplest
# OR
npm install @molecule/api-realtime-socketio --workspace=api # bidirectional
```

## Files in this example

| Path                        | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/bonds/realtime-sse.ts` | Wires SSE as the realtime bond at `path: '/api/realtime'` (under `/api` so the frontend reaches it through the same proxy as every API call), deferring the bind to `attachHttpServer` so it shares the API's own port. Same pattern for `-socketio` or `-ws`. **Registers the `onJoinRequest` guard** (only authenticated users, only `channel:<id>` rooms — this example has OPEN channels; for PRIVATE channels/DMs add a `channel_members` table and gate the join by membership, mirroring your HTTP read authz). |
| `api/handlers/messages.ts`  | Send + list messages. New messages `broadcast('channel:<id>', 'message:created', …)` over the realtime bond.                                                                                                                                                                                                                                                                                                                                                                                                           |
| `app/pages/ChatPage.tsx`    | Renders message list with `<MessageBubble>` + `<TypingIndicator>` + composer. Subscribes with `new EventSource('/api/realtime?room=channel:<id>')`.                                                                                                                                                                                                                                                                                                                                                                    |

## Using socket.io instead of SSE

The files above ship the **SSE** transport. Socket.io (bidirectional; what
every realtime flagship uses) is a drop-in swap of exactly TWO things — the
`onJoinRequest` guard and the `broadcast('channel:<id>', 'message:created', …)`
handler code stay **byte-for-byte identical** (both live on the
transport-agnostic realtime CORE, `@molecule/api-realtime`).

**1. The bond** — same as `realtime-sse.ts`, but the provider comes from
`@molecule/api-realtime-socketio` and takes NO `path` (socket.io answers at
`/socket.io`, not a custom path):

```ts
import { createProvider } from '@molecule/api-realtime-socketio'
import { onJoinRequest, setProvider } from '@molecule/api-realtime'
import { registerServerCreatedHook } from '@molecule/api-server-default-express'

export function setupRealtime(): void {
  const provider = createProvider({ deferAttach: true }) // shares the API port at /socket.io
  setProvider(provider)
  registerServerCreatedHook((server) => provider.attachHttpServer?.(server))
  onJoinRequest(async ({ room, auth, headers }) => {
    // ↓ IDENTICAL to the SSE guard — verify the session, allow only channel:<id> rooms.
    if (!/^channel:.+$/.test(room)) return false
    return verifiedUserId(auth, headers) !== null
  })
}
```

**2. The client** — replace the `EventSource` in `ChatPage.tsx` with a socket.io
subscription. Socket.io opens ONE connection (`connect('/')`), JOINS a room with
the `joinRoom(name)` METHOD (not a `?room=` query, not a path segment), listens
with `on(event, handler)`, and MUST clean up (`off` + `leaveRoom`) on unmount:

```ts
import { connect, type RealtimeConnection } from '@molecule/app-realtime'
// authClient from your auth bond (bonds/auth-default) — same token the HTTP client sends.

useEffect(() => {
  const room = `channel:${channelId}`
  let active = true
  let conn: RealtimeConnection | null = null
  const onCreated = (data: unknown) => {
    const msg = data as ApiMessage
    // Dedupe by id: your own optimistic append + the server's echo must not double.
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
  }
  // Pass the bearer token if your app uses Authorization headers (what the
  // flagships do); same-origin httpOnly-cookie auth needs no token — the
  // handshake sends the cookie, and the guard's verifiedUserId reads either.
  connect('/', { auth: { token: authClient.getAccessToken() } })
    .then((c) => {
      if (!active) return
      conn = c
      c.on('message:created', onCreated)
      return c.joinRoom(room) // ← subscribe AFTER on(); without joinRoom the socket is in no room
    })
    .catch(() => {
      /* realtime is best-effort; the initial fetch already populated the list */
    })
  return () => {
    active = false
    if (conn) {
      conn.off('message:created', onCreated)
      conn.leaveRoom(room).catch(() => {})
    }
  }
}, [channelId])
```

For MULTIPLE pages/components, lift `connect('/')` into a shared
`getRealtimeConnection()` singleton (cache the promise, drop it on logout) so the
whole app reuses one socket — see any realtime flagship's `app/src/lib/realtime.ts`.

**3. The Vite dev proxy** — `/socket.io` (including the WebSocket upgrade) must be
proxied to the API. `@molecule/app-vite-config-default` already does this, so a
socket.io `connect('/')` reaches the API in dev with zero config change.

## Anti-patterns

- Do not invent `@molecule/api-chat` or `@molecule/app-chat` — neither
  exists. The composition is real-time bond + message-bubble UI +
  your handler logic.
- Do not poll for new messages every 2s. Use the realtime bond.
- Do not join a room with a PATH SEGMENT (`/api/realtime/channel:<id>`).
  The SSE bond joins rooms via the `?room=` query at subscribe time —
  `new EventSource('/api/realtime?room=channel:<id>')`. A path segment
  neither matches the endpoint path nor joins the room, so the client
  receives nothing. The bond's `path` and the client URL must agree
  (`/api/realtime` here).
- (socket.io) Do not `connect()` and then listen WITHOUT `joinRoom()`. The
  socket opens in NO room, so the server's `broadcast('channel:<id>', …)` reaches
  it never — the classic "server broadcasts to nobody" silent no-op. The room
  name in `joinRoom('channel:<id>')` must EXACTLY equal the server's broadcast
  room string (a wrong room or event name is a silent miss, not an error). And a
  broadcast only works if the API actually BONDED a transport (`setProvider` +
  `attachHttpServer`, or `setupRealtimeSocketio()`) — a `broadcast(...)` with no
  bonded provider is itself a silent no-op.
- Do not leave `CURRENT_USER_ID = 'me'` in place — it's a placeholder for
  the `isSelf` bubble alignment. Fetch the authenticated user's real id
  (`GET /api/users/me`) or every message renders as the other party.
- Do not handle file uploads inside the chat handler. Wire the
  `uploads` bond separately and pass URLs.

## Verify

User A sends "hi" → user B sees it within 1s on the same chat page.
