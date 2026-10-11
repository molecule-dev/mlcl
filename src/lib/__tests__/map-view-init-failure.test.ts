// @vitest-environment jsdom
/**
 * `maps-location`'s `MapView` — a `createMap()` that fails must be LOGGED, not
 * thrown out of the effect.
 *
 * The effect normalizes the provider's return with `Promise.resolve()` because
 * `createMap()` may return the instance or a promise. Evaluated as
 * `Promise.resolve(createMap(…))` the call is made BEFORE the promise wrapper
 * exists, so a provider that throws SYNCHRONOUSLY (an element already bound to a
 * map, an invalid container, a bad style) escaped the effect entirely — React
 * surfaced the exception out of a passive effect (an error boundary, or a blank
 * panel with nothing logged) while the rejection handler written for exactly
 * that failure never ran. Deferring the call into the chain puts both failure
 * modes on the same path.
 *
 * @module
 */

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const maps = vi.hoisted(() => ({ createMap: vi.fn() }))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => undefined }),
}))

vi.mock('@molecule/app-maps', () => ({ createMap: maps.createMap }))

const { MapView } =
  (await import('../../../templates/.agents/skills/examples/integrations/maps-location/app/components/MapView.js')) as {
    MapView: (props: { pins: Array<{ lat: number; lng: number }> }) => unknown
  }

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLElement
let root: Root
let errors: ReturnType<typeof vi.spyOn>

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve))
  })
}

async function mount(pins: Array<{ lat: number; lng: number }>): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(createElement(MapView, { pins }))
  })
  await flush()
}

beforeEach(() => {
  vi.clearAllMocks()
  errors = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(async () => {
  errors.mockRestore()
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('maps-location MapView — a failing createMap is reported, never thrown', () => {
  it('logs a createMap that THROWS synchronously instead of letting it escape the effect', async () => {
    const boom = new Error('container already has a map')
    maps.createMap.mockImplementation(() => {
      throw boom
    })

    // Without the deferred call this render's act() rejects with `boom`: the
    // exception left the effect body before any rejection handler existed.
    await mount([{ lat: 1, lng: 2 }])

    expect(errors).toHaveBeenCalledWith('map failed to initialize', boom)
    // The panel is still on screen — a failed map is a blank panel plus a log,
    // not a crashed subtree.
    expect(container.querySelector('[data-mol-id="map-view"]')).not.toBeNull()
  })

  it('the positive twin: a synchronous instance still gets its markers', async () => {
    const addMarker = vi.fn()
    maps.createMap.mockReturnValue({ destroy: vi.fn(), addMarker })

    await mount([{ lat: 1, lng: 2 }])

    expect(addMarker).toHaveBeenCalledTimes(1)
    expect(errors).not.toHaveBeenCalled()
  })
})
