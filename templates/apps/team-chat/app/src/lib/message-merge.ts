/**
 * Pure merge helpers for applying realtime message events to local list
 * state (see pages/Channel.tsx).
 *
 * Realtime payloads are raw API rows (snake_case, same shape as the fetch
 * path), and events can race the sender's own HTTP response — e.g. the
 * `message:created` broadcast may arrive before OR after the POST resolves.
 * Every helper is therefore idempotent (dedupes/replaces/removes by `id`)
 * and returns the ORIGINAL array when nothing changed, so React state
 * setters can skip no-op re-renders.
 *
 * @module
 */

/** A message row as returned by the API (snake_case DB columns). */
export type MessageRow = Record<string, unknown>

/**
 * Narrow an unknown realtime payload to a usable row: a non-null object
 * carrying an `id`. Anything else is ignored by the merge helpers.
 *
 * @param data - The raw event payload.
 * @returns True when the payload is an object with an `id` property.
 */
export function isMessageRow(data: unknown): data is MessageRow {
  return typeof data === 'object' && data !== null && 'id' in data
}

const rowId = (row: MessageRow): string => String(row.id)

/**
 * Append an incoming row unless a row with the same id is already present
 * (e.g. the sender's own POST response landed first).
 *
 * @param messages - The current list.
 * @param incoming - The raw event payload.
 * @returns The updated list, or the original list when nothing changed.
 */
export function appendMessage(messages: MessageRow[], incoming: unknown): MessageRow[] {
  if (!isMessageRow(incoming)) return messages
  if (messages.some((m) => rowId(m) === rowId(incoming))) return messages
  return [...messages, incoming]
}

/**
 * Replace the row with the incoming row's id, if present. Rows for other ids
 * (or an id not in the list) are left untouched — replace never inserts.
 *
 * @param messages - The current list.
 * @param incoming - The raw event payload.
 * @returns The updated list, or the original list when nothing changed.
 */
export function replaceMessage(messages: MessageRow[], incoming: unknown): MessageRow[] {
  if (!isMessageRow(incoming)) return messages
  let changed = false
  const next = messages.map((m) => {
    if (rowId(m) === rowId(incoming)) {
      changed = true
      return incoming
    }
    return m
  })
  return changed ? next : messages
}

/**
 * Replace the matching row if present, otherwise append — used for
 * `message:pinned` where the row may or may not already be in the pinned
 * list.
 *
 * @param messages - The current list.
 * @param incoming - The raw event payload.
 * @returns The updated list, or the original list when the payload is unusable.
 */
export function upsertMessage(messages: MessageRow[], incoming: unknown): MessageRow[] {
  if (!isMessageRow(incoming)) return messages
  if (messages.some((m) => rowId(m) === rowId(incoming))) {
    return replaceMessage(messages, incoming)
  }
  return [...messages, incoming]
}

/**
 * Remove the row with the given id, if present.
 *
 * @param messages - The current list.
 * @param id - The id from the event payload (`message:deleted` sends `{ id }`).
 * @returns The updated list, or the original list when nothing changed.
 */
export function removeMessage(messages: MessageRow[], id: unknown): MessageRow[] {
  const target = String(id)
  const next = messages.filter((m) => rowId(m) !== target)
  return next.length === messages.length ? messages : next
}
