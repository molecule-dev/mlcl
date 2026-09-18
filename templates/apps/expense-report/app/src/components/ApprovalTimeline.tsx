import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Vertical approval-flow timeline — connected nodes with state-colored
 * fills and trailing labels/timestamps. DESIGN.md mandates this be a
 * dedicated component (never collapsed into prose) so it gets first-class
 * treatment here.
 *
 * Translated from the editorial-list pattern in personal-finance and the
 * status-node anatomy from helpdesk-ticketing's TicketDetail timeline.
 */
export type StepState = 'completed' | 'active' | 'pending' | 'rejected'

export interface ApprovalStep {
  id: string
  label: string
  actor?: string
  timestamp?: string
  state: StepState
  note?: string
}

interface ApprovalTimelineProps {
  steps: ApprovalStep[]
}

const STATE_NODE: Record<StepState, string> = {
  completed: 'bg-[var(--color-status-approved)] text-white',
  active: 'bg-primary text-white ring-4 ring-primary/20',
  pending: 'bg-surface text-on-surface-variant border border-outline-variant',
  rejected: 'bg-[var(--color-status-rejected)] text-white',
}

const STATE_ICON: Record<StepState, string> = {
  completed: 'check',
  active: 'hourglass_top',
  pending: 'circle',
  rejected: 'close',
}

/**
 * The live API sends ISO-8601 timestamps while display-only states arrive
 * as short strings ("In progress", "Pending"). Render ISO values as a
 * compact date and pass anything else through untouched.
 */
const formatTimestamp = (timestamp: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(timestamp)) return timestamp
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return timestamp
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ApprovalTimeline({ steps }: ApprovalTimelineProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ol
      data-mol-id="approval-timeline"
      className={cm.cn(cm.flex({ direction: 'col' }), 'relative')}
    >
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1
        return (
          <li
            key={step.id}
            className={cm.cn(cm.flex({ gap: 'md' }), cm.sp('pb', isLast ? 0 : 6), 'relative')}
          >
            {!isLast ? (
              <span
                aria-hidden="true"
                className={cm.cn('absolute left-4 top-9 bottom-0 w-px bg-outline-variant/60')}
              />
            ) : null}
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'relative h-8 w-8 shrink-0 rounded-full',
                STATE_NODE[step.state],
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                {STATE_ICON[step.state]}
              </span>
            </div>
            <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, cm.sp('pt', 1))}>
              <div className={cm.flex({ align: 'baseline', justify: 'between', gap: 'sm' })}>
                <span
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                >
                  {step.label}
                </span>
                {step.timestamp ? (
                  <span
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}
                  >
                    {formatTimestamp(step.timestamp)}
                  </span>
                ) : null}
              </div>
              {step.actor ? (
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('medium'),
                    'text-on-surface-variant',
                  )}
                >
                  {t(
                    'approvalTimeline.actor',
                    { actor: step.actor },
                    { defaultValue: 'by {{actor}}' },
                  )}
                </span>
              ) : null}
              {step.note ? (
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mt', 2),
                    cm.sp('p', 3),
                    'rounded-lg bg-surface-container text-on-surface',
                  )}
                >
                  {step.note}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default ApprovalTimeline
