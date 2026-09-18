/**
 * Unit tests for the realtime join guard (lib/realtime-guard.ts) — the
 * authorization boundary for live conversation subscriptions.
 *
 * The guard must mirror the HTTP layer's conversation-ownership contract
 * (`ensureConversationOwnership` in handlers/messages.ts, `ensureOwnership`
 * in handlers/conversations.ts) at the socket layer:
 *
 *   - only `conversation:<id>` rooms are joinable (anything else is denied),
 *   - the handshake `auth.token` must be a verifiable bearer JWT
 *     (@molecule/api-jwt `verify` — signature + expiry, never a bare decode),
 *     with the httpOnly `token` session cookie as fallback,
 *   - the support conversation must belong to the session user
 *     (`support_conversations.user_id`), with rows owned by nobody
 *     (`user_id` null — legacy/seed data) open to any authenticated user,
 *     exactly as the HTTP handlers allow.
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
    // conv1 is owned by 'owner'; conv-legacy predates ownership (user_id
    // null) — the HTTP layer lets any authenticated user read those.
    tables.support_conversations = [
      { id: 'conv1', subject: 'Broken login', user_id: 'owner', status: 'open' },
      { id: 'conv-legacy', subject: 'Old ticket', user_id: null, status: 'closed' },
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
    if (token === 'owner-token') return { userId: 'owner' }
    if (token === 'intruder-token') return { userId: 'intruder' }
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
  it("allows the conversation's owner into that conversation room", async () => {
    await expect(join('conversation:conv1', { token: 'owner-token' })).resolves.toBe(true)
  })

  it("denies another account's session (no cross-account bleed)", async () => {
    await expect(join('conversation:conv1', { token: 'intruder-token' })).resolves.toBe(false)
  })

  it('allows any authenticated user into an ownerless legacy conversation (HTTP parity)', async () => {
    // ensureConversationOwnership only 403s when user_id is SET and differs —
    // the guard must not be stricter, or live updates would silently die on
    // rows the HTTP layer happily serves.
    await expect(join('conversation:conv-legacy', { token: 'owner-token' })).resolves.toBe(true)
    await expect(join('conversation:conv-legacy', { token: 'intruder-token' })).resolves.toBe(true)
  })

  it('denies an ownerless conversation to an UNAUTHENTICATED socket', async () => {
    await expect(join('conversation:conv-legacy', {})).resolves.toBe(false)
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

  it('denies non-conversation rooms outright, even for the owner', async () => {
    await expect(join('support', { token: 'owner-token' })).resolves.toBe(false)
    await expect(join('user:owner', { token: 'owner-token' })).resolves.toBe(false)
    await expect(join('channel:conv1', { token: 'owner-token' })).resolves.toBe(false)
    await expect(join('', { token: 'owner-token' })).resolves.toBe(false)
  })

  it('denies a malformed conversation room with an empty id', async () => {
    await expect(join('conversation:', { token: 'owner-token' })).resolves.toBe(false)
  })

  it('denies a conversation room for a conversation that does not exist', async () => {
    await expect(join('conversation:nope', { token: 'owner-token' })).resolves.toBe(false)
  })
})

describe('cookie-session fallback (in-memory-token model: page reloads have no auth.token)', () => {
  it('allows the owner whose ONLY credential is the httpOnly session cookie', async () => {
    await expect(
      join('conversation:conv1', {}, { cookie: 'mol_auth=1; token=owner-token' }),
    ).resolves.toBe(true)
  })

  it('prefers an explicit auth.token over the cookie', async () => {
    // Valid cookie but invalid explicit token → explicit token wins → deny.
    await expect(
      join('conversation:conv1', { token: 'forged-token' }, { cookie: 'token=owner-token' }),
    ).resolves.toBe(false)
  })

  it('denies when the cookie session belongs to another account', async () => {
    await expect(join('conversation:conv1', {}, { cookie: 'token=intruder-token' })).resolves.toBe(
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
      join('conversation:conv1', {}, { cookie: ['mol_auth=1', 'token=owner-token'] }),
    ).resolves.toBe(true)
  })
})
