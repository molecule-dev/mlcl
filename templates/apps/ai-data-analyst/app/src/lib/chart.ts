/**
 * SVG polyline `points` for a line/scatter chart over a 200×80 viewBox, matching the report chart
 * rendering: values are normalized so the series minimum sits at the bottom and the maximum near
 * the top. Pure, so the geometry is unit-testable without rendering. Returns '' for no values.
 */
export function chartLinePoints(values: number[]): string {
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = Math.max(1, max - min)
  return values
    .map((v, i, arr) => {
      const x = (i / Math.max(1, arr.length - 1)) * 200
      const y = 80 - ((v - min) / range) * 72
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
