/**
 * Inline SVG area sparkline — used on RepositoryRow + Insights to chart
 * recent build durations / success rate. Last value gets a tinted dot and
 * the area fill is a soft 15%-opacity wash of the same stroke colour.
 *
 * Translated from personal-finance's NetWorthCard sparkline shape
 * (white stroke + 30% fill) and recoloured to brand-emerald for CI
 * dev-tools aesthetic.
 */

interface BuildSparklineProps {
  values: number[]
  width?: number
  height?: number
  stroke?: string
  fill?: string
  strokeWidth?: number
  /** Show a tinted dot on the most recent point. */
  showLastDot?: boolean
  className?: string
  ariaLabel?: string
}

export function BuildSparkline({
  values,
  width = 120,
  height = 32,
  stroke = 'var(--color-status-success)',
  fill,
  strokeWidth = 1.5,
  showLastDot = true,
  className,
  ariaLabel,
}: BuildSparklineProps) {
  if (values.length === 0) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className={className}
        aria-label={ariaLabel ?? 'No data'}
        role="img"
      />
    )
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = values.length > 1 ? width / (values.length - 1) : width
  const padY = 2

  const points = values.map((v, i) => {
    const x = i * stepX
    const norm = (v - min) / range
    const y = height - padY - norm * (height - padY * 2)
    return [x, y] as const
  })

  const path = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' ')
  const areaPath = `${path} L${width.toFixed(2)} ${height} L0 ${height} Z`
  const last = points[points.length - 1]
  const computedFill = fill ?? stroke

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label={ariaLabel ?? 'Trend sparkline'}
    >
      <path d={areaPath} fill={computedFill} fillOpacity={0.15} />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {showLastDot && last ? <circle cx={last[0]} cy={last[1]} r={2.5} fill={stroke} /> : null}
    </svg>
  )
}
