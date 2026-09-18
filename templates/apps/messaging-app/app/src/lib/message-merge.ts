/**
 * Pure merge helpers for applying realtime message events to local list
 * state (see pages/Conversation.tsx).
 *
 * The API broadcasts RAW message rows (snake_case, plaintext `content`, plus
 * a hydrated `sender_name`) to `conversation:<id>` rooms, but the page
 * renders the DECORATED shape its fetch path returns (`body`, `sent_at`,
 * `self`, receipt flags — see api's `decorateMessages`). Decoration is
 * viewer-specific (`self` differs per receiver), so it cannot happen on the
 * server for a broadcast: {@link normalizeIncomingMessage} derives it locally
 * from the viewer's own user id.
 *
 * Events can race the sender's own HTTP response — the `message:created`
 * broadcast may arrive before OR after the POST resolves. Every helper is
 * therefore idempotent (dedupes/patches/removes by `id`) and returns the
 * ORIGINAL array when nothing changed, so React state setters can skip
 * no-op re-renders.
 *
 * @module
 */

/** A message as the Conversation page renders it (the API's decorated shape). */
export interface ConversationMessage {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string
  body: string
  sent_at: string
  delivered: boolean
  read: boolean
  self: boolean
  reactions: { emoji: string; count: number }[]
}

/** Options for {@link normalizeIncomingMessage}. */
export interface NormalizeOptions {
  /** The viewer's own user id (`authClient.getState().user?.id`), if known. */
  selfId: string | null | undefined
  /** Display name when the payload carries no sender_name (i18n'd by the page). */
  fallbackSenderName: string
}

/**
 * Narrow an unknown realtime payload to a usable record: a non-null object
 * carrying an `id`. Anything else is ignored by the merge helpers.
 *
 * @param data - The raw event payload.
 * @returns True when the payload is an object with an `id` property.
 */
export function isEventRow(data: unknown): data is Record<string, unknown> & { id: unknown } {
  return typeof data === 'object' && data !== null && 'id' in data
}

const str = (value: unknown): string => (typeof value === 'string' ? value : String(value ?? ''))

/**
 * Convert a raw broadcast payload into the page's decorated message shape,
 * deriving the viewer-specific fields locally: `self` from the viewer's own
 * user id, `delivered` mirroring the API's own-message rule, `read` false
 * until a `message:read` receipt arrives, and empty `reactions` (reaction
 * events arrive separately).
 *
 * @param data - The `message:created` (or `message:updated`) event payload.
 * @param options - The viewer id and i18n'd fallback sender name.
 * @returns The normalized message, or null for an unusable payload.
 */
export function normalizeIncomingMessage(
  data: unknown,
  options: NormalizeOptions,
): ConversationMessage | null {
  if (!isEventRow(data)) return null
  const senderId = str(data.sender_id)
  const self = options.selfId != null && senderId === String(options.selfId)
  const body =
    typeof data.body === 'string' ? data.body : typeof data.content === 'string' ? data.content : ''
  const sentAt =
    typeof data.sent_at === 'string'
      ? data.sent_at
      : typeof data.created_at === 'string'
        ? data.created_at
        : new Date().toISOString()
  return {
    id: str(data.id),
    conversation_id: str(data.conversation_id),
    sender_id: senderId,
    sender_name:
      typeof data.sender_name === 'string' && data.sender_name
        ? data.sender_name
        : options.fallbackSenderName,
    body,
    sent_at: sentAt,
    // The API's decorate rule: a sender's own message counts as delivered.
    delivered: self,
    read: false,
    self,
    reactions: [],
  }
}

/**
 * Append an incoming message unless a message with the same id is already
 * present (e.g. the sender's own POST response landed first).
 *
 * @param messages - The current list.
 * @param incoming - A normalized message (null payloads are ignored).
 * @returns The updated list, or the original list when nothing changed.
 */
export function appendMessage(
  messages: ConversationMessage[],
  incoming: ConversationMessage | null,
): ConversationMessage[] {
  if (!incoming?.id) return messages
  if (messages.some((m) => String(m.id) === String(incoming.id))) return messages
  return [...messages, incoming]
}

/**
 * Patch the message matching a `message:updated` payload's id with the new
 * body text, preserving the locally-known receipt/reaction state. Never
 * inserts — an edit to a message we don't have is a no-op.
 *
 * @param messages - The current list.
 * @param data - The raw event payload (`content`/`body` carries the new text).
 * @returns The updated list, or the original list when nothing changed.
 */
export function applyMessageUpdate(
  messages: ConversationMessage[],
  data: unknown,
): ConversationMessage[] {
  if (!isEventRow(data)) return messages
  const body =
    typeof data.body === 'string'
      ? data.body
      : typeof data.content === 'string'
        ? data.content
        : null
  if (body === null) return messages
  let changed = false
  const next = messages.map((m) => {
    if (String(m.id) !== str(data.id)) return m
    if (m.body === body) return m
    changed = true
    return { ...m, body }
  })
  return changed ? next : messages
}

/**
 * Remove the message with the given id, if present.
 *
 * @param messages - The current list.
 * @param id - The id from the event payload (`message:deleted` sends `{ id }`).
 * @returns The updated list, or the original list when nothing changed.
 */
export function removeMessage(messages: ConversationMessage[], id: unknown): ConversationMessage[] {
  const target = String(id)
  const next = messages.filter((m) => String(m.id) !== target)
  return next.length === messages.length ? messages : next
}

/**
 * Whether a receipt event (`message:read` / `message:delivered`) was emitted
 * by the viewer themself. The room echoes every participant's receipts, and
 * a viewer's own receipt says nothing about their outgoing messages — the
 * page skips those.
 *
 * @param data - The raw event payload (`{ message_id, user_id }`).
 * @param selfId - The viewer's own user id, if known.
 * @returns True when the receipt's user_id matches the viewer.
 */
export function isReceiptFromSelf(data: unknown, selfId: string | null | undefined): boolean {
  if (typeof data !== 'object' || data === null || selfId == null) return false
  return String((data as Record<string, unknown>).user_id) === String(selfId)
}

/**
 * Apply a `message:read` / `message:delivered` receipt to the matching
 * message — flips the sender's ✓/✓✓ ticks live. `read` implies `delivered`,
 * matching the API's receipt aggregation. The page only calls this for
 * receipts from OTHER users (a viewer's own receipt says nothing about
 * their outgoing messages).
 *
 * @param messages - The current list.
 * @param data - The raw event payload (`{ message_id, user_id }`).
 * @param status - Which receipt arrived.
 * @returns The updated list, or the original list when nothing changed.
 */
export function applyReceipt(
  messages: ConversationMessage[],
  data: unknown,
  status: 'delivered' | 'read',
): ConversationMessage[] {
  if (typeof data !== 'object' || data === null || !('message_id' in data)) return messages
  const messageId = str((data as Record<string, unknown>).message_id)
  let changed = false
  const next = messages.map((m) => {
    if (String(m.id) !== messageId) return m
    const delivered = true
    const read = status === 'read' ? true : m.read
    if (m.delivered === delivered && m.read === read) return m
    changed = true
    return { ...m, delivered, read }
  })
  return changed ? next : messages
}
