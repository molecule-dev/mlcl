/**
 * Unit tests for the realtime connection singleton (lib/realtime.ts).
 *
 * `@molecule/app-realtime`'s `connect` and the auth bond are mocked, so no
 * transport is required. The suite pins the module's contract:
 *
 *   - lazy singleton: repeated calls share ONE connection promise,
 *   - handshake auth: `connect('/', { auth: { token } })` with the SAME
 *     token the HTTP client uses (authClient.getAccessToken()),
 *   - a failed connect is not cached (later calls retry),
 *   - reset/logout tears the socket down and allows a fresh connection.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RealtimeConnection } from '@molecule/app-realtime'

type AuthListener = (event: { type: string }) => void

/** The shape of lib/realtime.ts, for typed dynamic re-imports. */
interface RealtimeModule {
  getRealtimeConnection: () => Promise<RealtimeConnection>
  resetRealtimeConnection: () => void
}

const { connectMock, authClientMock, authListeners, authState, stateSubscribers } = vi.hoisted(
  () => {
    const authListeners: AuthListener[] = []
    const stateSubscribers: Array<(state: { initialized: boolean }) => void> = []
    const authState = { initialized: true }
    const connectMock = vi.fn()
    const authClientMock = {
      getAccessToken: vi.fn((): string | null => 'token-123'),
      getState: vi.fn(() => ({ ...authState })),
      subscribe: vi.fn((callback: (state: { initialized: boolean }) => void) => {
        stateSubscribers.push(callback)
        return () => {
          const idx = stateSubscribers.indexOf(callback)
          if (idx !== -1) stateSubscribers.splice(idx, 1)
        }
      }),
      addEventListener: vi.fn((listener: AuthListener) => {
        authListeners.push(listener)
        return () => {}
      }),
    }
    return { connectMock, authClientMock, authListeners, authState, stateSubscribers }
  },
)

vi.mock('@molecule/app-realtime', () => ({ connect: connectMock }))

vi.mock('../bonds/auth-default.js', () => ({ authClient: authClientMock }))

interface MockConnection {
  joinRoom: ReturnType<typeof vi.fn>
  leaveRoom: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
  off: ReturnType<typeof vi.fn>
  onReconnect: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
}

const makeConnection = (): MockConnection => ({
  joinRoom: vi.fn(async () => undefined),
  leaveRoom: vi.fn(async () => undefined),
  on: vi.fn(),
  off: vi.fn(),
  onReconnect: vi.fn(),
  disconnect: vi.fn(),
})

/** Flush the microtask queue so .then() chains inside the module settle. */
const flush = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0))

const importModule = (): Promise<RealtimeModule> => import('../lib/realtime.js')

beforeEach(() => {
  // The module keeps singleton state — a fresh import per test isolates it.
  vi.resetModules()
  connectMock.mockReset()
  authClientMock.getAccessToken.mockReset().mockReturnValue('token-123')
  authClientMock.getState.mockReset().mockImplementation(() => ({ ...authState }))
  authClientMock.subscribe.mockClear()
  authClientMock.addEventListener.mockClear()
  authListeners.length = 0
  stateSubscribers.length = 0
  authState.initialized = true
})

