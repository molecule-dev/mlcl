// @vitest-environment jsdom
/**
 * `uploads/file-attachments`'s `AttachmentsPanel` had two silent failure paths,
 * both of which told the reader something the server never said:
 *
 * - The mount effect clears the list up front (so another record's files can
 *   never stand in for this one's while its own read is in flight), and `load()`
 *   returned on `!res.ok` / a rejected fetch WITHOUT writing anything — so a 500
 *   or an offline fetch left the list at `[]` and the panel rendered "No files
 *   attached yet." for a record whose files simply never arrived, with no way to
 *   retry. Its own comment claimed the opposite ("a failed load keeps the
 *   current list"), which cannot hold for the first load after that clear. The
 *   sibling slices state the intended rule at their own catches (Leaderboard,
 *   BlogIndexPage, OrdersPage, SettingsPage, DeleteAccountPage): a failed load
 *   is reported, never presented as an empty record.
 * - `remove()` returned on `!res.ok` and swallowed the rejection, keeping the
 *   row (correct — the attachment is still on the server) but giving the reader
 *   no account of why the click did nothing.
 *
 * These render the REAL panel into jsdom and drive its real request paths; only
 * the ClassMap / i18n / dropzone bonds are reduced to plain elements.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface Pending {
  url: string
  method: string
  answered: boolean
  respond: (status: number, body: unknown) => void
  fail: (error: Error) => void
}

const pending = vi.hoisted(() => ({ requests: [] as Pending[] }))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => 'stub' }),
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
      (options?.defaultValue ?? _key).replace(/\{\{(\w+)\}\}/g, (_match, name: string) =>
        String(values?.[name] ?? ''),
      ),
  }),
}))

// The dropzone is not what is under test — the panel's own list render is.
vi.mock('@molecule/app-file-dropzone-react', () => ({
  FileDropzone: (props: { onFiles: (files: File[]) => void; disabled?: boolean }) =>
    createElement(
      'button',
      {
        type: 'button',
        'aria-label': 'drop-files',
        disabled: props.disabled,
        onClick: () => props.onFiles([new File(['x'], 'new.txt', { type: 'text/plain' })]),
      },
      'drop',
    ),
}))

const { AttachmentsPanel } =
  (await import('../../../templates/.agents/skills/examples/uploads/file-attachments/app/components/AttachmentsPanel')) as {
    AttachmentsPanel: (props: { parentId: string }) => ReactNode
  }

/** One attachment row as `GET /api/attachments` returns it. */
const attachment = (id: string, filename: string): Record<string, unknown> => ({
  id,
  filename,
  mimetype: 'text/plain',
  size: 12,
  created_at: '2026-01-01T00:00:00.000Z',
})

// react-dom's act() requires this flag outside the React test renderer.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const originalFetch = globalThis.fetch

let container: HTMLElement
let root: Root

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve))
  })
}

async function mount(element: ReactNode): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(element)
  })
  await flush()
}

/** Answer the oldest unanswered request whose URL contains `fragment`. */
async function respond(fragment: string, status: number, body: unknown): Promise<void> {
  const request = pending.requests.find((r) => !r.answered && r.url.includes(fragment))
  if (!request) throw new Error(`no pending request for ${fragment}`)
  request.answered = true
  await act(async () => {
    request.respond(status, body)
  })
  await flush()
}

/** Reject the oldest unanswered request whose URL contains `fragment`. */
async function failRequest(fragment: string): Promise<void> {
  const request = pending.requests.find((r) => !r.answered && r.url.includes(fragment))
  if (!request) throw new Error(`no pending request for ${fragment}`)
  request.answered = true
  await act(async () => {
    request.fail(new Error('offline'))
  })
  await flush()
}

const text = (): string => container.textContent ?? ''

const listRequests = (): Pending[] =>
  pending.requests.filter((r) => r.method === 'GET' && r.url.includes('/api/attachments?'))

