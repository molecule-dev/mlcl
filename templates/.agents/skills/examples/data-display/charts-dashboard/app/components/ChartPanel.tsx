import { type ReactNode, useEffect, useRef } from 'react'

import { ChartCard } from '@molecule/app-chart-wrapper-react'
import { type ChartConfig, type ChartInstance, createChart } from '@molecule/app-charts'

/**
 * Renders a chart from a `@molecule/app-charts` `ChartConfig`, wrapped in the
 * shared `ChartCard` chrome (title / description / footer).
 *
 * `createChart()` is imperative — it draws onto a `<canvas>` and returns a
 * `ChartInstance` — so this component wraps it in a ref + effect: create on
 * mount, destroy on unmount, re-create when `config` changes. NEVER skip
 * `destroy()`: re-rendering onto a canvas that still holds a live chart throws
 * "Canvas is already in use by another Chart instance". `ChartCard`'s
 * `minChartHeight` (default 240) stops the responsive chart collapsing to zero
 * height in a flex/grid parent.
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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const chart: ChartInstance = createChart(canvas, config)
    return () => {
      chart.destroy()
    }
  }, [config])

  return (
    <ChartCard title={title} description={description} footer={footer}>
      <canvas ref={canvasRef} data-mol-id="chart-panel-canvas" />
    </ChartCard>
  )
}

export default ChartPanel
