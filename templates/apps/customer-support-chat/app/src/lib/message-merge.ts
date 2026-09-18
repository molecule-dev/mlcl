/**
 * Pure merge helpers for applying realtime events to local state (see
 * pages/ConversationDetail.tsx).
 *
 * The API broadcasts raw `support_messages` rows (snake_case — the same
 * shape the fetch path returns, so no client-side decoration is needed) to
 * `conversation:<id>` rooms, plus `support_conversations` rows for
 * lifecycle events (assigned/closed/reopened/priority).
 *
 * Events can race the agent's own HTTP round-trip — the `message:created`
 * broadcast may arrive before OR after the composer's POST+reload resolves.
 * Every helper is therefore idempotent (dedupes/replaces by `id`) and
 * returns the ORIGINAL value when nothing changed, so React state setters
 * can skip no-op re-renders.
 *
 * @module
 */

/** A row as broadcast by the API (snake_case DB columns). */
export type EventRow = Record<string, unknown> & { id: unknown }

/**
 * Narrow an unknown realtime payload to a usable row: a non-null object
 * carrying an `id`. Anything else is ignored by the merge helpers.
 *
 * @param data - The raw event payload.
 * @returns True when the payload is an object with an `id` property.
 */
export function isEventRow(data: unknown): data is EventRow {
  return typeof data === 'object' && data !== null && 'id' in data
}

const rowId = (row: EventRow): string => String(row.id)

/**
 * Append an incoming message row unless a row with the same id is already
 * present (e.g. the composer's own POST+reload landed first).
 *
 * @param messages - The current list.
 * @param incoming - The raw `message:created` event payload.
 * @returns The updated list, or the original list when nothing changed.
 */
export function appendMessage<T extends { id: string }>(messages: T[], incoming: unknown): T[] {
  if (!isEventRow(incoming)) return messages
  if (messages.some((m) => String(m.id) === rowId(incoming))) return messages
  return [...messages, incoming as unknown as T]
}

/**
 * Merge a conversation lifecycle event (`conversation:assigned` / `closed` /
 * `reopened` / `updated`) into the currently-open conversation. Returns the
 * incoming row only when it targets the same conversation — an event for a
 * different id (or an unusable payload) leaves the current value untouched.
 *
 * @param current - The conversation currently rendered (or null).
 * @param incoming - The raw event payload.
 * @returns The updated conversation, or the original reference on a no-op.
 */
export function mergeConversation<T extends { id: string }>(
  current: T | null,
  incoming: unknown,
): T | null {
  if (!isEventRow(incoming)) return current
  if (!current || String(current.id) !== rowId(incoming)) return current
  return incoming as unknown as T
}

/**
 * Replace the row with the incoming row's id inside a conversation list
 * (the inbox side panel). Rows for other ids are left untouched — replace
 * never inserts.
 *
 * @param rows - The current list.
 * @param incoming - The raw event payload.
 * @returns The updated list, or the original list when nothing changed.
 */
export function replaceConversation<T extends { id: string }>(rows: T[], incoming: unknown): T[] {
  if (!isEventRow(incoming)) return rows
  let changed = false
  const next = rows.map((row) => {
    if (String(row.id) === rowId(incoming)) {
      changed = true
      return incoming as unknown as T
    }
    return row
  })
  return changed ? next : rows
}
