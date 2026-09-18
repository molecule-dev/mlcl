/**
 * Timeline preview — signature SVG widget that renders four color-coded
 * tracks (video / audio / image / text) with clip blocks, a ruler, and a
 * red playhead. Used as the hero decorative element on Landing/Dashboard
 * and as the empty-state illustration inside the Editor.
 *
 * Bespoke per Rushes DESIGN.md (Timeline Track / Clip / Ruler / Playhead
 * specs). Pure SVG so it stays inline and decorative; no Tailwind utility
 * coupling beyond the surrounding card.
 */
import { getClassMap } from '@molecule/app-ui'

interface TimelineClip {
  /** Start time as a percentage of timeline width (0–100). */
  start: number
  /** Duration as a percentage (0–100). */
  duration: number
  label?: string
}

interface TimelineTrack {
  label: string
  type: 'video' | 'audio' | 'image' | 'text'
  clips: TimelineClip[]
}

interface TimelinePreviewProps {
  tracks?: TimelineTrack[]
  playheadPercent?: number
  caption?: string
}

const TRACK_COLOR: Record<TimelineTrack['type'], { fill: string; border: string; label: string }> =
  {
    video: {
      fill: 'color-mix(in srgb, var(--video-cta-from) 35%, transparent)',
      border: 'var(--video-cta-from)',
      label: 'var(--video-link)',
    },
    audio: {
      fill: 'color-mix(in srgb, var(--mol-color-info) 35%, transparent)',
      border: 'var(--mol-color-info)',
      label: 'var(--mol-color-info)',
    },
    image: {
      fill: 'color-mix(in srgb, var(--mol-color-warning) 35%, transparent)',
      border: 'var(--mol-color-warning)',
      label: 'var(--mol-color-warning)',
    },
    text: {
      fill: 'color-mix(in srgb, var(--video-cta-to) 35%, transparent)',
      border: 'var(--video-cta-to)',
      label: 'var(--video-link-hover)',
    },
  }

const DEFAULT_TRACKS: TimelineTrack[] = [
  {
    label: 'V1 · Main Cut',
    type: 'video',
    clips: [
      { start: 0, duration: 28, label: 'Establishing' },
      { start: 30, duration: 25, label: 'B-roll' },
      { start: 58, duration: 20, label: 'Closing' },
    ],
  },
  {
    label: 'V2 · Overlay',
    type: 'image',
    clips: [
      { start: 8, duration: 12, label: 'Title' },
      { start: 62, duration: 10, label: 'Logo' },
    ],
  },
  {
    label: 'A1 · Dialogue',
    type: 'audio',
    clips: [
      { start: 2, duration: 26 },
      { start: 32, duration: 22 },
      { start: 60, duration: 18 },
    ],
  },
  {
    label: 'T1 · Captions',
    type: 'text',
    clips: [
      { start: 4, duration: 8, label: 'Hello' },
      { start: 18, duration: 8 },
      { start: 38, duration: 12, label: 'Caption' },
      { start: 64, duration: 12 },
    ],
  },
]

export function TimelinePreview({
  tracks = DEFAULT_TRACKS,
  playheadPercent = 38,
  caption,
}: TimelinePreviewProps) {
  const cm = getClassMap()
  const trackHeight = 36
  const labelWidth = 120
  const totalWidth = 600
  const trackAreaWidth = totalWidth - labelWidth
  const trackY = (i: number) => 28 + i * trackHeight + trackHeight / 2

  return (
    <figure
      data-mol-id="timeline-preview"
      className={cm.cn(
        cm.sp('p', 4),
        'rounded-xl bg-[var(--video-timeline-bg)] border border-[var(--video-border-subtle)] overflow-hidden',
      )}
    >
      <svg
        viewBox={`0 0 ${totalWidth} ${28 + tracks.length * trackHeight + 16}`}
        className={cm.cn('w-full h-auto block')}
        role="img"
        aria-label={caption ?? 'Timeline preview'}
      >
        <line
          x1={labelWidth}
          y1={22}
          x2={totalWidth - 8}
          y2={22}
          stroke="var(--video-border-subtle)"
          strokeWidth="1"
        />
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <g key={i}>
            <line
              x1={labelWidth + trackAreaWidth * t}
              y1={14}
              x2={labelWidth + trackAreaWidth * t}
              y2={22}
              stroke="var(--video-border)"
              strokeWidth="1"
            />
            <text
              x={labelWidth + trackAreaWidth * t}
              y={10}
              fill="var(--video-text-dim)"
              fontFamily="JetBrains Mono, monospace"
              fontSize="8"
              textAnchor="middle"
            >
              {`00:${String(Math.round(t * 30)).padStart(2, '0')}`}
            </text>
          </g>
        ))}

        {tracks.map((track, i) => {
          const y = trackY(i)
          const palette = TRACK_COLOR[track.type]
          return (
            <g key={track.label}>
              <text
                x={12}
                y={y + 4}
                fill={palette.label}
                fontFamily="JetBrains Mono, monospace"
                fontSize="9"
                fontWeight="600"
              >
                {track.label}
              </text>
              <line
                x1={labelWidth}
                y1={y - 14}
                x2={totalWidth - 8}
                y2={y - 14}
                stroke="var(--video-surface)"
                strokeWidth="1"
              />
              {track.clips.map((clip, idx) => {
                const x = labelWidth + (trackAreaWidth * clip.start) / 100
                const w = (trackAreaWidth * clip.duration) / 100
                return (
                  <g key={`${track.label}-${idx}`}>
                    <rect
                      x={x}
                      y={y - 10}
                      width={w}
                      height={20}
                      rx={3}
                      fill={palette.fill}
                      stroke={palette.border}
                      strokeWidth="0.75"
                    />
                    <rect x={x} y={y - 10} width={2} height={20} fill={palette.border} />
                    {clip.label && w > 30 && (
                      <text
                        x={x + 6}
                        y={y + 3}
                        fill="var(--video-text-primary)"
                        fontFamily="Inter, sans-serif"
                        fontSize="9"
                        fontWeight="500"
                      >
                        {clip.label}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          )
        })}

        <line
          x1={labelWidth + (trackAreaWidth * playheadPercent) / 100}
          y1={14}
          x2={labelWidth + (trackAreaWidth * playheadPercent) / 100}
          y2={28 + tracks.length * trackHeight}
          stroke="var(--video-playhead)"
          strokeWidth="1.5"
        />
        <polygon
          points={`${labelWidth + (trackAreaWidth * playheadPercent) / 100 - 5},10 ${labelWidth + (trackAreaWidth * playheadPercent) / 100 + 5},10 ${labelWidth + (trackAreaWidth * playheadPercent) / 100},20`}
          fill="var(--video-playhead)"
        />
      </svg>
      {caption && (
        <figcaption
          className={cm.cn(
            'mt-2 font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-dim)] text-center',
          )}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

export default TimelinePreview
