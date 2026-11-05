// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { createElement, type ReactElement } from 'react'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as AppLogger from '@molecule/app-logger'
import type * as AppReact from '@molecule/app-react'

const fixture = vi.hoisted(() => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  track: vi.fn(),
  // Keep the actual controller visible for the dashboard's error-only render as well.
  values: [] as Array<{ value: unknown; pending: boolean; error: unknown }>,
  t: (_key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
    (options?.defaultValue ?? _key).replace(/\{\{(\w+)\}\}/g, (_match, key: string) =>
      String(values?.[key] ?? ''),
    ),
}))

vi.mock('@molecule/app-react', async (original) => {
  const actual = await original<typeof AppReact>()
  return {
    ...actual,
    useHttpClient: () => fixture.http,
    useTranslation: () => ({ t: fixture.t }),
    useOptimisticValue: (...args: Parameters<typeof actual.useOptimisticValue>) => {
      const value = actual.useOptimisticValue(...args)
      fixture.values.push(value)
      return value
    },
  }
})
vi.mock('@molecule/app-analytics', () => ({ track: fixture.track }))
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_target, key) =>
          key === 'cn'
            ? (...parts: unknown[]) => parts.filter((part) => typeof part === 'string').join(' ')
            : () => 'stub',
      },
    ),
}))
vi.mock('@molecule/app-ui-react', () => ({ ConfirmButton: () => null }))
vi.mock('@molecule/app-logger', async (original) => ({
  ...(await original<typeof AppLogger>()),
  error: vi.fn(),
}))
vi.mock('../../../templates/apps/auction-platform/app/src/lib/realtime.js', () => ({
  getRealtimeConnection: async () => ({
    on: vi.fn(),
    off: vi.fn(),
    joinRoom: vi.fn(async () => undefined),
    leaveRoom: vi.fn(async () => undefined),
  }),
}))
vi.mock('../../../templates/apps/auction-platform/app/src/components/BidPanelCard.js', () => ({
  BidPanelCard: () => null,
}))
vi.mock('../../../templates/apps/meal-planner/app/src/components/SimmerTopBar.js', () => ({
  SimmerTopBar: ({ title, eyebrow }: { title: string; eyebrow: string }) =>
    createElement('header', null, title, eyebrow),
}))

import { Rules } from '../../../templates/apps/ai-document-processor/app/src/pages/Rules.js'
import { AuctionDetail } from '../../../templates/apps/auction-platform/app/src/pages/AuctionDetail.js'
import { Dashboard } from '../../../templates/apps/habit-tracker/app/src/pages/Dashboard.js'
import { Notifications } from '../../../templates/apps/itinerary-planner/app/src/pages/Notifications.js'
import { GroceryList } from '../../../templates/apps/meal-planner/app/src/pages/GroceryList.js'
import { EventTypeEditor } from '../../../templates/apps/meeting-scheduler/app/src/pages/EventTypeEditor.js'

