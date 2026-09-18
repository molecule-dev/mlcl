/**
 * Unit tests for the pure realtime message-merge helpers
 * (lib/message-merge.ts) used by the Conversation page's live subscription.
 *
 * These pin the exact behaviors the realtime handlers rely on:
 * normalization derives viewer-specific fields (`self`, `delivered`) from
 * the viewer's own id, append dedupes by id (the sender's own POST races
 * the broadcast in either order), update patches body without inserting or
 * clobbering receipt state, receipts flip ✓/✓✓, and every helper returns
 * the ORIGINAL array on a no-op so React state setters skip pointless
 * re-renders.
 */
import { describe, expect, it } from 'vitest'

import type { ConversationMessage } from '../lib/message-merge.js'
import {
  appendMessage,
  applyMessageUpdate,
  applyReceipt,
  isEventRow,
  isReceiptFromSelf,
  normalizeIncomingMessage,
  removeMessage,
} from '../lib/message-merge.js'

const NORMALIZE_OPTS = { selfId: 'me', fallbackSenderName: 'Someone' }

const msg = (overrides: Partial<ConversationMessage>): ConversationMessage => ({
  id: 'm1',
  conversation_id: 'c1',
  sender_id: 'other',
  sender_name: 'Other Person',
  body: 'hello',
  sent_at: '2026-07-01T00:00:00.000Z',
  delivered: false,
  read: false,
  self: false,
  reactions: [],
  ...overrides,
})

describe('isEventRow', () => {
  it('accepts objects with an id and rejects everything else', () => {
    expect(isEventRow({ id: 'm1' })).toBe(true)
    expect(isEventRow({ id: 1 })).toBe(true)
    expect(isEventRow(null)).toBe(false)
    expect(isEventRow(undefined)).toBe(false)
    expect(isEventRow('m1')).toBe(false)
    expect(isEventRow({ content: 'no id' })).toBe(false)
  })
})

describe('normalizeIncomingMessage', () => {
  it('maps a raw broadcast row (snake_case, plaintext content) into the page shape', () => {
    const normalized = normalizeIncomingMessage(
      {
        id: 'm9',
        conversation_id: 'c1',
        sender_id: 'other',
        sender_name: 'Dana',
        content: 'hi there',
        created_at: '2026-07-02T10:00:00.000Z',
      },
      NORMALIZE_OPTS,
    )
    expect(normalized).toEqual({
      id: 'm9',
      conversation_id: 'c1',
      sender_id: 'other',
      sender_name: 'Dana',
      body: 'hi there',
      sent_at: '2026-07-02T10:00:00.000Z',
      delivered: false,
      read: false,
      self: false,
      reactions: [],
    })
  })

  it("derives self (and the own-message delivered rule) from the viewer's id", () => {
    const normalized = normalizeIncomingMessage(
      { id: 'm9', conversation_id: 'c1', sender_id: 'me', content: 'mine' },
      NORMALIZE_OPTS,
    )
    expect(normalized?.self).toBe(true)
    expect(normalized?.delivered).toBe(true)
    expect(normalized?.read).toBe(false)
  })

  it('is never self when the viewer id is unknown', () => {
    const normalized = normalizeIncomingMessage(
      { id: 'm9', sender_id: 'me', content: 'x' },
      { selfId: null, fallbackSenderName: 'Someone' },
    )
    expect(normalized?.self).toBe(false)
  })

  it('falls back to the provided sender name when the payload has none', () => {
    const normalized = normalizeIncomingMessage(
      { id: 'm9', sender_id: 'other', content: 'x' },
      NORMALIZE_OPTS,
    )
    expect(normalized?.sender_name).toBe('Someone')
  })

  it('prefers an already-decorated body/sent_at when present (own POST response shape)', () => {
    const normalized = normalizeIncomingMessage(
      { id: 'm9', sender_id: 'other', body: 'decorated', sent_at: '2026-07-02T11:00:00.000Z' },
      NORMALIZE_OPTS,
    )
    expect(normalized?.body).toBe('decorated')
    expect(normalized?.sent_at).toBe('2026-07-02T11:00:00.000Z')
  })

  it('returns null for unusable payloads', () => {
    expect(normalizeIncomingMessage(null, NORMALIZE_OPTS)).toBeNull()
    expect(normalizeIncomingMessage('nope', NORMALIZE_OPTS)).toBeNull()
    expect(normalizeIncomingMessage({ content: 'no id' }, NORMALIZE_OPTS)).toBeNull()
  })
})

