/**
 * Unit tests for the pure realtime message-merge helpers
 * (lib/message-merge.ts) used by the Channel page's live subscription.
 *
 * These pin the exact behaviors the realtime handlers rely on: append
 * dedupes by id (the sender's own POST races the broadcast in either
 * order), replace never inserts, upsert covers the pinned-panel case, and
 * every helper returns the ORIGINAL array on a no-op so React state setters
 * skip pointless re-renders.
 */
import { describe, expect, it } from 'vitest'

import {
  appendMessage,
  isMessageRow,
  removeMessage,
  replaceMessage,
  upsertMessage,
} from '../lib/message-merge.js'

const m1 = { id: 'msg1', content: 'hello', is_pinned: false }
const m2 = { id: 'msg2', content: 'world', is_pinned: false }

describe('isMessageRow', () => {
  it('accepts objects with an id and rejects everything else', () => {
    expect(isMessageRow(m1)).toBe(true)
    expect(isMessageRow({ id: 1 })).toBe(true)
    expect(isMessageRow(null)).toBe(false)
    expect(isMessageRow(undefined)).toBe(false)
    expect(isMessageRow('msg1')).toBe(false)
    expect(isMessageRow({ content: 'no id' })).toBe(false)
  })
})

describe('appendMessage', () => {
  it('appends a new row at the end', () => {
    expect(appendMessage([m1], m2)).toEqual([m1, m2])
  })

  it('dedupes by id — the sender POST and the broadcast can land in either order', () => {
    const list = [m1, m2]
    // Same id arriving again (even with different content) must not duplicate.
    expect(appendMessage(list, { id: 'msg2', content: 'dupe' })).toBe(list)
  })

  it('ignores unusable payloads and returns the original array', () => {
    const list = [m1]
    expect(appendMessage(list, null)).toBe(list)
    expect(appendMessage(list, 'nope')).toBe(list)
    expect(appendMessage(list, { content: 'no id' })).toBe(list)
  })
})

describe('replaceMessage', () => {
  it('replaces the row with the matching id and keeps the rest', () => {
    const updated = { id: 'msg1', content: 'edited', is_edited: true }
    expect(replaceMessage([m1, m2], updated)).toEqual([updated, m2])
  })

  it('never inserts: unknown ids leave the original array untouched', () => {
    const list = [m1]
    expect(replaceMessage(list, m2)).toBe(list)
  })

  it('ignores unusable payloads', () => {
    const list = [m1]
    expect(replaceMessage(list, null)).toBe(list)
  })
})

describe('upsertMessage', () => {
  it('replaces when the id is present (re-pin refreshes the row)', () => {
    const pinned = { id: 'msg1', content: 'hello', is_pinned: true }
    expect(upsertMessage([m1, m2], pinned)).toEqual([pinned, m2])
  })

  it('appends when the id is absent (newly pinned message)', () => {
    const pinned = { id: 'msg3', content: 'new', is_pinned: true }
    expect(upsertMessage([m1], pinned)).toEqual([m1, pinned])
  })

  it('ignores unusable payloads', () => {
    const list = [m1]
    expect(upsertMessage(list, undefined)).toBe(list)
  })
})

describe('removeMessage', () => {
  it('removes the row with the given id', () => {
    expect(removeMessage([m1, m2], 'msg1')).toEqual([m2])
  })

  it('returns the original array when the id is absent', () => {
    const list = [m1]
    expect(removeMessage(list, 'msg9')).toBe(list)
  })

  it('matches ids loosely across types (string vs number)', () => {
    const list = [{ id: 7, content: 'n' }]
    expect(removeMessage(list, '7')).toEqual([])
  })
})
