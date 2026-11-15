// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { createElement, type ReactElement, type ReactNode, useEffect, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { type AuthClient, createJWTAuthClient, type StorageAdapter } from '@molecule/app-auth'
import { AuthProvider, useAuth } from '@molecule/app-react'

interface Account {
  username: string
  email: string
}

interface Item {
  id: string
}

const account: Account = { username: 'warehouse-manager', email: 'manager@example.test' }
const token = [
  btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
  btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })),
  btoa('test-signature'),
].join('.')

function storage(): StorageAdapter {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  }
}

function client(store: StorageAdapter): AuthClient<Account, { username: string }> {
  return createJWTAuthClient<Account, { username: string }>({
    storage: store,
    autoRefresh: false,
    tokenKey: 'inventory.session',
    authScheme: 'Token',
    currentUserEndpoint: '/accounts/me',
    mapAuthResponse: (data) => {
      const { token: accessToken, ...user } = (data as { account: Account & { token?: string } })
        .account
      return { accessToken: accessToken ?? '', user }
    },
  })
}

const clients: ReturnType<typeof client>[] = []
function trackedClient(store = storage()): ReturnType<typeof client> {
  const value = client(store)
  clients.push(value)
  return value
}

function wrapper(
  auth: ReturnType<typeof client>,
): (props: { children: ReactNode }) => ReactElement {
  return ({ children }: { children: ReactNode }) =>
    createElement(AuthProvider, { client: auth, awaitSession: false, children })
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

/** A signed-in inventory action with an independently loaded record. */
function InventoryAction({
  load,
  reserve,
  protectReadiness,
}: {
  load: () => Promise<Item>
  reserve: (id: string) => void
  protectReadiness: boolean
}): ReactElement {
  const { user, status } = useAuth<Account>()
  const [item, setItem] = useState<Item | null>(null)
  useEffect(() => {
    let cancelled = false
    void load().then((value) => {
      if (!cancelled) setItem(value)
    })
    return () => {
      cancelled = true
    }
  }, [load])
  const change = (): void => {
    if (!item) return
    reserve(item.id)
  }
  return createElement(
    'div',
    null,
    createElement('output', { 'data-testid': 'session' }, `${status}:${user?.username ?? ''}`),
    createElement(
      'button',
      {
        disabled: protectReadiness ? status !== 'authenticated' || !item : undefined,
        onClick: status === 'authenticated' ? change : undefined,
      },
      'Reserve stock',
    ),
  )
}

afterEach(() => {
  cleanup()
  for (const auth of clients.splice(0)) auth.destroy()
  vi.unstubAllGlobals()
})

describe('session status and independently loaded actions', () => {
  it.each(['login', 'register'] as const)(
    '%s publishes authenticated status and a profile to the real hook',
    async (operation) => {
      const auth = trackedClient()
      await auth.initialize()
      const { result } = renderHook(() => useAuth<Account>(), { wrapper: wrapper(auth) })
      expect(result.current.status).toBe('unauthenticated')
      const fetch = vi.fn(async () =>
        Response.json(
          { account: { ...account, token } },
          { status: operation === 'register' ? 201 : 200 },
        ),
      )
      vi.stubGlobal('fetch', fetch)
      await act(async () => {
        await auth[operation]({ ...account, password: 'test-password' })
      })
      expect(result.current.status).toBe('authenticated')
      expect(result.current.user).toEqual(account)
      expect(auth.getAccessToken()).toBe(token)
      expect(fetch).toHaveBeenCalledTimes(1)
    },
  )

  it('restores a stored token and profile synchronously on the first hook render', () => {
    const store = storage()
    trackedClient(store).setSession({ accessToken: token, user: account })
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const auth = trackedClient(store)
    const { result } = renderHook(() => useAuth<Account>(), { wrapper: wrapper(auth) })
    expect(result.current.status).toBe('authenticated')
    expect(result.current.user).toEqual(account)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('keeps a token-only restore loading until its current-user response arrives', async () => {
    const store = storage()
    store.setItem('inventory.session', token)
    const response = deferred<Response>()
    const fetch = vi.fn(() => response.promise)
    vi.stubGlobal('fetch', fetch)
    const auth = trackedClient(store)
    const { result } = renderHook(() => useAuth<Account>(), { wrapper: wrapper(auth) })
    expect(result.current.status).toBe('loading')
    expect(auth.getAccessToken()).toBe(token)
    await act(async () => {
      response.resolve(Response.json({ account }))
      await auth.initialize()
    })
    expect(result.current.status).toBe('authenticated')
    expect(result.current.user).toEqual(account)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('reproduces a discarded click with authenticated status before the record arrives', async () => {
    const auth = trackedClient()
    auth.setSession({ accessToken: token, user: account })
    const pending = deferred<Item>()
    const reserve = vi.fn()
    render(
      createElement(InventoryAction, {
        load: () => pending.promise,
        reserve,
        protectReadiness: false,
      }),
      { wrapper: wrapper(auth) },
    )
    expect(screen.getByTestId('session').textContent).toBe(`authenticated:${account.username}`)
    fireEvent.click(screen.getByRole('button', { name: 'Reserve stock' }))
    expect(reserve).not.toHaveBeenCalled()
    await act(async () => pending.resolve({ id: 'stock-1' }))
    // Loading data does not replay the discarded click.
    expect(reserve).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Reserve stock' }))
    expect(reserve).toHaveBeenCalledExactlyOnceWith('stock-1')
  })

  it('enables the corrected signed-in action only after its initial record loads', async () => {
    const auth = trackedClient()
    auth.setSession({ accessToken: token, user: account })
    const pending = deferred<Item>()
    const reserve = vi.fn()
    render(
      createElement(InventoryAction, {
        load: () => pending.promise,
        reserve,
        protectReadiness: true,
      }),
      { wrapper: wrapper(auth) },
    )
    const button = screen.getByRole('button', { name: 'Reserve stock' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(reserve).not.toHaveBeenCalled()
    await act(async () => pending.resolve({ id: 'stock-1' }))
    expect(button.disabled).toBe(false)
    fireEvent.click(button)
    expect(reserve).toHaveBeenCalledExactlyOnceWith('stock-1')
  })

  it('keeps a genuinely signed-out user unable to act even after the record loads', async () => {
    const auth = trackedClient()
    await auth.initialize()
    const pending = deferred<Item>()
    const reserve = vi.fn()
    render(
      createElement(InventoryAction, {
        load: () => pending.promise,
        reserve,
        protectReadiness: true,
      }),
      { wrapper: wrapper(auth) },
    )
    await act(async () => pending.resolve({ id: 'stock-1' }))
    expect(screen.getByTestId('session').textContent).toBe('unauthenticated:')
    const button = screen.getByRole('button', { name: 'Reserve stock' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(reserve).not.toHaveBeenCalled()
  })
})
