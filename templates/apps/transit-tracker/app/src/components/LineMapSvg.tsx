import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { projectToSvg } from '../lib/format.js'

export interface MapStop {
  code: string
  name: string
  lat: number
  lng: number
  hub?: boolean
}

/**
 * Static SVG line map — polyline + stop dots rendered from the line's own
 * geometry (transit_lines.polyline + stop lat/lng).
 *
 * WHY NOT @molecule/app-maps: the map bonds (leaflet/mapbox) render REAL
 * tile backdrops against real-world coordinates. This network is a FICTIONAL
 * city — there are no tiles for it, and pinning fake coordinates onto real
 * maps reads as a bug. A projected SVG keeps the route-diagram metaphor
 * (like the printed diagram in every metro car), weighs nothing, and adds
 * no dependency. Swap to the map bond when a real-city deployment lands.
 */
export function LineMapSvg({
  color,
  stops,
  width = 640,
  height = 360,
  activeStopCode,
}: {
  color: string
  stops: MapStop[]
  width?: number
  height?: number
  activeStopCode?: string
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const points = stops.map((s) => [s.lat, s.lng] as [number, number])
  const projected = projectToSvg(points, width, height)
  const path = projected.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <svg
      data-mol-id="line-map"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={t('lineMap.ariaLabel', {}, { defaultValue: 'Route map with stops' })}
      className={cm.cn(
        cm.w('full'),
        'rounded-2xl bg-surface-container-low ring-1 ring-outline-variant/40',
      )}
    >
      <polyline
        points={path}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.92}
      />
      {stops.map((stop, i) => {
        const p = projected[i]
        if (!p) return null
        const isActive = stop.code === activeStopCode
        return (
          <g key={stop.code}>
            <circle
              cx={p.x}
              cy={p.y}
              r={isActive ? 9 : stop.hub ? 7 : 5}
              fill="var(--color-surface)"
              stroke={isActive ? 'var(--color-primary)' : color}
              strokeWidth={isActive ? 4 : 3}
            />
            {isActive ? <circle cx={p.x} cy={p.y} r={3} fill="var(--color-primary)" /> : null}
            <text
              x={p.x}
              y={p.y - 12}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="var(--color-on-surface-variant)"
            >
              {stop.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
