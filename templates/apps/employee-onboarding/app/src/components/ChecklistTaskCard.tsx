import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Onboarding task card — left-border-accented surface card with a category
 * eyebrow, large title, due-date row, and an optional checkbox toggle. Border
 * color encodes category (general → primary teal, milestone → accent purple).
 *
 * Translated from crm/CompanyRow.tsx (border-left-4 + uppercase eyebrow + hover
 * lift) — adapted to Embark's "Checklist Card" spec from DESIGN.md.
 */

export type ChecklistTaskStatus = 'pending' | 'in_progress' | 'complete' | 'overdue'
export type ChecklistTaskCategory = 'general' | 'milestone' | 'training' | 'documents' | 'people'

export interface ChecklistTaskCardProps {
  id: string
  title: string
  description?: string | null
  category: ChecklistTaskCategory
  dueLabel?: string
  status: ChecklistTaskStatus
  /** Optional sub-step counts (e.g. "3 of 5 steps complete"). */
  steps?: { done: number; total: number }
  /** Called when the user toggles the inline checkbox. */
  onToggle?: (id: string, next: boolean) => void
  /** Optional avatar group for the assignee/buddy. */
  assigneeName?: string
  /** Optional href override; defaults to /checklist/:id. */
  href?: string
}

const CATEGORY: Record<ChecklistTaskCategory, { color: string; bg: string; label: string }> = {
  general: {
    color: 'var(--mol-color-primary)',
    bg: 'color-mix(in srgb, var(--mol-color-primary) 10%, transparent)',
    label: 'General',
  },
  milestone: {
    color: 'var(--embark-milestone)',
    bg: 'color-mix(in srgb, var(--embark-milestone) 12%, transparent)',
    label: 'Milestone',
  },
  training: {
    color: 'var(--mol-color-primary)',
    bg: 'color-mix(in srgb, var(--mol-color-primary) 10%, transparent)',
    label: 'Training',
  },
  documents: {
    color: 'var(--mol-color-text-tertiary)',
    bg: 'color-mix(in srgb, var(--mol-color-text-tertiary) 12%, transparent)',
    label: 'Documents',
  },
  people: {
    color: 'var(--mol-color-warning)',
    bg: 'color-mix(in srgb, var(--mol-color-warning) 12%, transparent)',
    label: 'People',
  },
}

const STATUS: Record<ChecklistTaskStatus, { fg: string; bg: string; label: string }> = {
  pending: {
    fg: 'var(--embark-status-pending)',
    bg: 'var(--embark-status-pending-bg)',
    label: 'Not started',
  },
  in_progress: {
    fg: 'var(--embark-status-progress)',
    bg: 'var(--embark-status-progress-bg)',
    label: 'In progress',
  },
  complete: {
    fg: 'var(--embark-status-complete)',
    bg: 'var(--embark-status-complete-bg)',
    label: 'Complete',
  },
  overdue: {
    fg: 'var(--embark-status-overdue)',
    bg: 'var(--embark-status-overdue-bg)',
    label: 'Overdue',
  },
}

export function ChecklistTaskCard({
  id,
  title,
  description,
  category,
  dueLabel,
  status,
  steps,
  onToggle,
  assigneeName,
  href,
}: ChecklistTaskCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const cat = CATEGORY[category]
  const st = STATUS[status]
  const checked = status === 'complete'

  return (
    <article
      data-mol-id={`checklist-task-${id}`}
      className={cm.cn(
        cm.flex({ gap: 'md', align: 'start' }),
        'group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
      )}
      style={{
        position: 'relative',
        background: 'var(--color-surface, var(--mol-color-surface))',
        padding: '20px 24px',
        borderRadius: '12px',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
        borderLeft: `4px solid ${cat.color}`,
      }}
    >
      {/* Toggle renders only when the caller wires onToggle — a checkbox that
          renders but does nothing reads as a bug (dashboard "up next" cards
          are read-only pointers into the task). */}
      {onToggle && (
        <button
          type="button"
          aria-pressed={checked}
          aria-label={
            checked
              ? t('checklistTaskCard.markIncomplete', {}, { defaultValue: 'Mark task incomplete' })
              : t('checklistTaskCard.markComplete', {}, { defaultValue: 'Mark task complete' })
          }
          onClick={(e) => {
            e.preventDefault()
            onToggle?.(id, !checked)
          }}
          className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
          style={{
            // 40px hit target (fleet minimum for touch); the visible checkbox
            // is the 24px inner box.
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            border: '2px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            flexShrink: 0,
            marginLeft: '-8px',
          }}
        >
          <span
            className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '8px',
              border: `2px solid ${checked ? cat.color : 'var(--color-border, var(--mol-color-border-secondary))'}`,
              background: checked ? cat.color : 'transparent',
            }}
          >
            {checked && (
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '16px', color: 'var(--mol-color-surface)', fontWeight: 800 }}
              >
                check
              </span>
            )}
          </span>
        </button>
      )}

      <div className={cm.flex1} style={{ minWidth: 0 }}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className="text-[10px] font-black uppercase tracking-[0.18em]"
            style={{
              color: cat.color,
              background: cat.bg,
              padding: '2px 10px',
              borderRadius: '999px',
            }}
          >
            {t(`checklistTaskCard.category.${category}`, {}, { defaultValue: cat.label })}
          </span>
          <span
            className="text-[10px] font-black uppercase tracking-[0.18em]"
            style={{ color: st.fg, background: st.bg, padding: '2px 10px', borderRadius: '999px' }}
          >
            {t(`checklistTaskCard.status.${status}`, {}, { defaultValue: st.label })}
          </span>
        </div>

        <Link to={href ?? `/checklist/${id}`} className="block group">
          <h3
            className={cm.cn(cm.fontWeight('semibold'), cm.sp('mt', 2))}
            style={{
              fontSize: '17px',
              color: 'var(--color-foreground, #0f172a)',
              textDecoration: checked ? 'line-through' : 'none',
              opacity: checked ? 0.6 : 1,
            }}
          >
            {title}
          </h3>
          {description && (
            <p className={cm.cn(cm.textMuted, cm.sp('mt', 1), 'text-sm')}>{description}</p>
          )}
        </Link>

        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'md' }),
            cm.sp('mt', 3),
            'text-xs flex-wrap',
          )}
          style={{ color: 'var(--color-foreground-secondary, var(--mol-color-text-secondary))' }}
        >
          {dueLabel && (
            <span
              className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
              style={{
                color: status === 'overdue' ? 'var(--mol-color-error)' : undefined,
                fontWeight: status === 'overdue' ? 600 : 500,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                event
              </span>
              {dueLabel}
            </span>
          )}
          {steps && (
            <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                format_list_numbered
              </span>
              {t(
                'checklistTaskCard.stepsLabel',
                { done: steps.done, total: steps.total },
                {
                  defaultValue: `${steps.done} of ${steps.total} steps`,
                },
              )}
            </span>
          )}
          {assigneeName && (
            <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                person
              </span>
              {assigneeName}
            </span>
          )}
        </div>
      </div>

      <Link
        to={href ?? `/checklist/${id}`}
        aria-label={t('checklistTaskCard.openLabel', {}, { defaultValue: 'Open task' })}
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'self-center text-on-surface-variant transition-colors',
        )}
        style={{ width: '40px', height: '40px', flexShrink: 0 }}
      >
        <span className="material-symbols-outlined">arrow_forward</span>
      </Link>
    </article>
  )
}
