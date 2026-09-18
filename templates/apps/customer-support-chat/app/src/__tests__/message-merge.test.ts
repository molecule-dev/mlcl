/**
 * Unit tests for the pure realtime merge helpers (lib/message-merge.ts)
 * used by the ConversationDetail page's live subscription.
 *
 * These pin the exact behaviors the realtime handlers rely on: append
 * dedupes by id (the agent's own POST+reload races the broadcast in either
 * order), conversation merges only apply to the matching id and never
 * insert, and every helper returns the ORIGINAL value on a no-op so React
 * state setters skip pointless re-renders.
 */
import { describe, expect, it } from 'vitest'

import {
  appendMessage,
  isEventRow,
  mergeConversation,
  replaceConversation,
} from '../lib/message-merge.js'

const m1 = { id: 'm1', content: 'hello', sender_type: 'visitor', type: 'text' }
const m2 = { id: 'm2', content: 'world', sender_type: 'agent', type: 'text' }

const conv = (overrides: Record<string, unknown>): Record<string, unknown> & { id: string } => ({
  id: 'c1',
  subject: 'Broken login',
  status: 'open',
  priority: 'normal',
  ...overrides,
})

describe('isEventRow', () => {
  it('accepts objects with an id and rejects everything else', () => {
    expect(isEventRow(m1)).toBe(true)
    expect(isEventRow({ id: 1 })).toBe(true)
    expect(isEventRow(null)).toBe(false)
    expect(isEventRow(undefined)).toBe(false)
    expect(isEventRow('m1')).toBe(false)
    expect(isEventRow({ content: 'no id' })).toBe(false)
  })
})

describe('appendMessage', () => {
  it('appends a new row at the end', () => {
    expect(appendMessage([m1], m2)).toEqual([m1, m2])
  })

  it('appends internal notes like any other support_messages row', () => {
    const note = { id: 'm3', content: 'note to team', sender_type: 'agent', type: 'internal_note' }
    expect(appendMessage([m1], note)).toEqual([m1, note])
  })

  it('dedupes by id — the agent POST+reload and the broadcast can land in either order', () => {
    const list = [m1, m2]
    // Same id arriving again (even with different content) must not duplicate.
    expect(appendMessage(list, { id: 'm2', content: 'dupe' })).toBe(list)
  })

  it('ignores unusable payloads and returns the original array', () => {
    const list = [m1]
    expect(appendMessage(list, null)).toBe(list)
    expect(appendMessage(list, 'nope')).toBe(list)
    expect(appendMessage(list, { content: 'no id' })).toBe(list)
  })
})

describe('mergeConversation', () => {
  it('replaces the open conversation when the event targets the same id', () => {
    const closed = conv({ status: 'closed' })
    expect(mergeConversation(conv({}), closed)).toBe(closed)
  })

  it('ignores events for a different conversation', () => {
    const current = conv({})
    expect(mergeConversation(current, conv({ id: 'c9', status: 'closed' }))).toBe(current)
  })

  it('never materializes a conversation from nothing', () => {
    expect(mergeConversation(null, conv({}))).toBeNull()
  })

  it('ignores unusable payloads', () => {
    const current = conv({})
    expect(mergeConversation(current, null)).toBe(current)
    expect(mergeConversation(current, 'nope')).toBe(current)
  })
})

describe('replaceConversation', () => {
  it('replaces the row with the matching id and keeps the rest', () => {
    const a = conv({ id: 'c1' })
    const b = conv({ id: 'c2' })
    const updated = conv({ id: 'c1', status: 'closed' })
    expect(replaceConversation([a, b], updated)).toEqual([updated, b])
  })

  it('never inserts: unknown ids leave the original array untouched', () => {
    const list = [conv({ id: 'c1' })]
    expect(replaceConversation(list, conv({ id: 'c9' }))).toBe(list)
  })

  it('ignores unusable payloads', () => {
    const list = [conv({ id: 'c1' })]
    expect(replaceConversation(list, null)).toBe(list)
  })
})
