// @vitest-environment jsdom
/**
 * `onboarding-tour`'s `ProductTour` walks past a step whose `data-tour` anchor
 * is not on the page, and treats the LAST step's missing anchor as "the tour is
 * over" — persisting `tour_completed_at` with a `PATCH /api/me`. On a page that
 * carries NONE of the anchors (the tour is mounted in a layout, and the user
 * lands on a route without the navigation/CTA the steps point at) that walk
 * finished INSTANTLY and wrote the flag: the dashboard that does have the
 * anchors never offered the tour again, so it was consumed without ever being
 * seen. "A tour that never appeared is not a tour that finished" — the
 * completion now requires that a step actually rendered, while the documented
 * walk-and-finish behaviour stays (a tour the reader DID see still ends when the
 * remaining targets are absent).
 *
 * The component is the shipped one; only the ClassMap + i18n hook are stubbed.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface FetchCall {
  url: string
  method: string
  answered: boolean
  respond: (status: number, body: unknown) => void
}

const fetches = vi.hoisted(() => ({ calls: [] as FetchCall[] }))

const translate = (
  key: string,
  _values?: Record<string, unknown>,
  options?: { defaultValue?: string },
): string => options?.defaultValue ?? key

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => undefined }),
}))

vi.mock('@molecule/app-react', () => ({ useTranslation: () => ({ t: translate }) }))

const { ProductTour } =
  (await import('../../../templates/.agents/skills/examples/forms/onboarding-tour/app/components/ProductTour.js')) as {
    ProductTour: () => ReactNode
  }

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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

/** Add (or remove) a `data-tour` anchor the steps look for. */
function anchor(name: string, present: boolean): () => void {
  if (!present) return () => undefined
  const el = document.createElement('div')
  el.setAttribute('data-tour', name)
  document.body.appendChild(el)
  return () => el.remove()
}

const patchCount = (): number =>
  fetches.calls.filter((c) => c.url === '/api/me' && c.method === 'PATCH').length

/** Answer the oldest unanswered fetch whose URL contains `fragment`. */
async function respond(fragment: string, status: number, body: unknown): Promise<void> {
  const call = fetches.calls.find((c) => !c.answered && c.url.includes(fragment))
  if (!call) throw new Error(`no pending fetch for ${fragment}`)
  call.answered = true
  await act(async () => {
    call.respond(status, body)
  })
  await flush()
}

const dialog = (): Element | null => container.querySelector('[role="dialog"]')

async function clickButtonWithText(label: string): Promise<void> {
  const button = Array.from(container.querySelectorAll('button')).find(
    (b) => (b.textContent ?? '').trim() === label,
  )
  if (!button) throw new Error(`no button labelled ${label}`)
  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
}

let cleanups: Array<() => void> = []

beforeEach(() => {
  fetches.calls.length = 0
  cleanups = []
  globalThis.fetch = ((input: unknown, init?: { method?: string }) =>
    new Promise((resolve) => {
      fetches.calls.push({
        url: String(input),
        method: init?.method ?? 'GET',
        answered: false,
        respond: (status, body) =>
          resolve({ ok: status >= 200 && status < 300, status, json: async () => body }),
      })
    })) as typeof globalThis.fetch
})

afterEach(async () => {
  for (const undo of cleanups) undo()
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('product tour — a tour nobody saw is not marked completed', () => {
  it('leaves the flag alone when the page carries none of the anchors', async () => {
    await mount(createElement(ProductTour, {}))

    // The eligibility read resolves: this is a signed-in first-time user.
    await respond('/api/me', 200, { id: 'u1', tour_completed_at: null })

    // The walk skipped every step — there was nothing to point at — and must
    // NOT persist completion for it.
    expect(dialog()).toBeNull()
    expect(patchCount()).toBe(0)
    expect(fetches.calls.filter((c) => c.url === '/api/me')).toHaveLength(1)
  })

  it('a page that carries none of the anchors leaves the tour pending — the next page still runs it', async () => {
    await mount(createElement(ProductTour, {}))
    await respond('/api/me', 200, { id: 'u1', tour_completed_at: null })
    expect(dialog()).toBeNull()

    // The reader navigates to a route that DOES carry the first anchor. The
    // tour is mounted in a layout, so that route change re-renders this
    // component — which is what the "leave it pending" branch promises. The
    // walk used to advance through the absent steps and pin itself on the LAST
    // step, so this re-render could only ever offer the settings step (absent
    // here) and the tour silently never appeared.
    cleanups.push(anchor('nav-search', true))
    await act(async () => {
      root.render(createElement(ProductTour, {}))
    })
    await flush()

    expect(dialog()).not.toBeNull()
    expect(patchCount()).toBe(0)
  })

  it('the positive twin: a page with the first anchor still shows the tour', async () => {
    cleanups.push(anchor('nav-search', true))
    await mount(createElement(ProductTour, {}))
    await respond('/api/me', 200, { id: 'u1', tour_completed_at: null })

    expect(dialog()).not.toBeNull()
    expect(patchCount()).toBe(0)
  })

  it('persists completion ONCE however many mutations find the last target missing', async () => {
    // The reader walks to the last step normally (every anchor is on the page),
    // then that step's target unmounts. The walk runs on EVERY DOM mutation —
    // that is what makes the tour follow a route change — and React commits the
    // completion it schedules in a LATER task, so every mutation batch that
    // arrives before that commit still finds the tour active and the target
    // gone. Each one used to issue its own `PATCH /api/me`.
    cleanups.push(anchor('nav-search', true))
    cleanups.push(anchor('primary-cta', true))
    const settings = anchor('settings', true)
    cleanups.push(settings)
    await mount(createElement(ProductTour, {}))
    await respond('/api/me', 200, { id: 'u1', tour_completed_at: null })
    await clickButtonWithText('Next')
    await clickButtonWithText('Next')
    expect(dialog(), 'on the last step with its target present').not.toBeNull()
    expect(patchCount()).toBe(0)

    // Drop the target, then keep mutating the page in the same task — two
    // separate MutationObserver callbacks, neither preceded by React's commit.
    settings()
    await Promise.resolve()
    document.body.appendChild(document.createElement('div'))
    await Promise.resolve()

    expect(patchCount(), 'the completion is written once').toBe(1)

    // …and the dismissal still lands once React commits the update.
    await flush()
    expect(dialog()).toBeNull()
  })

  it('still finishes a tour the reader SAW when the remaining targets are absent', async () => {
    // Steps 0 and 1 exist; the third's anchor does not (a short page). The
    // reader advances through the steps they can see, and reaching the end is
    // the documented "the tour is over".
    cleanups.push(anchor('nav-search', true))
    cleanups.push(anchor('primary-cta', true))
    await mount(createElement(ProductTour, {}))
    await respond('/api/me', 200, { id: 'u1', tour_completed_at: null })

    await clickButtonWithText('Next')
    expect(dialog()).not.toBeNull()
    await clickButtonWithText('Next')

    expect(patchCount()).toBe(1)
    expect(dialog()).toBeNull()
  })
})
