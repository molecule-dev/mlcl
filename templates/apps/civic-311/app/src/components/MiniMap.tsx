import { useCallback, useRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { GRID_SIZE } from '../lib/geo.js'

export interface MapPin {
  id: string
  x: number
  y: number
  color?: string
  label?: string
}

export interface MapCircle {
  x: number
  y: number
  radius: number
  color?: string
  label?: string
}

interface MiniMapProps {
  /** Issue pins to render (color defaults to the category token). */
  pins?: MapPin[]
  /** Watch-area circles (centers/radii in grid blocks). */
  circles?: MapCircle[]
  /** The pin being placed right now (picker mode), rendered highlighted. */
  activePin?: { x: number; y: number } | null
  /** When set, the map is a picker: click/arrow-keys move the active pin. */
  onPick?: (x: number, y: number) => void
  /** Clicking a rendered pin (Explore selection). */
  onPinClick?: (id: string) => void
  /** Selected pin id (rendered on top with a ring). */
  selectedPinId?: string | null
  'data-mol-id'?: string
}

// Riverton is FICTIONAL: this is an SVG street-grid "map", not real tiles.
// The geometry matches api/src/lib/geo.ts exactly — avenues every 10 blocks
// (the stronger vertical lines), streets every 5 blocks (the lighter
// horizontal lines; the address derivation uses the real 2.5-block spacing,
// this render coarsens it for legibility). The river + parks are static
// decoration that make pins readable against the grid.
function GridDecor() {
  const avenues = []
  for (let x = 10; x < GRID_SIZE; x += 10) {
    avenues.push(<line key={`av-${x}`} x1={x} y1={0} x2={x} y2={GRID_SIZE} />)
  }
  const streets = []
  for (let y = 5; y < GRID_SIZE; y += 5) {
    if (y % 10 === 0) continue
    streets.push(<line key={`st-${y}`} x1={0} y1={y} x2={GRID_SIZE} y2={y} />)
  }
  return (
    <g>
      {/* Riverton River — diagonal water band across the NW quadrant */}
      <path
        d="M 0 14 C 18 8, 30 26, 46 30 C 62 34, 70 24, 84 18 L 100 12 L 100 0 L 0 0 Z"
        fill="var(--color-map-water)"
        stroke="none"
      />
      {/* Greenbelt Park + Foundry Commons */}
      <rect x="6" y="52" width="20" height="14" rx="2" fill="var(--color-map-park)" stroke="none" />
      <rect
        x="58"
        y="60"
        width="26"
        height="18"
        rx="2"
        fill="var(--color-map-park)"
        stroke="none"
      />
      <g stroke="var(--color-map-grid)" strokeWidth={0.7} opacity={0.9}>
        {streets}
      </g>
      <g stroke="var(--color-map-grid)" strokeWidth={1.3}>
        {avenues}
      </g>
    </g>
  )
}

function Pin({ pin, selected }: { pin: MapPin; selected: boolean }) {
  return (
    <g
      transform={`translate(${pin.x} ${pin.y})`}
      role="presentation"
      data-pin-id={pin.id}
      data-pin-color={pin.color}
    >
      {selected && <circle r={2.6} fill="none" stroke="currentColor" strokeWidth={0.5} />}
      <path
        d="M0 0 C -1.8 -2.4, -2.6 -3.8, -2.6 -5 A 2.6 2.6 0 1 1 2.6 -5 C 2.6 -3.8, 1.8 -2.4, 0 0 Z"
        fill={pin.color ?? 'var(--color-cat-other)'}
        stroke="#ffffff"
        strokeWidth={0.45}
      />
      <circle cy={-5} r={0.95} fill="#ffffff" />
    </g>
  )
}

/**
 * The fictional-city street map. Pure SVG on the 100x100 block grid —
 * coordinates ARE grid units, so a pin at (34, 27) renders at 34%,27%.
 * In picker mode (`onPick`) the map is focusable and supports click,
 * arrow-key nudge (1 block, shift = 5), Home/center reset.
 */
export function MiniMap({
  pins = [],
  circles = [],
  activePin = null,
  onPick,
  onPinClick,
  selectedPinId = null,
  'data-mol-id': molId = 'mini-map',
}: MiniMapProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const svgRef = useRef<SVGSVGElement>(null)

  const pick = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current
      if (!svg || !onPick) return
      const rect = svg.getBoundingClientRect()
      const x = Math.min(99.99, Math.max(0, ((clientX - rect.left) / rect.width) * GRID_SIZE))
      const y = Math.min(99.99, Math.max(0, ((clientY - rect.top) / rect.height) * GRID_SIZE))
      // Snap-ish to 0.1 blocks so the derived address preview is stable.
      onPick(Math.round(x * 10) / 10, Math.round(y * 10) / 10)
    },
    [onPick],
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGSVGElement>) => {
      if (!onPick || !activePin) return
      const step = e.shiftKey ? 5 : 1
      let { x, y } = activePin
      switch (e.key) {
        case 'ArrowLeft':
          x -= step
          break
        case 'ArrowRight':
          x += step
          break
        case 'ArrowUp':
          y -= step
          break
        case 'ArrowDown':
          y += step
          break
        default:
          return
      }
      e.preventDefault()
      onPick(
        Math.round(Math.min(99.99, Math.max(0, x)) * 10) / 10,
        Math.round(Math.min(99.99, Math.max(0, y)) * 10) / 10,
      )
    },
    [onPick, activePin],
  )

  return (
    <svg
      ref={svgRef}
      data-mol-id={molId}
      viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
      preserveAspectRatio="none"
      role={onPick ? 'application' : 'img'}
      aria-label={t(
        'miniMap.ariaLabel',
        {},
        { defaultValue: 'Map of the city street grid — click to place a pin' },
      )}
      tabIndex={onPick ? 0 : undefined}
      className={cm.cn(
        cm.w('full'),
        'rounded-lg border border-outline-variant bg-[var(--color-map-road)] touch-none select-none',
        onPick ? 'cursor-crosshair focus:outline-none focus:ring-2 focus:ring-primary' : '',
      )}
      style={{ aspectRatio: '1 / 1' }}
      onClick={(e) => {
        if (onPick) pick(e.clientX, e.clientY)
      }}
      onKeyDown={onKeyDown}
    >
      <GridDecor />
      {circles.map((c, i) => (
        <g key={`circle-${i}`} data-area-label={c.label}>
          <circle
            cx={c.x}
            cy={c.y}
            r={c.radius}
            fill="var(--mol-color-primary)"
            fillOpacity={0.12}
            stroke={c.color ?? 'var(--mol-color-primary)'}
            strokeWidth={0.6}
            strokeDasharray="2 1.5"
          />
        </g>
      ))}
      {pins.map((p) => (
        <g
          key={p.id}
          onClick={
            onPinClick
              ? (e) => {
                  e.stopPropagation()
                  onPinClick(p.id)
                }
              : undefined
          }
          className={onPinClick ? 'cursor-pointer' : undefined}
          style={{ color: p.color ?? 'var(--color-cat-other)' }}
        >
          <Pin pin={p} selected={p.id === selectedPinId} />
        </g>
      ))}
      {activePin && (
        <g data-mol-id="mini-map-active-pin">
          <circle cx={activePin.x} cy={activePin.y} r={1.1} fill="var(--mol-color-primary)" />
          <circle
            cx={activePin.x}
            cy={activePin.y}
            r={2.2}
            fill="none"
            stroke="var(--mol-color-primary)"
            strokeWidth={0.5}
          />
        </g>
      )}
    </svg>
  )
}

export default MiniMap
