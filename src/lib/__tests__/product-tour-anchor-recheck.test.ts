// @vitest-environment jsdom
/**
 * A pending tour must notice the anchors a LATER page brings.
 *
 * The tour is mounted in a layout, so a route change re-renders it but changes
 * none of its own state. The walk's inputs are the DOM's anchors, and neither
 * `active` nor `stepIdx` moves when the reader lands on a page without them —
 * so a walk keyed on those deps never re-ran and the tour stayed invisible for
 * the rest of the session (the comment on the effect claimed the opposite: "the
 * route change re-renders it and this check runs again with the new page's
 * anchors").
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => 'stub' }),
}))
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? _key,
  }),
}))

const { ProductTour } =
  (await import('../../../templates/.agents/skills/examples/forms/onboarding-tour/app/components/ProductTour.js')) as {
    ProductTour: () => ReactNode
  }

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const originalFetch = globalThis.fetch

let container: HTMLElement
let root: Root
const addedAnchors: HTMLElement[] = []

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve))
  })
}

afterEach(async () => {
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
  for (const anchor of addedAnchors.splice(0)) anchor.remove()
  globalThis.fetch = originalFetch
})

beforeEach(() => {
  // The reader has never completed the tour, so it becomes active.
  globalThis.fetch = (() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ tour_completed_at: null }),
    })) as unknown as typeof globalThis.fetch
})

/** Add a page anchor the tour points at — what a route's element renders. */
function addAnchor(name: string): void {
  const el = document.createElement('div')
  el.setAttribute('data-tour', name)
  document.body.appendChild(el)
  addedAnchors.push(el)
}

const tourVisible = (): boolean => container.querySelector('[role="dialog"]') !== null

describe('the onboarding tour', () => {
  it('renders a later page’s anchor after landing on a page with none', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(createElement(ProductTour))
    })
    await flush()

    // Landed on a page carrying NONE of the three anchors: the tour stays
    // pending and renders nothing.
    expect(tourVisible()).toBe(false)

    // The reader navigates (the layout re-renders) to a page that carries the
    // LAST step's anchor and neither of the earlier ones.
    addAnchor('settings')
    await act(async () => {
      root.render(createElement(ProductTour))
    })
    await flush()

    expect(
      tourVisible(),
      'a page that carries an anchor the tour points at must run the tour',
    ).toBe(true)
  })

  it('stays hidden while no page carries an anchor', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(createElement(ProductTour))
    })
    await flush()
    expect(tourVisible()).toBe(false)
  })
})
