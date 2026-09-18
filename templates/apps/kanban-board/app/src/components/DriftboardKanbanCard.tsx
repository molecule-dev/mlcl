import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Branded card surface for the Driftboard kanban board.
 * Cover image (optional), priority strip, label chips, body, footer with
 * checklist/comments/attachments badges and stacked assignees.
 *
 * Translated from project-management's KanbanTaskCard.tsx — re-tones priority
 * accents to Driftboard's red/amber/blue/grey scale, and adds the optional
 * cover-image strip from the catalog §5 (kanban card with cover).
 */
export interface KanbanCardLabel {
  color: string
  name: string
}

export interface KanbanCardAssignee {
  id: string
  name: string
  avatar: string
}

export interface KanbanCardData {
  id: string
  title: string
  description?: string
  labels: KanbanCardLabel[]
  assignees: KanbanCardAssignee[]
  due_date?: string | null
  due_state?: 'default' | 'soon' | 'overdue'
  priority?: 'critical' | 'high' | 'medium' | 'low'
  comments_count: number
  attachments_count: number
  checklist_total: number
  checklist_done: number
  cover_url?: string | null
}

interface DriftboardKanbanCardProps {
  card: KanbanCardData
}

const LABEL_BG: Record<string, string> = {
  red: 'bg-rose-500/15 text-error',
  orange: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  amber: 'bg-amber-500/15 text-warning',
  green: 'bg-emerald-500/15 text-success',
  teal: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  blue: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  indigo: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  purple: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  pink: 'bg-pink-500/15 text-pink-700 dark:text-pink-300',
  slate: 'bg-slate-500/15 text-foreground',
}

const PRIORITY_STRIP: Record<NonNullable<KanbanCardData['priority']>, string> = {
  critical: 'bg-rose-500',
  high: 'bg-amber-500',
  medium: 'bg-blue-500',
  low: 'bg-slate-400',
}

export function DriftboardKanbanCard({ card }: DriftboardKanbanCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const visibleLabels = card.labels.slice(0, 3)
  const overflowLabels = Math.max(0, card.labels.length - visibleLabels.length)
  const dueLabel = card.due_date
    ? new Date(card.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null
  const dueClass =
    card.due_state === 'overdue'
      ? 'text-error font-bold'
      : card.due_state === 'soon'
        ? 'text-warning font-semibold'
        : 'text-on-surface-variant'

  return (
    <Link
      to={`/cards/${card.id}`}
      className={cm.cn(
        'group block bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden',
        'border border-outline-variant/30 hover:border-outline-variant/60',
        'transition-all hover:-translate-y-0.5 hover:shadow-md',
      )}
    >
      {card.cover_url ? (
        <div className={cm.cn(`h-28 w-full overflow-hidden`)}>
          <img src={card.cover_url} alt="" className={cm.cn(`h-full w-full object-cover`)} />
        </div>
      ) : null}
      {card.priority ? (
        <div className={cm.cn('h-1 w-full', PRIORITY_STRIP[card.priority])} />
      ) : null}
      <div className={cm.cn(cm.sp('p', 4), cm.flex({ direction: 'col' }), cm.stack(3))}>
        {visibleLabels.length > 0 ? (
          <div className={cm.flex({ wrap: 'wrap', gap: 'xs' })}>
            {visibleLabels.map((label) => (
              <span
                key={`${card.id}-${label.name}`}
                className={cm.cn(
                  'px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full',
                  LABEL_BG[label.color] ?? 'bg-surface-container-high text-on-surface-variant',
                )}
              >
                {label.name}
              </span>
            ))}
            {overflowLabels > 0 ? (
              <span
                className={cm.cn(
                  `px-2 py-0.5 text-[10px] font-bold tracking-widest rounded-full bg-surface-container-high text-on-surface-variant`,
                )}
              >
                {t(
                  'driftboardKanbanCard.labelOverflow',
                  { count: overflowLabels },
                  { defaultValue: '+{{count}}' },
                )}
              </span>
            ) : null}
          </div>
        ) : null}

        <h4 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface leading-snug')}>
          {card.title}
        </h4>
        {card.description ? (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant line-clamp-2')}>
            {card.description}
          </p>
        ) : null}

        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('pt', 2),
            'border-t border-outline-variant/20',
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            {card.checklist_total > 0 ? (
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'text-[11px] text-on-surface-variant font-semibold',
                )}
              >
                <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                  checklist
                </span>
                {card.checklist_done}/{card.checklist_total}
              </span>
            ) : null}
            {card.comments_count > 0 ? (
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'text-[11px] text-on-surface-variant font-semibold',
                )}
              >
                <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                  chat_bubble
                </span>
                {card.comments_count}
              </span>
            ) : null}
            {card.attachments_count > 0 ? (
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'text-[11px] text-on-surface-variant font-semibold',
                )}
              >
                <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                  attach_file
                </span>
                {card.attachments_count}
              </span>
            ) : null}
            {dueLabel ? (
              <span
                className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'text-[11px]', dueClass)}
              >
                <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>event</span>
                {dueLabel}
              </span>
            ) : null}
          </div>
          {card.assignees.length > 0 ? (
            <div className={cm.cn(`flex -space-x-2`)}>
              {card.assignees.slice(0, 3).map((person) => (
                <img
                  key={person.id}
                  src={person.avatar}
                  alt={person.name}
                  className={cm.cn(
                    `w-6 h-6 rounded-full ring-2 ring-surface-container-lowest object-cover`,
                  )}
                />
              ))}
              {card.assignees.length > 3 ? (
                <span
                  className={cm.cn(
                    `w-6 h-6 rounded-full ring-2 ring-surface-container-lowest bg-surface-container-high text-[10px] font-bold text-on-surface-variant flex items-center justify-center`,
                  )}
                >
                  +{card.assignees.length - 3}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

export default DriftboardKanbanCard
