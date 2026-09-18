/**
 * Inline SVG area sparkline for log volume / latency / event-rate trends.
 * Renders a 15%-opacity wash under a bright stroke and a tinted dot on the
 * most recent point.
 *
 * Translated from ci-cd-dashboard's BuildSparkline (white-stroke + 30% fill
 * shape borrowed in turn from personal-finance's NetWorthCard sparkline),
 * recoloured to the Signalink cyan/violet/severity palette.
 */

interface LogVolumeSparklineProps {
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

export function LogVolumeSparkline({
  values,
  width = 120,
  height = 32,
  stroke = 'var(--color-primary)',
  fill,
  strokeWidth = 1.5,
  showLastDot = true,
  className,
  ariaLabel,
}: LogVolumeSparklineProps) {
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
      aria-label={ariaLabel ?? 'Log volume sparkline'}
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