function deferred<T = unknown>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
} {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

const response = (data: unknown): { data: unknown } => ({ data })
const checkState = (): (typeof fixture.values)[number] => fixture.values.at(-1)!

async function flush(): Promise<void> {
  await act(async () => {})
}

function pageElement(component: () => ReactElement, route = '/'): ReactElement {
  return createElement(
    MemoryRouter,
    { initialEntries: [route] },
    createElement(
      Routes,
      null,
      createElement(Route, {
        path: route.startsWith('/event-types/')
          ? '/event-types/:id'
          : route.startsWith('/auctions/')
            ? '/auctions/:id'
            : '*',
        element: createElement(component),
      }),
    ),
  )
}

async function mount(
  component: () => ReactElement,
  route = '/',
): Promise<ReturnType<typeof render>> {
  const view = render(pageElement(component, route))
  await flush()
  return view
}

function click(view: ReturnType<typeof render>, selector: string): void {
  const element = view.container.querySelector(selector)
  expect(element, selector).not.toBeNull()
  fireEvent.click(element!)
}

const grocery = (id: string, checked = false): Record<string, unknown> => ({
  id,
  name: id,
  checked,
  quantity: 1,
  unit: '',
  category: 'other',
  source: 'manual',
  in_pantry: false,
  pantry_quantity: null,
  pantry_unit: null,
})
const notification = (id: string, read = false): Record<string, unknown> => ({
  id,
  read,
  title: id,
  body: '',
  kind: 'system',
  created_at: new Date().toISOString(),
})
const habit = (id: string, done = false, streak = 2): Record<string, unknown> => ({
  id,
  name: id,
  emoji: '',
  category: 'health',
  cadence: 'daily',
  completed_today: done,
  current_streak: streak,
  longest_streak: 4,
})
const eventType = (id: string, active = true): Record<string, unknown> => ({
  id,
  owner_id: 'owner',
  name: 'Meeting',
  slug: 'meeting',
  description: '',
  duration_minutes: 30,
  location_kind: 'jitsi',
  location_value: null,
  buffer_before_minutes: 0,
  buffer_after_minutes: 0,
  min_notice_minutes: 0,
  max_per_day: null,
  requires_confirmation: false,
  color: null,
  is_active: active,
})

beforeEach(() => {
  vi.resetAllMocks()
  fixture.values.length = 0
  fixture.track.mockResolvedValue(undefined)
  fixture.http.get.mockResolvedValue(response([]))
})
afterEach(cleanup)

describe('the shipped template toggles with real optimistic state', () => {
  it('the auction watchlist accepts an undo while saving and preserves success analytics', async () => {
    fixture.http.get.mockResolvedValue(
      response({
        id: 'lot',
        title: 'Lot',
        lot: '1',
        category: 'Art',
        description: '',
        seller: { handle: 'seller', name: 'Seller', rating: 5, sales: 0 },
        current_bid_cents: 100,
        bid_count: 0,
        bid_increment_cents: 10,
        ends_at: '2030-01-01T00:00:00.000Z',
        status: 'live',
        images: [],
        bid_history: [],
        shipping_from: '',
        return_window_days: 14,
        reserve_met: true,
        is_watched: false,
      }),
    )
    const add = deferred(),
      remove = deferred()
    fixture.http.post.mockReturnValueOnce(add.promise)
    fixture.http.delete.mockReturnValueOnce(remove.promise)
    const view = await mount(AuctionDetail, '/auctions/lot')
    const button = view.container.querySelector<HTMLButtonElement>('button[aria-pressed]')!
    fireEvent.click(button)
    expect(button.disabled).toBe(false)
    fireEvent.click(button)
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(fixture.http.delete).not.toHaveBeenCalled()
    await act(async () => add.resolve(response({})))
    expect(fixture.http.delete).toHaveBeenCalledWith('/api/watchlist/lot')
    await act(async () => remove.resolve(response({})))
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(view.container.textContent).toContain('Removed from watchlist.')
    expect(fixture.track.mock.calls.map(([event]) => event.name)).toEqual([
      'watchlist.added',
      'watchlist.removed',
    ])
  })
  it('grocery partial failure keeps a preceding successful untick even when the reload equals the initial list', async () => {
    const initial = [grocery('a'), grocery('b')]
    fixture.http.get.mockResolvedValue(response(initial))
    const first = deferred(),
      undo = deferred(),
      failed = deferred()
    fixture.http.put
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(undo.promise)
      .mockReturnValueOnce(failed.promise)
    const view = await mount(GroceryList)
    click(view, '[data-mol-id="grocery-check-a"]')
    click(view, '[data-mol-id="grocery-check-a"]')
    click(view, '[data-mol-id="grocery-check-b"]')
    await act(async () => first.resolve(response({})))
    // The second commit contains both a's undo and b's new check.
    await act(async () => undo.resolve(response({})))
    await act(async () => failed.reject(new Error('cannot check b')))
    await flush()
    const boxes = [...view.container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
    expect(boxes.map((box) => box.checked)).toEqual([false, false])
    expect(fixture.http.put).toHaveBeenCalledTimes(3)
    expect(view.container.textContent).toContain('cannot check b')
  })

  it('notification partial failure keeps the successfully unread row and its error', async () => {
    const initial = [notification('a'), notification('b')]
    fixture.http.get.mockResolvedValue(response(initial))
    const first = deferred(),
      undo = deferred(),
      failed = deferred()
    fixture.http.put
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(undo.promise)
      .mockReturnValueOnce(failed.promise)
    const view = await mount(Notifications)
    click(view, '[data-testid="notifications-toggle"]')
    click(view, '[data-testid="notifications-toggle"]')
    click(
      view,
      '[data-testid="notifications-row"]:nth-child(2) [data-testid="notifications-toggle"]',
    )
    await act(async () => first.resolve(response({})))
    await act(async () => undo.resolve(response({})))
    await act(async () => failed.reject(new Error('cannot read b')))
    await flush()
    expect(
      [...view.container.querySelectorAll('[data-testid="notifications-row"]')].map((row) =>
        row.getAttribute('data-read'),
      ),
    ).toEqual(['false', 'false'])
    expect(view.container.textContent).toContain('cannot read b')
  })

  it('habit partial failure rolls back only the failed check and still refreshes today after the successful one', async () => {
    const initial = [habit('a'), habit('b')]
    fixture.http.get.mockImplementation(async (url: string) =>
      response(
        url === '/api/habits' ? initial : url.endsWith('/today') ? { active_streaks: 0 } : null,
      ),
    )
    const first = deferred(),
      undo = deferred(),
      failed = deferred()
    fixture.http.post.mockReturnValueOnce(first.promise).mockReturnValueOnce(failed.promise)
    fixture.http.delete.mockReturnValueOnce(undo.promise)
    const view = await mount(Dashboard)
    const buttons = (): HTMLButtonElement[] => [
      ...view.container.querySelectorAll<HTMLButtonElement>('button[aria-pressed]'),
    ]
    expect(buttons()).toHaveLength(2)
    fireEvent.click(buttons()[0])
    fireEvent.click(buttons()[0])
    fireEvent.click(buttons()[1])
    await act(async () => first.resolve(response({ habit: habit('a', true, 3) })))
    await act(async () => undo.resolve(response({ habit: habit('a', false, 2) })))
    await act(async () => failed.reject(new Error('cannot check b')))
    expect(checkState().value).toMatchObject({
      a: { done: false, streak: 2 },
      b: { done: false, streak: 2 },
    })
    expect(
      fixture.http.get.mock.calls.filter(([url]) => url === '/api/reports/today'),
    ).toHaveLength(3)
    expect(view.container.textContent).toContain('cannot check b')
    expect(fixture.track).toHaveBeenCalledWith({
      name: 'streak.milestone',
      properties: { habit_id: 'a', streak: 3 },
    })
  })

  it('mark-all-read and a later unread click are saved in order and keep the final refresh', async () => {
    fixture.http.get.mockResolvedValue(response([notification('a', true), notification('b')]))
    const unread = deferred(),
      bulk = deferred(),
      last = deferred()
    fixture.http.put.mockReturnValueOnce(unread.promise).mockReturnValueOnce(last.promise)
    fixture.http.post.mockReturnValueOnce(bulk.promise)
    const view = await mount(Notifications)
    click(view, '[data-testid="notifications-toggle"]') // a becomes unread
    click(view, '[data-testid="notifications-mark-all-read"]')
    expect(fixture.http.post).not.toHaveBeenCalled()
    expect(
      [...view.container.querySelectorAll('[data-testid="notifications-row"]')].every(
        (row) => row.getAttribute('data-read') === 'true',
      ),
    ).toBe(true)
    await act(async () => unread.resolve(response({})))
    expect(fixture.http.post).toHaveBeenCalledWith('/notifications/mark-all-read', {})
    click(view, '[data-testid="notifications-toggle"]') // a becomes unread after the bulk intent
    fixture.http.get.mockResolvedValue(response([notification('a', true), notification('b', true)]))
    await act(async () => bulk.resolve(response({})))
    expect(fixture.http.put).toHaveBeenLastCalledWith('/notifications/a', { read: false })
    await act(async () => last.resolve(response({})))
    expect(
      view.container.querySelector('[data-testid="notifications-row"]')?.getAttribute('data-read'),
    ).toBe('false')
    expect(fixture.http.get).toHaveBeenCalledTimes(2)
  })

  it('a full editor save keeps its payload and reflects canonical fields', async () => {
    fixture.http.get.mockResolvedValue(response(eventType('a')))
    fixture.http.patch.mockResolvedValue(response({ ...eventType('a'), name: 'Normalized' }))
    const view = await mount(EventTypeEditor, '/event-types/a')
    fireEvent.submit(view.container.querySelector('form')!)
    await flush()
    expect(fixture.http.patch.mock.calls[0]?.[1]).toHaveProperty('is_active', true)
    expect(
      view.container.querySelector<HTMLInputElement>('[data-testid="event-type-name"]')?.value,
    ).toBe('Normalized')
  })

  it('a grocery refetch during a save keeps the tap and later accepts an unrelated server change', async () => {
    fixture.http.get.mockResolvedValue(response([grocery('a'), grocery('b')]))
    const save = deferred()
    fixture.http.put.mockReturnValueOnce(save.promise)
    const view = await mount(GroceryList)
    click(view, '[data-mol-id="grocery-check-a"]')
    fixture.http.get.mockResolvedValue(response([grocery('a'), grocery('b', true)]))
    fixture.http = { ...fixture.http }
    view.rerender(pageElement(GroceryList))
    await flush()
    expect(
      view.container.querySelector<HTMLInputElement>('[data-mol-id="grocery-check-a"]')?.checked,
    ).toBe(true)
    await act(async () => save.resolve(response({})))
    expect(
      [...view.container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].map(
        (input) => input.checked,
      ),
    ).toEqual([true, true])
  })

  it('a notification refetch during a save preserves another row accepted by the server', async () => {
    fixture.http.get.mockResolvedValue(response([notification('a'), notification('b')]))
    const save = deferred()
    fixture.http.put.mockReturnValueOnce(save.promise)
    const view = await mount(Notifications)
    click(view, '[data-testid="notifications-toggle"]')
    fixture.http.get.mockResolvedValue(response([notification('a'), notification('b', true)]))
    fixture.http = { ...fixture.http }
    view.rerender(pageElement(Notifications))
    await flush()
    expect(
      view.container.querySelector('[data-testid="notifications-row"]')?.getAttribute('data-read'),
    ).toBe('true')
    await act(async () => save.resolve(response({})))
    expect(
      [...view.container.querySelectorAll('[data-testid="notifications-row"]')].map((row) =>
        row.getAttribute('data-read'),
      ),
    ).toEqual(['true', 'true'])
  })

  it('a habit refetch during a save keeps an unrelated canonical streak', async () => {
    let rows = [habit('a'), habit('b')]
    fixture.http.get.mockImplementation(async (url: string) =>
      response(url === '/api/habits' ? rows : null),
    )
    const save = deferred()
    fixture.http.post.mockReturnValueOnce(save.promise)
    const view = await mount(Dashboard)
    click(view, '[data-testid="habit-toggle-a"]')
    rows = [habit('a'), habit('b', false, 9)]
    fixture.http = { ...fixture.http }
    view.rerender(pageElement(Dashboard))
    await flush()
    expect(view.container.textContent).toContain('Today — 1 of 2 done')
    await act(async () => save.resolve(response({ habit: habit('a', true, 3) })))
    expect(checkState().value).toEqual({
      a: { done: true, streak: 3 },
      b: { done: false, streak: 9 },
    })
  })

  it('a habit added by a mid-save refetch accepts its own check-in', async () => {
    let rows = [habit('a')]
    fixture.http.get.mockImplementation(async (url: string) =>
      response(url === '/api/habits' ? rows : null),
    )
    const first = deferred(),
      second = deferred()
    fixture.http.post.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const view = await mount(Dashboard)
    click(view, '[data-testid="habit-toggle-a"]')
    rows = [habit('a'), habit('b')]
    fixture.http = { ...fixture.http }
    view.rerender(pageElement(Dashboard))
    await flush()
    click(view, '[data-testid="habit-toggle-b"]')
    expect(view.container.textContent).toContain('Today — 2 of 2 done')
    await act(async () => first.resolve(response({ habit: habit('a', true, 3) })))
    expect(fixture.http.post).toHaveBeenLastCalledWith('/api/habits/b/check-in', {})
    await act(async () => second.resolve(response({ habit: habit('b', true, 3) })))
    expect(checkState().value).toMatchObject({ b: { done: true, streak: 3 } })
  })

  it('clear checked waits for ticks while the tick control keeps accepting clicks', async () => {
    fixture.http.get.mockResolvedValue(response([grocery('a')]))
    fixture.http.delete.mockResolvedValue(response({}))
    const save = deferred()
    fixture.http.put.mockReturnValueOnce(save.promise)
    const view = await mount(GroceryList)
    click(view, '[data-mol-id="grocery-check-a"]')
    const clear = view.container.querySelector<HTMLButtonElement>(
      '[data-mol-id="groceries-clear-checked"]',
    )!
    expect(clear.disabled).toBe(true)
    expect(
      view.container.querySelector<HTMLInputElement>('[data-mol-id="grocery-check-a"]')?.disabled,
    ).toBe(false)
    fireEvent.click(clear)
    expect(fixture.http.delete).not.toHaveBeenCalled()
    await act(async () => save.resolve(response({})))
    expect(clear.disabled).toBe(false)
    fireEvent.click(clear)
    await flush()
    expect(fixture.http.delete).toHaveBeenCalledWith('/api/grocery-list/checked')
    expect(view.container.querySelector('[data-mol-id="grocery-check-a"]')).toBeNull()
  })

  it('queued grocery saves keep their original week after navigation', async () => {
    fixture.http.get.mockImplementation(async (url: string) =>
      response([grocery(url.includes('2026-11-02') ? 'a' : 'b')]),
    )
    const first = deferred(),
      undo = deferred()
    fixture.http.put.mockReturnValueOnce(first.promise).mockReturnValueOnce(undo.promise)
    const view = await mount(GroceryList, '/?week=2026-11-02')
    fireEvent.change(view.container.querySelector('[data-mol-id="groceries-add-name"]')!, {
      target: { value: 'Oats' },
    })
    click(view, '[data-mol-id="grocery-check-a"]')
    click(view, '[data-mol-id="grocery-check-a"]')
    click(view, '[data-mol-id="week-next"]')
    await flush()
    expect(view.container.querySelector('[data-mol-id="grocery-check-b"]')).not.toBeNull()
    expect(
      view.container.querySelector<HTMLInputElement>('[data-mol-id="groceries-add-name"]')?.value,
    ).toBe('Oats')
    await act(async () => first.resolve(response({})))
    await act(async () => undo.resolve(response({})))
    expect(
      fixture.track.mock.calls
        .filter(([event]) => event.properties.item_id === 'a')
        .map(([event]) => event.properties.week_start),
    ).toEqual(['2026-11-02', '2026-11-02'])
  })

  it('switching event records creates a fresh optimistic value', async () => {
    fixture.http.get.mockImplementation(async (url: string) =>
      response(eventType(url.endsWith('/b') ? 'b' : 'a')),
    )
    fixture.http.patch.mockResolvedValue(response(eventType('a', false)))
    const view = render(
      createElement(
        MemoryRouter,
        { initialEntries: ['/event-types/a'] },
        createElement(Link, { to: '/event-types/b', id: 'other-record' }, 'Other'),
        createElement(
          Routes,
          null,
          createElement(Route, {
            path: '/event-types/:id',
            element: createElement(EventTypeEditor),
          }),
        ),
      ),
    )
    await flush()
    click(view, '[data-testid="toggle-active"]')
    await flush()
    click(view, '#other-record')
    await flush()
    expect(view.container.querySelector('[data-testid="toggle-active"]')?.textContent).toContain(
      'Active',
    )
    expect(fixture.http.patch).toHaveBeenCalledTimes(1)
  })

  it('a new event type keeps its switch as a draft until Save', async () => {
    fixture.http.post.mockResolvedValue(response(eventType('created', false)))
    const view = await mount(EventTypeEditor, '/event-types/new')
    click(view, '[data-testid="toggle-active"]')
    await flush()
    expect(fixture.http.patch).not.toHaveBeenCalled()
    fireEvent.submit(view.container.querySelector('form')!)
    await flush()
    expect(fixture.http.post.mock.calls[0]?.[1]).toHaveProperty('is_active', false)
  })

  it('a rule counts two clicks in one render and tracks both choices', async () => {
    fixture.http.get.mockImplementation(async (url: string) =>
      response(
        url.includes('templates')
          ? []
          : [
              {
                id: 'r',
                name: 'Rule',
                enabled: true,
                conditions: [],
                matchedType: 'invoice',
                matched_count_30d: 1,
                action: 'file',
                destination: 'Inbox',
              },
            ],
      ),
    )
    const first = deferred(),
      second = deferred()
    fixture.http.patch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const view = await mount(Rules)
    const input = view.container.querySelector<HTMLInputElement>('[data-mol-id="rule-r-toggle"]')!
    act(() => {
      fireEvent.click(input)
      fireEvent.click(input)
    })
    expect(input.checked).toBe(true)
    expect(fixture.track.mock.calls.map(([event]) => event.properties.enabled)).toEqual([
      false,
      true,
    ])
    await act(async () => first.resolve(response({})))
    expect(fixture.http.patch).toHaveBeenLastCalledWith('/api/extraction-rules/r', {
      enabled: true,
    })
    await act(async () => second.resolve(response({})))
  })
})
