/**
 * Inline SVG bar-style sparkline — used on issue rows, alert cards, and the
 * dashboard frequency widget. Bars render at 3px wide / 1px gap per
 * DESIGN.md "Sparkline Chart (Frequency)". Spike bars (top 20%) draw in
 * the spike color so a regression jumps off the row.
 *
 * Translated from ci-cd-dashboard's BuildSparkline (white-stroke area
 * shape) but switched to vertical bars to match the error-tracker
 * "frequency density" affordance specified in DESIGN.md. Bar mode is the
 * default; pass `mode="line"` to fall back to a stroked area for
 * sparser data.
 */

interface FrequencySparklineProps {
  values: number[]
  width?: number
  height?: number
  color?: string
  spikeColor?: string
  mode?: 'bar' | 'line'
  className?: string
  ariaLabel?: string
}

export function FrequencySparkline({
  values,
  width = 120,
  height = 32,
  color = 'var(--color-severity-resolved)',
  spikeColor = 'var(--color-severity-critical)',
  mode = 'bar',
  className,
  ariaLabel,
}: FrequencySparklineProps) {
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

  const max = Math.max(...values, 1)
  const spikeThreshold = max * 0.85

  if (mode === 'bar') {
    const barWidth = 3
    const gap = 1
    const slot = barWidth + gap
    const visible = Math.min(values.length, Math.floor(width / slot))
    const tail = values.slice(values.length - visible)

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className={className}
        role="img"
        aria-label={ariaLabel ?? 'Frequency sparkline'}
      >
        {tail.map((v, i) => {
          const h = Math.max(1, Math.round((v / max) * (height - 2)))
          const x = width - (visible - i) * slot
          const y = height - h
          const isSpike = v >= spikeThreshold
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={h}
              rx={1}
              fill={isSpike ? spikeColor : color}
              opacity={isSpike ? 1 : 0.85}
            />
          )
        })}
      </svg>
    )
  }

  const min = Math.min(...values)
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

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label={ariaLabel ?? 'Frequency sparkline'}
    >
      <path d={areaPath} fill={color} fillOpacity={0.18} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {last ? <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} /> : null}
    </svg>
  )
}
