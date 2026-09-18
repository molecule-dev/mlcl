/**
 * Mini keyframe timeline — a compact static SVG widget that renders three
 * tracks of diamond keyframes connected by tween lines, with a red playhead.
 * Used as the signature decorative element on landing/dashboard.
 *
 * Bespoke per Vivace DESIGN.md (Timeline Track + Keyframe Diamond specs).
 * Pure SVG so it stays inline and decorative; no Tailwind utility coupling.
 */
import { getClassMap } from '@molecule/app-ui'

interface Track {
  label: string
  keyframes: number[]
  selected?: number
}

interface KeyframeTimelineMiniProps {
  tracks?: Track[]
  playheadPercent?: number
  caption?: string
}

const DEFAULT_TRACKS: Track[] = [
  { label: 'Button › Y', keyframes: [10, 30, 60, 88], selected: 30 },
  { label: 'Button › Scale', keyframes: [10, 40, 75], selected: 40 },
  { label: 'Background › Opacity', keyframes: [5, 20, 50, 90] },
]

export function KeyframeTimelineMini({
  tracks = DEFAULT_TRACKS,
  playheadPercent = 30,
  caption,
}: KeyframeTimelineMiniProps) {
  const cm = getClassMap()
  const trackHeight = 36
  const labelWidth = 140
  const totalWidth = 520
  const trackAreaWidth = totalWidth - labelWidth
  const trackY = (i: number) => 24 + i * trackHeight + trackHeight / 2

  return (
    <figure
      data-mol-id="keyframe-timeline-mini"
      className={cm.cn(cm.sp('p', 4), 'rounded-xl overflow-hidden')}
      style={{
        backgroundColor: 'var(--anim-timeline-bg)',
        border: '1px solid var(--anim-border)',
      }}
    >
      <svg
        viewBox={`0 0 ${totalWidth} ${24 + tracks.length * trackHeight + 16}`}
        className={cm.cn('w-full h-auto block')}
        role="img"
        aria-label={caption ?? 'Keyframe timeline preview'}
      >
        <line
          x1={labelWidth}
          y1={20}
          x2={totalWidth}
          y2={20}
          stroke="var(--anim-border)"
          strokeWidth="1"
        />
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={labelWidth + trackAreaWidth * t}
            y1={16}
            x2={labelWidth + trackAreaWidth * t}
            y2={20}
            stroke="var(--anim-text-muted)"
            strokeWidth="1"
          />
        ))}
        {tracks.map((track, i) => {
          const y = trackY(i)
          return (
            <g key={track.label}>
              <text
                x={12}
                y={y + 4}
                fill="var(--anim-text-secondary)"
                fontFamily="JetBrains Mono, monospace"
                fontSize="11"
              >
                {track.label}
              </text>
              <line
                x1={labelWidth}
                y1={y}
                x2={totalWidth - 8}
                y2={y}
                stroke="var(--anim-surface-elevated)"
                strokeWidth="1"
              />
              {track.keyframes.length > 1 && (
                <line
                  x1={labelWidth + (trackAreaWidth * track.keyframes[0]!) / 100}
                  y1={y}
                  x2={
                    labelWidth +
                    (trackAreaWidth * track.keyframes[track.keyframes.length - 1]!) / 100
                  }
                  y2={y}
                  stroke="var(--anim-primary)"
                  strokeOpacity="0.4"
                  strokeWidth="1"
                />
              )}
              {track.keyframes.map((kf) => {
                const x = labelWidth + (trackAreaWidth * kf) / 100
                const selected = track.selected === kf
                return (
                  <rect
                    key={kf}
                    x={x - 5}
                    y={y - 5}
                    width={10}
                    height={10}
                    transform={`rotate(45 ${x} ${y})`}
                    fill={selected ? 'var(--anim-selection)' : 'var(--anim-keyframe)'}
                  />
                )
              })}
            </g>
          )
        })}
        <line
          x1={labelWidth + (trackAreaWidth * playheadPercent) / 100}
          y1={12}
          x2={labelWidth + (trackAreaWidth * playheadPercent) / 100}
          y2={24 + tracks.length * trackHeight}
          stroke="var(--anim-playhead)"
          strokeWidth="1.5"
        />
        <polygon
          points={`${labelWidth + (trackAreaWidth * playheadPercent) / 100 - 5},10 ${labelWidth + (trackAreaWidth * playheadPercent) / 100 + 5},10 ${labelWidth + (trackAreaWidth * playheadPercent) / 100},18`}
          fill="var(--anim-playhead)"
        />
      </svg>
      {caption && (
        <figcaption
          className={cm.cn('mt-2 font-mono text-[10px] uppercase tracking-widest text-center')}
          style={{ color: 'var(--anim-text-muted)' }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

export default KeyframeTimelineMini
