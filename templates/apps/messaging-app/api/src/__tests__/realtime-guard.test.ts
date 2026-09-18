/**
 * Unit tests for the realtime join guard (lib/realtime-guard.ts) — the
 * authorization boundary for live conversation subscriptions.
 *
 * The guard must mirror the HTTP layer's conversation-participant contract
 * (`requireConversationParticipant` in lib/authz.ts) at the socket layer:
 *
 *   - only `conversation:<id>` rooms are joinable (anything else is denied),
 *   - the handshake `auth.token` must be a verifiable bearer JWT
 *     (@molecule/api-jwt `verify` — signature + expiry, never a bare decode),
 *     with the httpOnly `token` session cookie as fallback,
 *   - the authenticated user must be a participant of the conversation
 *     (a conversation_participants row). Unlike team-chat there is NO
 *     creator fallback — the HTTP layer grants none either.
 *
 * No realtime transport or database is required: `onJoinRequest` is mocked to
 * capture the registered guard, `verify` is mocked per-token, and `findOne`
 * reads an in-memory store.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

interface Row {
  [key: string]: unknown
}

type JoinGuard = (request: {
  clientId: string
  room: string
  auth: Record<string, unknown>
  headers?: Record<string, string | string[] | undefined>
}) => boolean | Promise<boolean>

const { store, registeredGuards, resetStore } = vi.hoisted(() => {
  const tables: Record<string, Row[]> = {}
  const registeredGuards: JoinGuard[] = []
  const resetStore = (): void => {
    // conv1: alice + bob are participants; carol is not (she CREATED conv2
    // but holds no participant row there — the no-creator-fallback case).
    tables.conversations = [
      { id: 'conv1', type: 'direct', created_by: 'alice' },
      { id: 'conv2', type: 'group', created_by: 'carol' },
    ]
    tables.conversation_participants = [
      { id: 'p1', conversation_id: 'conv1', user_id: 'alice' },
      { id: 'p2', conversation_id: 'conv1', user_id: 'bob' },
      { id: 'p3', conversation_id: 'conv2', user_id: 'alice' },
    ]
  }
  return { store: tables, registeredGuards, resetStore }
})

vi.mock('@molecule/api-realtime', () => ({
  onJoinRequest: (guard: JoinGuard) => {
    registeredGuards.push(guard)
  },
}))

vi.mock('@molecule/api-jwt', () => ({
  verify: (token: string) => {
    if (token === 'alice-token') return { userId: 'alice' }
    if (token === 'bob-token') return { userId: 'bob' }
    if (token === 'carol-token') return { userId: 'carol' }
    if (token === 'string-payload-token') return 'not-an-object-payload'
    throw new Error('invalid signature')
  },
}))

vi.mock('@molecule/api-database', () => ({
  findOne: async (table: string, where: { field: string; operator: string; value: unknown }[]) =>
    (store[table] ?? []).find((row) =>
      where.every((c) => String(row[c.field]) === String(c.value)),
    ) ?? null,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

vi.mock('@molecule/api-resource-user', () => ({
  // Dev/test cookie name (prod would be `__Host-token`) — mirrors the real
  // getAuthCookieName, which the guard uses for the cookie-session fallback.
  authorization: { getAuthCookieName: (base: string) => base },
}))

let guard: JoinGuard

const join = (
  room: string,
  auth: Record<string, unknown>,
  headers?: Record<string, string | string[] | undefined>,
): Promise<boolean> => Promise.resolve(guard({ clientId: 'client-1', room, auth, headers }))

beforeAll(async () => {
  const { registerRealtimeJoinGuard } = await import('../lib/realtime-guard.js')
  registerRealtimeJoinGuard()
  expect(registeredGuards).toHaveLength(1)
  guard = registeredGuards[0] as JoinGuard
})

beforeEach(() => {
  resetStore()
})

describe('realtime join guard', () => {
  it('allows a conversation participant into that conversation room', async () => {
    await expect(join('conversation:conv1', { token: 'alice-token' })).resolves.toBe(true)
    await expect(join('conversation:conv1', { token: 'bob-token' })).resolves.toBe(true)
  })

  it('denies a non-participant of the conversation', async () => {
    await expect(join('conversation:conv1', { token: 'carol-token' })).resolves.toBe(false)
  })

  it('denies a participant of a DIFFERENT conversation (no cross-conversation bleed)', async () => {
    // bob belongs to conv1 only; conv2 must stay closed to him.
    await expect(join('conversation:conv2', { token: 'bob-token' })).resolves.toBe(false)
  })

  it('denies the conversation creator without a participant row (no creator fallback)', async () => {
    // carol created conv2 but is not a participant — the HTTP layer
    // (requireConversationParticipant) 404s her, so the socket layer must
    // deny her too. This is deliberately STRICTER than team-chat's guard.
    await expect(join('conversation:conv2', { token: 'carol-token' })).resolves.toBe(false)
  })

  it('denies a bad token', async () => {
    await expect(join('conversation:conv1', { token: 'forged-token' })).resolves.toBe(false)
  })

  it('denies a missing or non-string token', async () => {
    await expect(join('conversation:conv1', {})).resolves.toBe(false)
    await expect(join('conversation:conv1', { token: 42 })).resolves.toBe(false)
  })

  it('denies a token whose verified payload carries no userId', async () => {
    await expect(join('conversation:conv1', { token: 'string-payload-token' })).resolves.toBe(false)
  })

  it('denies non-conversation rooms outright, even for a valid participant', async () => {
    await expect(join('general', { token: 'alice-token' })).resolves.toBe(false)
    await expect(join('user:alice', { token: 'alice-token' })).resolves.toBe(false)
    await expect(join('channel:conv1', { token: 'alice-token' })).resolves.toBe(false)
    await expect(join('', { token: 'alice-token' })).resolves.toBe(false)
  })

  it('denies a malformed conversation room with an empty id', async () => {
    await expect(join('conversation:', { token: 'alice-token' })).resolves.toBe(false)
  })

  it('denies a conversation room for a conversation that does not exist', async () => {
    await expect(join('conversation:nope', { token: 'alice-token' })).resolves.toBe(false)
  })

  it('denies an orphaned participant row whose conversation was deleted', async () => {
    // deleteById('conversations') does not cascade participants — the guard
    // must check the conversation row too, matching the HTTP helper.
    store.conversations = (store.conversations ?? []).filter((c) => c.id !== 'conv1')
    await expect(join('conversation:conv1', { token: 'alice-token' })).resolves.toBe(false)
  })
})

describe('cookie-session fallback (in-memory-token model: page reloads have no auth.token)', () => {
  it('allows a participant whose ONLY credential is the httpOnly session cookie', async () => {
    await expect(
      join('conversation:conv1', {}, { cookie: 'mol_auth=1; token=alice-token' }),
    ).resolves.toBe(true)
  })

  it('prefers an explicit auth.token over the cookie', async () => {
    // Valid cookie but invalid explicit token → explicit token wins → deny.
    await expect(
      join('conversation:conv1', { token: 'forged-token' }, { cookie: 'token=alice-token' }),
    ).resolves.toBe(false)
  })

  it('denies when the cookie session belongs to a non-participant', async () => {
    await expect(join('conversation:conv1', {}, { cookie: 'token=carol-token' })).resolves.toBe(
      false,
    )
  })

  it('denies when the cookie header carries no session cookie', async () => {
    await expect(
      join('conversation:conv1', {}, { cookie: 'mol_auth=1; theme=dark' }),
    ).resolves.toBe(false)
    await expect(join('conversation:conv1', {}, {})).resolves.toBe(false)
  })

  it('handles a cookie header split across multiple values', async () => {
    await expect(
      join('conversation:conv1', {}, { cookie: ['mol_auth=1', 'token=alice-token'] }),
    ).resolves.toBe(true)
  })
})
