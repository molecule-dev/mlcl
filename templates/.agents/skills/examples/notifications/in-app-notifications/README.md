---
name: in-app-notifications
intent: |
  - "Notifications"
  - "Notification center"
  - "Bell icon with unread count"
  - "Activity feed"
  - "Tell users when something happens"
keywords: [notifications, bell, alerts, activity, unread, badge]
---

# In-app notifications (bell + dropdown + unread badge)

**When to copy this example:** the user wants any "tell users when
something happens" UI inside the app. Likes, mentions, follows,
order status changes, system alerts.

## What you'll install

```bash
cd /workspace
npm install @molecule/api-realtime-sse --workspace=api          # live updates (SSE provider)
npm install @molecule/app-notification-badge-react --workspace=app  # bell icon + count badge
npm install @molecule/app-notification-center-react --workspace=app  # dropdown notification panel
```

## Files in this example

| Path                                  | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/bonds/realtime-sse.ts`           | Wires SSE as the realtime bond (defers the bind to `attachHttpServer` so it shares the API's own port). Call `setupRealtime()` from your `bonds.ts` — without it `/api/realtime/*` is never mounted and the bell receives nothing. **Registers the `onJoinRequest` guard** so a user can subscribe ONLY to their own `user:<userId>` room — without it any client could `EventSource('/api/realtime/user:<anyone>')` and read another user's notifications (a realtime IDOR). |
| `api/handlers/notifications.ts`       | `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/mark-all-read`, plus an exported `notify(recipientId, fields)` helper to emit one. Broadcasts to the recipient's `user:<userId>` room.                                                                                                                                                                                                                                                             |
| `app/components/NotificationBell.tsx` | Bell icon with unread count badge (`NotificationWrapper`) + dropdown panel (`NotificationCenter`). Takes a `userId` prop and subscribes to that user's SSE room for live increments.                                                                                                                                                                                                                                                                                          |
| `app/locales/en/notifications.ts`     | Empty-state copy + per-type strings ("Alice liked your post").                                                                                                                                                                                                                                                                                                                                                                                                                |

## Realtime wiring (the part that silently breaks)

A client subscribes to `GET /api/realtime/<room>` (the room is the **trailing
path segment**) and receives every `broadcast(<room>, …)`. **The room name must
match on both sides.** For per-user notifications the room is `user:<userId>`:

- Handler: `broadcast(`user:${userId}`, 'notification:created', …)`
- Bell: `new EventSource(`/api/realtime/user:${userId}`)` — so `<NotificationBellWidget userId={currentUser.id} />`.

Because the bell needs the current user's id to name its room, pass it as a prop
(the same way the chat example passes `channelId`). A hardcoded `/api/realtime/me`
does NOT work — there is no server-side "me" → session-user resolution; it just
joins a literal room named `me` that nothing broadcasts to.

**Emitting a notification** closes the loop. When a feature fires an event
(someone likes a post, an order ships), call the exported helper from that
handler — it persists the row AND broadcasts `notification:created` to the
recipient's room in one step:

```ts
import { notify } from '../handlers/notifications.js'
// inside your like/follow/order handler:
await notify(post.author_id, { type: 'like', actor_name: liker.name, subject_title: post.title })
```

Do the emit from the triggering handler, not the recipient's request — the
recipient may be offline, and the point of the bell is that it lights up anyway.

## Anti-patterns

- Do not invent `@molecule/app-notifications` or
  `@molecule/app-notification-bell-react` — those aren't real. On the app
  side, compose `@molecule/app-notification-badge-react` (bell + count badge)
  with `@molecule/app-notification-center-react` (dropdown panel); the API
  side is realtime + a normal `notifications` table.
- Note `@molecule/api-notifications` IS real, but it's a DIFFERENT feature:
  outbound ops/event alerts fanned out to Slack / email / webhook channels
  (`notifyAll()`) — not this user-facing in-app center. Don't reach for it
  here; do use it when you want to alert an external channel on an event.
- Do not poll `/notifications` every 5 seconds for the badge count.
  Use the realtime bond (wire it via `setupRealtime()`; see "Realtime wiring").
- Do not subscribe the bell to a fixed room like `/api/realtime/me` — the
  room must be the recipient's `user:<userId>` and must match the broadcast
  room, or live updates silently never arrive.
- For a public deployment, authorize SSE joins so a user can only subscribe to
  their OWN `user:<id>` room: register a guard with `onJoinRequest` from
  `@molecule/api-realtime` (the flagship chat apps wrap this in a local
  `registerRealtimeJoinGuard` helper) — otherwise anyone can listen to another
  user's notification stream.
- Do not delete notifications when read. Soft-flag with `read_at`
  so users can scroll back through history.
- Do not store rendered HTML in the notification body. Store
  structured fields (`type`, `actor_id`, `subject_id`) and render
  copy at read time so i18n still works after the user changes
  language.

## Verify

User A likes user B's post → user B's bell shows badge "1" within
1 second → click bell → see "A liked your post" → click → marked read,
badge clears.
