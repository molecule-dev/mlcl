// @vitest-environment jsdom
/**
 * `ChatPage` interpolates the channel id into a QUERY STRING twice — the
 * history read (`GET /api/messages?channel_id=…`) and the SSE room join
 * (`?room=channel:…`) — and both did it raw, so the id was parsed as URL syntax
 * instead of as one value:
 *
 * - `#` starts a FRAGMENT. A channel named `C#` asked for
 *   `/api/messages?channel_id=C` — the history of a DIFFERENT room, rendered
 *   under the room the reader opened — and the EventSource joined
 *   `channel:C`, so that tab received the other room's live messages.
 * - `&` splits the value into a second parameter (`channel_id=a&limit=1`).
 * - `+` decodes back to a SPACE on both sides of the wire (`URLSearchParams` and
 *   Express's `qs` read `+` as a space), so `c++` queried the room `c  `.
 *
 * The write is unaffected (the POST body is JSON), which is what makes the
 * unencoded read the dangerous half: the message landed in the room the reader
 * is in while the history and the live feed came from another one.
 *
 * The provider decodes the room value (`url.searchParams`), so the fix is to
 * send the ENCODED form — the same shape the notification bell already uses
 * (`?room=${encodeURIComponent(`user:${userId}`)}`). This drives the REAL
 * component (only the UI primitives / ClassMap / i18n are stubbed) and asserts
 * the URLs it actually requests: the encoded wire form, AND that decoding it
 * gives back exactly the channel the reader opened (so the fix cannot be
 * "encode something else").
 *
 * @module
 */
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Styling only: every ClassMap helper collapses to one token.
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

// Neither primitive is what is under test.
vi.mock('@molecule/app-message-bubble-react', () => ({ MessageBubble: () => null }))
vi.mock('@molecule/app-typing-indicator-react', () => ({ TypingIndicator: () => null }))

const { ChatPage } =
  (await import('../../../templates/.agents/skills/examples/messaging/in-app-chat/app/pages/ChatPage.js')) as {
    ChatPage: (props: { channelId: string }) => ReactNode
  }

/** One captured EventSource — its URL is the raw subscribe request line. */
interface FakeSource {
  url: string
  closed: boolean
}

let sources: FakeSource[] = []

class FakeEventSource {
  private readonly source: FakeSource
  constructor(url: string) {
    this.source = { url, closed: false }
    sources.push(this.source)
  }
  addEventListener(): void {
    // The frames are not what is under test here.
  }
  close(): void {
    this.source.closed = true
  }
}

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const originalFetch = globalThis.fetch
const originalEventSource = (globalThis as { EventSource?: unknown }).EventSource
/** Every request URL the page produced, in order. */
let requests: string[] = []

let container: HTMLElement
let root: Root

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve))
  })
}

/** Mount the page for one channel id; the loads stay pending (only URLs matter). */
async function mountChat(channelId: string): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(createElement(ChatPage, { channelId }))
  })
  await flush()
}

/** The page's history request URL, found by prefix (the `/api/me` probe precedes it). */
function historyUrl(): string {
  const url = requests.find((r) => r.startsWith('/api/messages'))
  if (!url) throw new Error(`the page requested no message history — got: ${requests.join(', ')}`)
  return url
}

beforeEach(() => {
  sources = []
  requests = []
  ;(globalThis as { EventSource?: unknown }).EventSource = FakeEventSource
  // Record the URL of every request and leave it pending: this suite asserts the
  // request LINE, and the ids here are hostile to the URL grammar by design.
  globalThis.fetch = ((input: unknown) =>
    new Promise(() => {
      requests.push(String(input))
    })) as typeof globalThis.fetch
  // jsdom has no Element.scrollTo — the page's auto-scroll effect would throw.
  Element.prototype.scrollTo = (() => {}) as typeof Element.prototype.scrollTo
})

afterEach(async () => {
  globalThis.fetch = originalFetch
  ;(globalThis as { EventSource?: unknown }).EventSource = originalEventSource
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('ChatPage encodes the channel id it interpolates into a query string', () => {
  it('history: a channel id with #, &, + and spaces rides the wire as ONE encoded value', async () => {
    const channelId = 'c#1 & c++?'
    await mountChat(channelId)

    expect(
      historyUrl(),
      'the raw id would be parsed as URL syntax: # starts a fragment, & a new param, + a space',
    ).toBe(`/api/messages?channel_id=${encodeURIComponent(channelId)}`)
    // Decoding the query back must yield EXACTLY the channel the reader opened —
    // the property the raw form broke (it decoded to `c` + a stray `limit`), and
    // the one an over-eager encoding would also break.
    const parsed = new URL(historyUrl(), 'http://localhost')
    expect(parsed.searchParams.get('channel_id')).toBe(channelId)
    expect(parsed.search).toBe(`?channel_id=${encodeURIComponent(channelId)}`)
  })

  it('realtime: the room join carries the encoded room name the provider decodes', async () => {
    const channelId = 'C# & c++'
    await mountChat(channelId)

    const source = sources[0]
    if (!source) throw new Error('the page opened no EventSource')
    expect(
      source.url,
      'the raw room name truncated at # (and decoded + as a space) — another room entirely',
    ).toBe(`/api/realtime?room=${encodeURIComponent(`channel:${channelId}`)}`)
    // The provider reads this with `url.searchParams`, so decode it the same way.
    const room = new URL(source.url, 'http://localhost').searchParams.get('room')
    expect(room, 'the decoded room must be this channel, not a truncated neighbour').toBe(
      `channel:${channelId}`,
    )
  })

  it('an ordinary channel id is unchanged — the encoding adds nothing to the wire', async () => {
    await mountChat('general')
    expect(historyUrl()).toBe('/api/messages?channel_id=general')
    expect(sources[0]?.url).toBe('/api/realtime?room=channel%3Ageneral')
    expect(new URL(sources[0]?.url ?? '', 'http://localhost').searchParams.get('room')).toBe(
      'channel:general',
    )
  })
})
