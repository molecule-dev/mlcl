import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Activity feed row — avatar bubble + plain prose summary + link to the card.
 * Hover lifts the row background and animates the chevron.
 *
 * Translated from crm's ActivityFeed.tsx + personal-finance's ActivityRow —
 * adapts the per-event verb chip (moved / commented / assigned …) into a
 * Driftboard color scale.
 */
export type ActivityKind =
  | 'card_moved'
  | 'comment_added'
  | 'card_assigned'
  | 'card_created'
  | 'due_date_changed'
  | 'checklist_completed'
  | 'label_added'

export interface ActivityRecord {
  id: string
  type: ActivityKind
  actor_name: string
  actor_avatar: string
  board_id: string
  board_name: string
  card_id: string
  card_title: string
  summary: string
  from_column?: string
  to_column?: string
  occurred_at: string
}

interface ActivityFeedItemProps {
  activity: ActivityRecord
}

const KIND_TONE: Record<ActivityKind, { icon: string; chip: string }> = {
  card_moved: { icon: 'swap_horiz', chip: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  comment_added: {
    icon: 'chat_bubble',
    chip: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  },
  card_assigned: { icon: 'person_add', chip: 'bg-emerald-500/10 text-success' },
  card_created: { icon: 'add_circle', chip: 'bg-teal-500/10 text-teal-700 dark:text-teal-300' },
  due_date_changed: { icon: 'event', chip: 'bg-amber-500/10 text-warning' },
  checklist_completed: { icon: 'check_circle', chip: 'bg-emerald-500/10 text-success' },
  label_added: { icon: 'label', chip: 'bg-pink-500/10 text-pink-700 dark:text-pink-300' },
}

function relativeTime(iso: string, now = Date.now()) {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const diff = Math.max(0, now - t)
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ActivityFeedItem({ activity }: ActivityFeedItemProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tone = KIND_TONE[activity.type] ?? KIND_TONE.card_moved

  return (
    <Link
      to={`/cards/${activity.card_id}`}
      className={cm.cn(
        'group flex items-start gap-3 rounded-xl transition-colors',
        cm.sp('p', 3),
        'hover:bg-surface-container-low',
      )}
    >
      <div className="relative shrink-0">
        <img
          src={activity.actor_avatar}
          alt=""
          className={cm.cn(
            `w-10 h-10 rounded-full object-cover ring-2 ring-surface-container-lowest`,
          )}
        />
        <span
          className={cm.cn(
            'absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center',
            'ring-2 ring-surface-container-lowest',
            tone.chip,
          )}
        >
          <span className="material-symbols-outlined text-[14px]">{tone.icon}</span>
        </span>
      </div>
      <div className={cm.cn(cm.flex1, 'min-w-0')}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
          <span className="font-bold">{activity.actor_name}</span>{' '}
          <span className="text-on-surface-variant">{activity.summary}</span>
        </p>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'text-on-surface-variant truncate mt-0.5',
          )}
        >
          <span className="text-primary">{activity.card_title}</span>
          <span className={cm.cn(`mx-1.5 text-outline-variant`)}>·</span>
          <span>{activity.board_name}</span>
        </p>
        {activity.from_column && activity.to_column ? (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'text-on-surface-variant mt-1 flex items-center gap-1',
            )}
          >
            <span className={cm.cn(`px-2 py-0.5 rounded-full bg-surface-container-high`)}>
              {activity.from_column}
            </span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            <span
              className={cm.cn(`px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold`)}
            >
              {activity.to_column}
            </span>
          </p>
        ) : null}
      </div>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          'shrink-0 font-semibold text-on-surface-variant whitespace-nowrap pt-1',
        )}
      >
        {t(
          'activityFeedItem.time',
          { value: relativeTime(activity.occurred_at) },
          { defaultValue: '{{value}}' },
        )}
      </span>
    </Link>
  )
}

export default ActivityFeedItem
