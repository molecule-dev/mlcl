// @vitest-environment jsdom
/**
 * `video-player`'s `VideoPlayerView` — a `createPlayer()` that fails must be
 * LOGGED, not thrown out of the effect.
 *
 * The effect normalizes the provider's return with `Promise.resolve()` because
 * `createPlayer()` may return the instance or a promise. Evaluated as
 * `Promise.resolve(createPlayer(…))` the call is made BEFORE the promise
 * wrapper exists, so a provider that throws SYNCHRONOUSLY (a container it
 * refuses, an element it cannot bind a player to) escaped the effect entirely —
 * React surfaced the exception out of a passive effect (an error boundary, or a
 * blank panel with nothing logged) while the rejection handler written for
 * exactly that failure never ran. Deferring the call into the chain puts both
 * failure modes on the same path — the same shape `MapView` documents and is
 * pinned by (see map-view-init-failure.test.ts).
 *
 * @module
 */

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const video = vi.hoisted(() => ({ createPlayer: vi.fn() }))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => undefined }),
}))

vi.mock('@molecule/app-video', () => ({ createPlayer: video.createPlayer }))

const { VideoPlayerView } =
  (await import('../../../templates/.agents/skills/examples/content/video-player/app/components/VideoPlayerView.js')) as {
    VideoPlayerView: (props: {
      sources: Array<{ src: string; type?: string }>
      poster?: string
    }) => unknown
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

async function mount(sources: Array<{ src: string; type?: string }>): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(createElement(VideoPlayerView, { sources }))
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

describe('video-player VideoPlayerView — a failing createPlayer is reported, never thrown', () => {
  it('logs a createPlayer that THROWS synchronously instead of letting it escape the effect', async () => {
    const boom = new Error('container already holds a player')
    video.createPlayer.mockImplementation(() => {
      throw boom
    })

    // Without the deferred call this render's act() rejects with `boom`: the
    // exception left the effect body before any rejection handler existed.
    await mount([{ src: '/media/a.mp4', type: 'video/mp4' }])

    expect(errors).toHaveBeenCalledWith('video player failed to initialize', boom)
    // The panel is still on screen — a failed player is a blank panel plus a
    // log, not a crashed subtree.
    expect(container.querySelector('[data-mol-id="video-player"]')).not.toBeNull()
  })

  it('the positive twin: a synchronous instance still mounts', async () => {
    const destroy = vi.fn()
    video.createPlayer.mockReturnValue({ destroy })

    await mount([{ src: '/media/a.mp4', type: 'video/mp4' }])

    expect(video.createPlayer).toHaveBeenCalledTimes(1)
    expect(errors).not.toHaveBeenCalled()
    expect(destroy).not.toHaveBeenCalled()
  })

  it('a REJECTED createPlayer is logged the same way', async () => {
    const boom = new Error('provider init failed')
    video.createPlayer.mockRejectedValue(boom)

    await mount([{ src: '/media/a.mp4' }])

    expect(errors).toHaveBeenCalledWith('video player failed to initialize', boom)
  })
})
