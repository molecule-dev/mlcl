import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Vertical 30/60/90-day milestone rail — each milestone is a node on a vertical
 * line with a content card to the right showing title, date, status, and child
 * tasks.
 *
 * Translated from crm/ActivityTimelineCard.tsx (vertical timeline with status
 * dots) — adapted to Embark's "Milestone Timeline" spec from DESIGN.md.
 */

export type MilestoneStatus = 'upcoming' | 'current' | 'complete' | 'overdue'

export interface MilestoneEntry {
  id: string
  title: string
  dayLabel: string
  description?: string
  status: MilestoneStatus
  taskSummary?: { done: number; total: number }
}

export interface MilestoneTimelineProps {
  entries: MilestoneEntry[]
}

/**
 * Dot fill and connector colour. Decorative only — `aria-hidden`, and never
 * carrying text, so these are free to stay light and legible as shapes.
 */
const NODE_COLOR: Record<MilestoneStatus, string> = {
  upcoming: '#cbd5e1',
  current: '#0d9488',
  complete: '#16a34a',
  overdue: '#dc2626',
}

/**
 * Text colour for the status label, which is 10px bold on white or on a 12%
 * wash of the same hue.
 *
 * Separate from NODE_COLOR because one value cannot do both jobs: every dot
 * colour above fails WCAG AA as text — slate-300 measured 1.48:1 on white,
 * teal-600 3.74:1, green-600 3.30:1, and red-600 4.83:1 on white but 4.01:1 on
 * its own tint. Darkening the dots instead would have muddied the timeline
 * graphic, which is the one thing on this component that reads at a glance.
 */
const LABEL_COLOR: Record<MilestoneStatus, string> = {
  upcoming: '#475569', // slate-600 — 7.58:1 on white, 7.25:1 on tint
  current: '#0f766e', // teal-700  — 5.47:1 / 4.74:1
  complete: '#166534', // green-800 — 7.13:1 / 6.24:1 (green-700 was 4.39 on tint)
  overdue: '#b91c1c', // red-700   — 6.47:1 / 5.37:1
}

const STATUS_LABEL: Record<MilestoneStatus, string> = {
  upcoming: 'Upcoming',
  current: 'In progress',
  complete: 'Complete',
  overdue: 'Overdue',
}

export function MilestoneTimeline({ entries }: MilestoneTimelineProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <ol
      className={cm.flex({ direction: 'col' })}
      style={{ position: 'relative', paddingLeft: '24px' }}
    >
      {/* Vertical track line */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '11px',
          top: '8px',
          bottom: '8px',
          width: '2px',
          background:
            'linear-gradient(180deg, var(--mol-color-primary) 0%, var(--mol-color-secondary) 100%)',
          opacity: 0.35,
        }}
      />

      {entries.map((m, i) => {
        const color = NODE_COLOR[m.status]
        // Text uses the readable pair; the dot/connector keep the graphic colour.
        const labelColor = LABEL_COLOR[m.status]
        return (
          <li
            key={m.id}
            data-mol-id={`milestone-${m.id}`}
            style={{ position: 'relative', paddingBottom: i === entries.length - 1 ? 0 : '32px' }}
          >
            {/* Node */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                left: '-19px',
                top: '8px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background:
                  m.status === 'complete'
                    ? color
                    : 'var(--color-surface, var(--mol-color-surface))',
                border: `3px solid ${color}`,
                boxShadow: m.status === 'current' ? `0 0 0 6px rgba(13, 148, 136, 0.18)` : 'none',
              }}
            />

            <article
              className={cm.cn(
                cm.sp('p', 5),
                'rounded-xl shadow-sm transition-shadow hover:shadow-md',
              )}
              style={{
                background: 'var(--color-surface, var(--mol-color-surface))',
                borderLeft: `3px solid ${color}`,
              }}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                  'flex-wrap',
                )}
              >
                <p
                  className="text-[10px] font-black uppercase tracking-[0.2em]"
                  style={{ color: labelColor }}
                >
                  {m.dayLabel}
                </p>
                <span
                  className="text-[10px] font-black uppercase tracking-[0.18em]"
                  style={{
                    // Text on a 12% wash of the SAME hue — the dot colour is
                    // 1.42:1 there. The wash keeps the graphic colour; only the
                    // glyph moves to the readable one.
                    color: labelColor,
                    background: `color-mix(in srgb, ${color} 12%, transparent)`,
                    padding: '2px 10px',
                    borderRadius: '999px',
                  }}
                >
                  {t(
                    `milestoneTimeline.status.${m.status}`,
                    {},
                    { defaultValue: STATUS_LABEL[m.status] },
                  )}
                </span>
              </div>
              <h3
                className={cm.cn(cm.fontWeight('semibold'), cm.sp('mt', 1), 'text-base')}
                style={{ color: 'var(--color-foreground, #0f172a)' }}
              >
                {m.title}
              </h3>
              {m.description && (
                <p className={cm.cn(cm.textMuted, cm.sp('mt', 1), 'text-sm')}>{m.description}</p>
              )}
              {m.taskSummary && (
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 3))}>
                  <div
                    style={{
                      flex: 1,
                      height: '6px',
                      borderRadius: '999px',
                      background:
                        'var(--embark-progress-track, var(--mol-color-background-tertiary))',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${(m.taskSummary.done / Math.max(1, m.taskSummary.total)) * 100}%`,
                        background: color,
                        transition: 'width 500ms ease-out',
                      }}
                    />
                  </div>
                  <span
                    className="font-medium tabular-nums"
                    style={{
                      color: 'var(--color-foreground-secondary, var(--mol-color-text-secondary))',
                    }}
                  >
                    {t(
                      'milestoneTimeline.taskCount',
                      { done: m.taskSummary.done, total: m.taskSummary.total },
                      {
                        defaultValue: `${m.taskSummary.done}/${m.taskSummary.total}`,
                      },
                    )}
                  </span>
                </div>
              )}
            </article>
          </li>
        )
      })}
    </ol>
  )
}