describe('getRealtimeConnection', () => {
  it("connects same-origin ('/') with the auth client's token as handshake auth", async () => {
    const connection = makeConnection()
    connectMock.mockResolvedValue(connection)
    const { getRealtimeConnection } = await importModule()

    await expect(getRealtimeConnection()).resolves.toBe(connection)
    expect(connectMock).toHaveBeenCalledTimes(1)
    expect(connectMock).toHaveBeenCalledWith('/', { auth: { token: 'token-123' } })
  })

  it('reads the token at connect time, not module load', async () => {
    const connection = makeConnection()
    connectMock.mockResolvedValue(connection)
    const { getRealtimeConnection } = await importModule()

    // Token changes AFTER import but BEFORE the first connection.
    authClientMock.getAccessToken.mockReturnValue('fresh-token')
    await getRealtimeConnection()
    expect(connectMock).toHaveBeenCalledWith('/', { auth: { token: 'fresh-token' } })
  })

  it('is a singleton: repeated calls share one connect()', async () => {
    const connection = makeConnection()
    connectMock.mockResolvedValue(connection)
    const { getRealtimeConnection } = await importModule()

    const first = getRealtimeConnection()
    const second = getRealtimeConnection()
    expect(second).toBe(first)
    await first
    await expect(getRealtimeConnection()).resolves.toBe(connection)
    expect(connectMock).toHaveBeenCalledTimes(1)
  })

  it('does not cache a failed connect — the next call retries', async () => {
    connectMock.mockRejectedValueOnce(new Error('transport down'))
    const { getRealtimeConnection } = await importModule()

    await expect(getRealtimeConnection()).rejects.toThrow('transport down')
    await flush()

    const connection = makeConnection()
    connectMock.mockResolvedValue(connection)
    await expect(getRealtimeConnection()).resolves.toBe(connection)
    expect(connectMock).toHaveBeenCalledTimes(2)
  })

  it('waits for auth session restore before connecting (no token:null handshake)', async () => {
    const connection = makeConnection()
    connectMock.mockResolvedValue(connection)
    // Session restore still in flight: no token yet, not initialized.
    authState.initialized = false
    authClientMock.getAccessToken.mockReturnValue(null)
    const { getRealtimeConnection } = await importModule()

    const pending = getRealtimeConnection()
    await flush()
    // Must NOT have connected while the auth client is uninitialized.
    expect(connectMock).not.toHaveBeenCalled()

    // Restore completes: token available, subscribers notified.
    authState.initialized = true
    authClientMock.getAccessToken.mockReturnValue('restored-token')
    for (const subscriber of stateSubscribers) subscriber({ initialized: true })

    await expect(pending).resolves.toBe(connection)
    expect(connectMock).toHaveBeenCalledWith('/', { auth: { token: 'restored-token' } })
  })
})

describe('resetRealtimeConnection', () => {
  it('disconnects the cached connection and allows a fresh one', async () => {
    const first = makeConnection()
    const second = makeConnection()
    connectMock.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
    const { getRealtimeConnection, resetRealtimeConnection } = await importModule()

    await getRealtimeConnection()
    resetRealtimeConnection()
    await flush()
    expect(first.disconnect).toHaveBeenCalledTimes(1)

    await expect(getRealtimeConnection()).resolves.toBe(second)
    expect(connectMock).toHaveBeenCalledTimes(2)
  })
})

describe('auth boundary wiring', () => {
  it('drops the socket on the auth logout event', async () => {
    const connection = makeConnection()
    connectMock.mockResolvedValue(connection)
    const { getRealtimeConnection } = await importModule()

    await getRealtimeConnection()
    expect(authListeners.length).toBeGreaterThan(0)

    for (const listener of authListeners) listener({ type: 'logout' })
    await flush()
    expect(connection.disconnect).toHaveBeenCalledTimes(1)

    // A later call (after re-login) opens a NEW connection.
    await getRealtimeConnection()
    expect(connectMock).toHaveBeenCalledTimes(2)
  })

  it('drops a possibly-anonymous socket on login so the next connect carries the fresh token', async () => {
    const first = makeConnection()
    const second = makeConnection()
    connectMock.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
    const { getRealtimeConnection } = await importModule()

    await getRealtimeConnection()
    for (const listener of authListeners) listener({ type: 'login' })
    await flush()
    expect(first.disconnect).toHaveBeenCalledTimes(1)

    await expect(getRealtimeConnection()).resolves.toBe(second)
    expect(connectMock).toHaveBeenCalledTimes(2)
  })

  it('ignores auth events that do not change identity (refresh)', async () => {
    const connection = makeConnection()
    connectMock.mockResolvedValue(connection)
    const { getRealtimeConnection } = await importModule()

    await getRealtimeConnection()
    for (const listener of authListeners) listener({ type: 'refresh' })
    await flush()
    expect(connection.disconnect).not.toHaveBeenCalled()
    expect(connectMock).toHaveBeenCalledTimes(1)
  })
})