describe('appendMessage', () => {
  it('appends a new message at the end', () => {
    const m1 = msg({ id: 'm1' })
    const m2 = msg({ id: 'm2' })
    expect(appendMessage([m1], m2)).toEqual([m1, m2])
  })

  it('dedupes by id — the sender POST and the broadcast can land in either order', () => {
    const list = [msg({ id: 'm1' }), msg({ id: 'm2' })]
    expect(appendMessage(list, msg({ id: 'm2', body: 'dupe' }))).toBe(list)
  })

  it('ignores null (unusable normalized payload) and returns the original array', () => {
    const list = [msg({ id: 'm1' })]
    expect(appendMessage(list, null)).toBe(list)
  })
})

describe('applyMessageUpdate', () => {
  it('patches the body of the matching message and keeps receipt state', () => {
    const original = msg({ id: 'm1', body: 'before', delivered: true, read: true })
    const next = applyMessageUpdate([original], { id: 'm1', content: 'after' })
    expect(next).toEqual([{ ...original, body: 'after' }])
    expect(next[0]?.delivered).toBe(true)
    expect(next[0]?.read).toBe(true)
  })

  it('accepts a decorated-style body field too', () => {
    const next = applyMessageUpdate([msg({ id: 'm1', body: 'before' })], {
      id: 'm1',
      body: 'after',
    })
    expect(next[0]?.body).toBe('after')
  })

  it('never inserts: unknown ids leave the original array untouched', () => {
    const list = [msg({ id: 'm1' })]
    expect(applyMessageUpdate(list, { id: 'm9', content: 'x' })).toBe(list)
  })

  it('returns the original array when the body is unchanged or the payload unusable', () => {
    const list = [msg({ id: 'm1', body: 'same' })]
    expect(applyMessageUpdate(list, { id: 'm1', content: 'same' })).toBe(list)
    expect(applyMessageUpdate(list, null)).toBe(list)
    expect(applyMessageUpdate(list, { id: 'm1' })).toBe(list)
  })
})

describe('removeMessage', () => {
  it('removes the message with the given id', () => {
    const m1 = msg({ id: 'm1' })
    const m2 = msg({ id: 'm2' })
    expect(removeMessage([m1, m2], 'm1')).toEqual([m2])
  })

  it('returns the original array when the id is absent', () => {
    const list = [msg({ id: 'm1' })]
    expect(removeMessage(list, 'm9')).toBe(list)
  })
})

describe('isReceiptFromSelf', () => {
  it('matches the receipt user against the viewer', () => {
    expect(isReceiptFromSelf({ message_id: 'm1', user_id: 'me' }, 'me')).toBe(true)
    expect(isReceiptFromSelf({ message_id: 'm1', user_id: 'other' }, 'me')).toBe(false)
  })

  it('is false when the viewer id or payload is unusable', () => {
    expect(isReceiptFromSelf({ message_id: 'm1', user_id: 'me' }, null)).toBe(false)
    expect(isReceiptFromSelf(null, 'me')).toBe(false)
  })
})

describe('applyReceipt', () => {
  it('marks the matching message delivered', () => {
    const next = applyReceipt([msg({ id: 'm1', self: true })], { message_id: 'm1' }, 'delivered')
    expect(next[0]?.delivered).toBe(true)
    expect(next[0]?.read).toBe(false)
  })

  it('marks the matching message read (read implies delivered)', () => {
    const next = applyReceipt([msg({ id: 'm1', self: true })], { message_id: 'm1' }, 'read')
    expect(next[0]?.delivered).toBe(true)
    expect(next[0]?.read).toBe(true)
  })

  it('returns the original array when nothing changed', () => {
    const list = [msg({ id: 'm1', delivered: true, read: true })]
    expect(applyReceipt(list, { message_id: 'm1' }, 'read')).toBe(list)
    expect(applyReceipt(list, { message_id: 'm9' }, 'read')).toBe(list)
    expect(applyReceipt(list, null, 'read')).toBe(list)
  })
})
