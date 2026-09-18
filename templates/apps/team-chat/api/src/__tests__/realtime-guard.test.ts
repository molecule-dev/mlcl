/**
 * Unit tests for the realtime join guard (lib/realtime-guard.ts) — the
 * authorization boundary for live channel subscriptions.
 *
 * The guard must mirror the HTTP layer's channel-membership contract at the
 * socket layer:
 *
 *   - only `channel:<id>` rooms are joinable (anything else is denied),
 *   - the handshake `auth.token` must be a verifiable bearer JWT
 *     (@molecule/api-jwt `verify` — signature + expiry, never a bare decode),
 *   - the authenticated user must be a channel member (channel_members row)
 *     or the channel's creator (implicit member, matching authorizeChannel).
 *
 * No realtime transport or database is required: `onJoinRequest` is mocked to
 * capture the registered guard, `verify` is mocked per-token, and `findOne`
 * reads an in-memory store (same style as the authz suites).
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
    // c1 has an explicit member; c2's only access path is its creator (no
    // membership row — the legacy-channel case authorizeChannel also covers).
    tables.channels = [
      { id: 'c1', created_by: 'owner', name: 'general' },
      { id: 'c2', created_by: 'creator', name: 'legacy' },
    ]
    tables.channel_members = [{ id: 'm1', channel_id: 'c1', user_id: 'member', role: 'member' }]
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
    if (token === 'member-token') return { userId: 'member' }
    if (token === 'outsider-token') return { userId: 'outsider' }
    if (token === 'creator-token') return { userId: 'creator' }
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
  it('allows a channel member into that channel room', async () => {
    await expect(join('channel:c1', { token: 'member-token' })).resolves.toBe(true)
  })

  it('denies a non-member of the channel', async () => {
    await expect(join('channel:c1', { token: 'outsider-token' })).resolves.toBe(false)
  })

  it('denies a member of a DIFFERENT channel (no cross-channel bleed)', async () => {
    // 'member' belongs to c1 only; c2 must stay closed to them.
    await expect(join('channel:c2', { token: 'member-token' })).resolves.toBe(false)
  })

  it('allows the channel creator even without a membership row (legacy channels)', async () => {
    await expect(join('channel:c2', { token: 'creator-token' })).resolves.toBe(true)
  })

  it('denies a bad token', async () => {
    await expect(join('channel:c1', { token: 'forged-token' })).resolves.toBe(false)
  })

  it('denies a missing or non-string token', async () => {
    await expect(join('channel:c1', {})).resolves.toBe(false)
    await expect(join('channel:c1', { token: 42 })).resolves.toBe(false)
  })

  it('denies a token whose verified payload carries no userId', async () => {
    await expect(join('channel:c1', { token: 'string-payload-token' })).resolves.toBe(false)
  })

  it('denies non-channel rooms outright, even for a valid member', async () => {
    await expect(join('general', { token: 'member-token' })).resolves.toBe(false)
    await expect(join('user:member', { token: 'member-token' })).resolves.toBe(false)
    await expect(join('', { token: 'member-token' })).resolves.toBe(false)
  })

  it('denies a malformed channel room with an empty id', async () => {
    await expect(join('channel:', { token: 'member-token' })).resolves.toBe(false)
  })

  it('denies a channel room for a channel that does not exist', async () => {
    await expect(join('channel:nope', { token: 'member-token' })).resolves.toBe(false)
  })
})

describe('cookie-session fallback (in-memory-token model: page reloads have no auth.token)', () => {
  it('allows a member whose ONLY credential is the httpOnly session cookie', async () => {
    await expect(
      join('channel:c1', {}, { cookie: 'mol_auth=1; token=member-token' }),
    ).resolves.toBe(true)
  })

  it('prefers an explicit auth.token over the cookie', async () => {
    // Valid cookie but invalid explicit token → explicit token wins → deny.
    await expect(
      join('channel:c1', { token: 'forged-token' }, { cookie: 'token=member-token' }),
    ).resolves.toBe(false)
  })

  it('denies when the cookie session belongs to a non-member', async () => {
    await expect(join('channel:c1', {}, { cookie: 'token=outsider-token' })).resolves.toBe(false)
  })

  it('denies when the cookie header carries no session cookie', async () => {
    await expect(join('channel:c1', {}, { cookie: 'mol_auth=1; theme=dark' })).resolves.toBe(false)
    await expect(join('channel:c1', {}, {})).resolves.toBe(false)
  })

  it('handles a cookie header split across multiple values', async () => {
    await expect(
      join('channel:c1', {}, { cookie: ['mol_auth=1', 'token=member-token'] }),
    ).resolves.toBe(true)
  })
})
