import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Hypnogram timeline — horizontal stacked bar where each segment is a
 * sleep stage (deep / light / rem / awake) sized by its duration. Renders
 * as a single inline SVG so screenshots work without a chart library.
 *
 * Translated from personal-finance/AccountRecentTransactions.tsx (the
 * editorial 10px tracking-widest header pattern) crossed with the
 * habit-tracker/ConsistencyHeatmap.tsx grid-segment treatment. The chart
 * itself is a custom hypnogram per DESIGN.md "Sleep Stage Bar".
 */

export type SleepStage = 'awake' | 'rem' | 'light' | 'deep'

interface StageSegment {
  stage: SleepStage
  startMinutes: number
  durationMinutes: number
}

interface SleepStagesTimelineProps {
  bedtime: string
  wakeTime: string
  segments: StageSegment[]
  totalMinutes: number
}

const STAGE_META: Record<SleepStage, { color: string; label: string; row: number }> = {
  awake: { color: 'var(--color-stage-awake)', label: 'Awake', row: 0 },
  rem: { color: 'var(--color-stage-rem)', label: 'REM', row: 1 },
  light: { color: 'var(--color-stage-light)', label: 'Light', row: 2 },
  deep: { color: 'var(--color-stage-deep)', label: 'Deep', row: 3 },
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch (_error) {
    // invalid date string — return raw value as fallback
    return iso
  }
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}

export function SleepStagesTimeline({
  bedtime,
  wakeTime,
  segments,
  totalMinutes,
}: SleepStagesTimelineProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const chartW = 720
  const chartH = 220
  const padX = 56
  const padTop = 24
  const padBottom = 32
  const innerW = chartW - padX - 24
  const innerH = chartH - padTop - padBottom
  const rowH = innerH / 4
  const safeTotal = Math.max(totalMinutes, 1)

  const stageTotals: Record<SleepStage, number> = { awake: 0, rem: 0, light: 0, deep: 0 }
  segments.forEach((seg) => {
    stageTotals[seg.stage] += seg.durationMinutes
  })

  const xLabelCount = 5
  const xLabels = Array.from({ length: xLabelCount }, (_, i) => {
    const minute = (safeTotal * i) / (xLabelCount - 1)
    const startMs = bedtime ? new Date(bedtime).getTime() : 0
    const labelMs = startMs + minute * 60_000
    return {
      x: padX + (minute / safeTotal) * innerW,
      label: new Date(labelMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  })

  return (
    <div className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('mb', 4),
          'flex-wrap gap-3',
        )}
      >
        <div>
          <h3
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('sleepStagesTimeline.title', {}, { defaultValue: 'Hypnogram' })}
          </h3>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'text-on-surface',
            )}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatTime(bedtime)} — {formatTime(wakeTime)}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          {(Object.keys(STAGE_META) as SleepStage[]).reverse().map((stage) => (
            <span
              key={stage}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest',
              )}
            >
              <span
                className={cm.cn('rounded-sm')}
                style={{ width: 12, height: 12, backgroundColor: STAGE_META[stage].color }}
                aria-hidden="true"
              />
              <span className={cm.cn('text-on-surface')}>
                {t(
                  `sleepStagesTimeline.stage.${stage}`,
                  {},
                  { defaultValue: STAGE_META[stage].label },
                )}
              </span>
              <span className={cm.cn('text-on-surface-variant')}>
                {formatDuration(stageTotals[stage])}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className={cm.cn('overflow-x-auto')}>
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          width="100%"
          role="img"
          aria-label={t(
            'sleepStagesTimeline.ariaLabel',
            {},
            { defaultValue: 'Sleep stages timeline' },
          )}
          style={{ display: 'block' }}
        >
          {/* Row backgrounds */}
          {(Object.keys(STAGE_META) as SleepStage[]).map((stage) => {
            const meta = STAGE_META[stage]
            const y = padTop + meta.row * rowH
            return (
              <g key={`row-${stage}`}>
                <rect
                  x={padX}
                  y={y + rowH * 0.2}
                  width={innerW}
                  height={rowH * 0.6}
                  fill="var(--color-surface-container)"
                  rx={6}
                />
                <text
                  x={padX - 8}
                  y={y + rowH / 2 + 4}
                  fontSize="10"
                  textAnchor="end"
                  fill="var(--color-on-surface-variant)"
                  fontWeight="700"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
                >
                  {t(`sleepStagesTimeline.stage.${stage}`, {}, { defaultValue: meta.label })}
                </text>
              </g>
            )
          })}

          {/* Stage segments */}
          {segments.map((seg, i) => {
            const meta = STAGE_META[seg.stage]
            const x = padX + (seg.startMinutes / safeTotal) * innerW
            const segW = Math.max(2, (seg.durationMinutes / safeTotal) * innerW - 1)
            const y = padTop + meta.row * rowH + rowH * 0.2
            const segH = rowH * 0.6
            return <rect key={i} x={x} y={y} width={segW} height={segH} fill={meta.color} rx={6} />
          })}

          {/* X axis labels */}
          {xLabels.map((label, i) => (
            <g key={`x-${i}`}>
              <line
                x1={label.x}
                x2={label.x}
                y1={padTop}
                y2={chartH - padBottom + 4}
                stroke="var(--color-outline-variant)"
                strokeOpacity="0.3"
                strokeDasharray="2 4"
              />
              <text
                x={label.x}
                y={chartH - 8}
                fontSize="10"
                textAnchor="middle"
                fill="var(--color-on-surface-variant)"
                fontWeight="600"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {label.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
