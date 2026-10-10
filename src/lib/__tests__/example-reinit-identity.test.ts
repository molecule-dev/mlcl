// @vitest-environment jsdom
/**
 * Three imperative-embedding components re-created their instance whenever the
 * parent re-rendered.
 *
 * `MapView` (`maps-location`) and `VideoPlayerView` (`video-player`) both wrap a
 * provider factory in `useEffect`, and both keyed that effect on the ARRAY prop
 * itself — `[pins]`, `[sources, poster]`. An array literal is a NEW array on
 * every render, and that inline literal is exactly the usage each slice's README
 * documents (`<VideoPlayerView sources={[{ src: …, type: 'video/mp4' }]} />`), so
 * any unrelated parent state change — a keystroke in a sibling field, a poll, a
 * toast — ran the cleanup (`destroy()`, tearing down the map or the media/hls
 * stream) and then rebuilt the instance: the reader's pan and zoom were thrown
 * away, the tiles were re-requested, and playback restarted. The effect is keyed
 * on the props' CONTENT now, so only a real change re-initializes.
 *
 * `ChartPanel` (`charts-dashboard`) is the third member of the class and keyed
 * its effect on the `config` OBJECT (`[config]`), which a caller handing over a
 * `ChartConfig` it built from state — or memoized on data, the way the slice's
 * own `RevenueChart` does — changes on every render that touches the parent. The
 * cleanup destroyed the chart and the body created a new one: the canvas was
 * cleared, every dataset was drawn again, Chart.js replayed its intro animation
 * and any hover/tooltip state was lost, for a chart whose content had not
 * changed. It is keyed on the config's content now too — and, because a config
 * can carry CALLBACKS (`onClick`/`onHover`, `tooltip.callbacks.*`, an axis tick
 * formatter), the signature includes them, so a swapped handler still rebuilds.
 *
 * All three providers are stubbed; the components are the shipped ones.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const maps = vi.hoisted(() => ({ createMap: vi.fn() }))
const video = vi.hoisted(() => ({ createPlayer: vi.fn() }))
const charts = vi.hoisted(() => ({ createChart: vi.fn() }))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => undefined }),
}))

vi.mock('@molecule/app-maps', () => ({
  createMap: maps.createMap,
}))

vi.mock('@molecule/app-video', () => ({
  createPlayer: video.createPlayer,
}))

vi.mock('@molecule/app-charts', () => ({
  createChart: charts.createChart,
}))

vi.mock('@molecule/app-chart-wrapper-react', () => ({
  ChartCard: (props: { title?: ReactNode; children?: ReactNode }) =>
    createElement('div', null, props.title ?? null, props.children),
}))

const { MapView } =
  (await import('../../../templates/.agents/skills/examples/integrations/maps-location/app/components/MapView.js')) as {
    MapView: (props: { pins: Array<{ lat: number; lng: number; label?: string }> }) => ReactNode
  }
const { VideoPlayerView } =
  (await import('../../../templates/.agents/skills/examples/content/video-player/app/components/VideoPlayerView.js')) as {
    VideoPlayerView: (props: {
      sources: Array<{ src: string; type?: string }>
      poster?: string
    }) => ReactNode
  }
const { ChartPanel } =
  (await import('../../../templates/.agents/skills/examples/data-display/charts-dashboard/app/components/ChartPanel.js')) as {
    ChartPanel: (props: {
      title?: ReactNode
      config: {
        type: 'line' | 'bar'
        labels?: Array<string | number>
        datasets: Array<{ label: string; data: number[] }>
        onClick?: () => void
      }
    }) => ReactNode
  }

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLElement
let root: Root

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve))
  })
}

async function render(element: ReactNode): Promise<void> {
  if (!root) {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  }
  await act(async () => {
    root.render(element)
  })
  await flush()
}

beforeEach(() => {
  vi.clearAllMocks()
  maps.createMap.mockImplementation(() => ({ addMarker: vi.fn(), destroy: vi.fn() }))
  video.createPlayer.mockImplementation(() => ({ destroy: vi.fn() }))
  charts.createChart.mockImplementation(() => ({ destroy: vi.fn() }))
})

afterEach(async () => {
  if (root) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
    root = undefined as unknown as Root
  }
})

describe('map view — a re-render with equal pins does not rebuild the map', () => {
  it('keeps one map instance across parent renders that pass a fresh array', async () => {
    await render(createElement(MapView, { pins: [{ lat: 1, lng: 2, label: 'A' }] }))
    expect(maps.createMap).toHaveBeenCalledTimes(1)
    const first = maps.createMap.mock.results[0]?.value as { destroy: () => void }

    // The parent re-renders (any state change at all) with an equal, freshly
    // built array — the usage the slice documents.
    await render(createElement(MapView, { pins: [{ lat: 1, lng: 2, label: 'A' }] }))

    expect(maps.createMap).toHaveBeenCalledTimes(1)
    expect(first.destroy).not.toHaveBeenCalled()
  })

  it('rebuilds when the pins really change', async () => {
    await render(createElement(MapView, { pins: [{ lat: 1, lng: 2 }] }))
    const first = maps.createMap.mock.results[0]?.value as { destroy: () => void }

    await render(createElement(MapView, { pins: [{ lat: 9, lng: 9 }] }))

    expect(maps.createMap).toHaveBeenCalledTimes(2)
    expect(first.destroy).toHaveBeenCalledTimes(1)
    // The new instance is centered on the new pin.
    const secondCall = maps.createMap.mock.calls[1][0] as { center: { lat: number } }
    expect(secondCall.center.lat).toBe(9)
  })
})

describe('video player view — a re-render with equal sources does not restart playback', () => {
  it('keeps one player across parent renders that pass a fresh array', async () => {
    await render(
      createElement(VideoPlayerView, { sources: [{ src: '/media/a.mp4', type: 'video/mp4' }] }),
    )
    expect(video.createPlayer).toHaveBeenCalledTimes(1)
    const first = video.createPlayer.mock.results[0]?.value as { destroy: () => void }

    await render(
      createElement(VideoPlayerView, { sources: [{ src: '/media/a.mp4', type: 'video/mp4' }] }),
    )

    expect(video.createPlayer).toHaveBeenCalledTimes(1)
    expect(first.destroy).not.toHaveBeenCalled()
  })

  it('rebuilds when a source really changes', async () => {
    await render(createElement(VideoPlayerView, { sources: [{ src: '/media/a.mp4' }] }))
    const first = video.createPlayer.mock.results[0]?.value as { destroy: () => void }

    await render(createElement(VideoPlayerView, { sources: [{ src: '/media/b.mp4' }] }))

    expect(video.createPlayer).toHaveBeenCalledTimes(2)
    expect(first.destroy).toHaveBeenCalledTimes(1)
  })
})

describe('chart panel — a re-render with an equal config does not rebuild the chart', () => {
  /** A config as a caller building one from state hands it over: a FRESH object per render. */
  const lineConfig = (
    data: number[],
    onClick?: () => void,
  ): {
    type: 'line'
    labels: string[]
    datasets: Array<{ label: string; data: number[] }>
    onClick?: () => void
  } => ({
    type: 'line' as const,
    labels: ['Jan', 'Feb'],
    datasets: [{ label: 'Revenue', data }],
    ...(onClick ? { onClick } : {}),
  })

  it('keeps one chart across parent renders that pass a fresh config object', async () => {
    await render(createElement(ChartPanel, { title: 'Revenue', config: lineConfig([1, 2]) }))
    expect(charts.createChart).toHaveBeenCalledTimes(1)
    const first = charts.createChart.mock.results[0]?.value as { destroy: () => void }

    // The parent re-renders (any state change at all) with an equal, freshly
    // built config object — the identity churn the `[config]` dependency turned
    // into a destroy + create of the whole chart.
    await render(createElement(ChartPanel, { title: 'Revenue', config: lineConfig([1, 2]) }))

    expect(charts.createChart).toHaveBeenCalledTimes(1)
    expect(first.destroy).not.toHaveBeenCalled()
  })

  it('rebuilds when the config content really changes', async () => {
    await render(createElement(ChartPanel, { title: 'Revenue', config: lineConfig([1, 2]) }))
    const first = charts.createChart.mock.results[0]?.value as { destroy: () => void }

    await render(createElement(ChartPanel, { title: 'Revenue', config: lineConfig([1, 9]) }))

    expect(charts.createChart).toHaveBeenCalledTimes(2)
    expect(first.destroy).toHaveBeenCalledTimes(1)
    // The rebuilt chart is handed the NEW config.
    const rebuilt = charts.createChart.mock.calls[1][1] as {
      datasets: Array<{ data: number[] }>
    }
    expect(rebuilt.datasets[0]?.data).toEqual([1, 9])
  })

  it('ignores the SAME callback passed again, and rebuilds when the callback is swapped', async () => {
    const handler = (): void => {}
    await render(
      createElement(ChartPanel, { title: 'Revenue', config: lineConfig([1, 2], handler) }),
    )
    expect(charts.createChart).toHaveBeenCalledTimes(1)

    // Equal content AND the same handler, in a fresh object: nothing changed.
    await render(
      createElement(ChartPanel, { title: 'Revenue', config: lineConfig([1, 2], handler) }),
    )
    expect(charts.createChart).toHaveBeenCalledTimes(1)

    // A swapped handler IS a change — `JSON.stringify` drops functions, so a
    // signature built from the JSON alone would keep the handler the chart was
    // created with and the new one would never fire.
    const swapped = (): void => {}
    await render(
      createElement(ChartPanel, { title: 'Revenue', config: lineConfig([1, 2], swapped) }),
    )
    expect(charts.createChart).toHaveBeenCalledTimes(2)
    const rebuilt = charts.createChart.mock.calls[1][1] as { onClick?: () => void }
    expect(rebuilt.onClick).toBe(swapped)
  })
})