async function click(selector: string): Promise<void> {
  await act(async () => {
    container.querySelector(selector)?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
}

beforeEach(() => {
  pending.requests.length = 0
  globalThis.fetch = ((input: unknown, init?: { method?: string }) =>
    new Promise((resolve, reject) => {
      pending.requests.push({
        url: String(input),
        method: init?.method ?? 'GET',
        answered: false,
        respond: (status, body) =>
          resolve({
            ok: status >= 200 && status < 300,
            status,
            json: async () => body,
          }),
        fail: (error: Error) => reject(error),
      })
    })) as typeof globalThis.fetch
})

afterEach(async () => {
  globalThis.fetch = originalFetch
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('a failed attachment load is never rendered as an empty record', () => {
  it('reports a 500 instead of "No files attached yet", and the retry loads the rows', async () => {
    await mount(createElement(AttachmentsPanel, { parentId: 'o1' }))
    await respond('/api/attachments?parent_id=o1', 500, { error: 'boom' })

    expect(text(), 'a failed load is not an empty record').not.toContain('No files attached yet')
    expect(text(), 'the failure must be visible').toContain('Could not load the attachments')

    // The panel offers the retry the failure needs — and it is a REAL reload,
    // not a no-op: the second read's rows land and the failure line goes away.
    expect(container.querySelector('[data-mol-id="attachments-retry"]')).not.toBeNull()
    await click('[data-mol-id="attachments-retry"]')
    expect(listRequests(), 'the retry must issue a second read').toHaveLength(2)
    await respond('/api/attachments?parent_id=o1', 200, [attachment('a1', 'a.txt')])

    expect(text()).toContain('a.txt')
    expect(text(), 'a load that answered clears the failure').not.toContain(
      'Could not load the attachments',
    )
    expect(text()).not.toContain('No files attached yet')
  })

  it('reports a rejected fetch (offline) the same way', async () => {
    await mount(createElement(AttachmentsPanel, { parentId: 'o2' }))
    await failRequest('/api/attachments?parent_id=o2')

    expect(text()).not.toContain('No files attached yet')
    expect(text()).toContain('Could not load the attachments')
  })

  it('reports a 2xx body that is not the list, and an empty list stays empty', async () => {
    await mount(createElement(AttachmentsPanel, { parentId: 'o3' }))
    // A route that answered 200 with an envelope (a proxy rewrite, a shrunken
    // body) is not proof the record has no files.
    await respond('/api/attachments?parent_id=o3', 200, { error: 'nope' })
    expect(text(), 'a non-list body must not read as an empty record').not.toContain(
      'No files attached yet',
    )
    expect(text()).toContain('Could not load the attachments')

    // …while a genuine empty list still says so.
    await click('[data-mol-id="attachments-retry"]')
    await respond('/api/attachments?parent_id=o3', 200, [])
    expect(text()).toContain('No files attached yet')
    expect(text()).not.toContain('Could not load the attachments')
  })

  it('keeps a failed load out of the new record’s panel', async () => {
    await mount(createElement(AttachmentsPanel, { parentId: 'a' }))
    // Record A's read parks, then fails…
    await failRequest('/api/attachments?parent_id=a')
    expect(text()).toContain('Could not load the attachments')

    // …and B's own read answers with its rows: A's verdict must be gone.
    await act(async () => {
      root.render(createElement(AttachmentsPanel, { parentId: 'b' }))
    })
    await flush()
    await respond('/api/attachments?parent_id=b', 200, [attachment('b1', 'b.txt')])

    expect(text()).toContain('b.txt')
    expect(text()).not.toContain('Could not load the attachments')
  })
})

describe('a DELETE that did not happen is reported', () => {
  it('surfaces a refused DELETE and keeps the row', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      await mount(createElement(AttachmentsPanel, { parentId: 'o4' }))
      await respond('/api/attachments?parent_id=o4', 200, [attachment('a1', 'a.txt')])

      await click('[data-mol-id="attachment-delete"]')
      await respond('/api/attachments/a1', 500, { error: 'not allowed' })

      expect(text(), 'the row is still on the server').toContain('a.txt')
      expect(text(), 'the refusal must be visible').toContain('not allowed')
    } finally {
      confirmSpy.mockRestore()
    }
  })

  it('surfaces an offline DELETE and keeps the row', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      await mount(createElement(AttachmentsPanel, { parentId: 'o5' }))
      await respond('/api/attachments?parent_id=o5', 200, [attachment('a1', 'a.txt')])

      await click('[data-mol-id="attachment-delete"]')
      await failRequest('/api/attachments/a1')

      expect(text()).toContain('a.txt')
      expect(text()).toContain('Delete failed')
    } finally {
      confirmSpy.mockRestore()
    }
  })

  it('a second Delete click while the first is in flight issues ONE DELETE and no false failure', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      await mount(createElement(AttachmentsPanel, { parentId: 'o6' }))
      await respond('/api/attachments?parent_id=o6', 200, [attachment('a1', 'a.txt')])

      // The first click's DELETE parks on a slow server; the row is still on
      // screen, so the reader clicks Delete again. Unguarded, that second click
      // issued a SECOND DELETE, which answered 404 over the first's committed
      // deletion and painted "Delete failed" on a row that was gone.
      await click('[data-mol-id="attachment-delete"]')
      await click('[data-mol-id="attachment-delete"]')
      const deletes = pending.requests.filter(
        (r) => r.method === 'DELETE' && r.url.includes('/api/attachments/a1'),
      )
      expect(deletes, 'one DELETE per row while the first is in flight').toHaveLength(1)

      // The parked DELETE then commits: the row leaves the list with no failure
      // line, and the guard releases so the (now absent) row could be re-tried.
      await respond('/api/attachments/a1', 200, {})
      expect(text(), 'the deleted row is gone').not.toContain('a.txt')
      expect(text(), 'a deletion that succeeded reports no failure').not.toContain('Delete failed')
    } finally {
      confirmSpy.mockRestore()
    }
  })
})
