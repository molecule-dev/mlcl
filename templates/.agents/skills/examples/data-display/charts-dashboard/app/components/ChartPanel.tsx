import { type ReactNode, useEffect, useRef } from 'react'

import { ChartCard } from '@molecule/app-chart-wrapper-react'
import { type ChartConfig, type ChartInstance, createChart } from '@molecule/app-charts'

/**
 * Ids handed to the FUNCTION values a chart config can carry, so the content
 * signature below can include them.
 *
 * A config's callbacks are not serializable — `onClick`/`onHover`,
 * `tooltip.callbacks.*`, an axis tick formatter, `legend.labels.onClick` — and
 * `JSON.stringify` DROPS every one of them. A signature built from the JSON
 * alone therefore would not change when a caller swaps a handler for one that
 * closes over new state, and the chart (rebuilt only on a signature change)
 * would keep the handler it was created with. A WeakMap, not a Map: a handler's
 * id goes away with the handler itself, so nothing accumulates.
 */
let fnIdSeq = 0
const fnIds = new WeakMap<object, number>()

/**
 * The CONTENT of a chart config, as a string that can be compared.
 *
 * This is what decides whether a rendered chart must be rebuilt (see
 * {@link ChartPanel}) — not the config object's identity, which a parent that
 * builds the config inline (or on data, as `RevenueChart` does) changes on
 * every render.
 *
 * @param config - The chart config.
 * @returns A string that changes when the config's content changes, and stays
 *   the same for a fresh object carrying equal content and the same callbacks.
 */
function configContent(config: ChartConfig): string {
  return JSON.stringify(config, (_key: string, value: unknown): unknown => {
    if (typeof value !== 'function') return value
    const fn = value as object
    let id = fnIds.get(fn)
    if (id === undefined) {
      id = ++fnIdSeq
      fnIds.set(fn, id)
    }
    return `fn:${id}`
  })
}

/**
 * Renders a chart from a `@molecule/app-charts` `ChartConfig`, wrapped in the
 * shared `ChartCard` chrome (title / description / footer).
 *
 * `createChart()` is imperative — it draws onto a `<canvas>` and returns a
 * `ChartInstance` — so this component wraps it in a ref + effect: create on
 * mount, destroy on unmount, re-create when the config's CONTENT changes (see
 * `configKey`). NEVER skip `destroy()`: re-rendering onto a canvas that still
 * holds a live chart throws "Canvas is already in use by another Chart
 * instance". `ChartCard`'s `minChartHeight` (default 240) stops the responsive
 * chart collapsing to zero height in a flex/grid parent.
 */
export function ChartPanel({
  title,
  description,
  footer,
  config,
}: {
  title: ReactNode
  description?: ReactNode
  footer?: ReactNode
  config: ChartConfig
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // The latest config for the effect body below: the effect is keyed on the
  // config's CONTENT (see `configKey`), so the body reads the current object
  // through a ref instead of re-running when only its IDENTITY changed.
  const configRef = useRef(config)
  configRef.current = config
  /**
   * The config's content, as the effect's dependency.
   *
   * Keyed on `config` itself, the effect re-ran on every parent render that
   * passed a fresh object — which is what a caller handing over the config the
   * slice documents (a `ChartConfig` built from state, or one memoized on data)
   * does on any unrelated parent state change: a poll, a toast, a keystroke in
   * a sibling field. The cleanup called `destroy()` and the body built a new
   * chart, so the canvas was cleared, every dataset was drawn again, Chart.js
   * replayed its intro animation and any hover/tooltip state was lost — work
   * that scales with how often the parent renders, for a chart that did not
   * change. The CONTENT is what invalidates a chart; `MapView` and
   * `VideoPlayerView` key their own embedded instances the same way.
   */
  const configKey = configContent(config)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const chart: ChartInstance = createChart(canvas, configRef.current)
    return () => {
      chart.destroy()
    }
  }, [configKey])

  return (
    <ChartCard title={title} description={description} footer={footer}>
      <canvas ref={canvasRef} data-mol-id="chart-panel-canvas" />
    </ChartCard>
  )
}

export default ChartPanel
