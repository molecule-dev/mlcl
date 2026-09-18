/**
 * PriorityPill — uppercase status badge for Urgent / Pinned / Normal / FYI
 * announcement priorities.
 *
 * Layout: small rounded-full pill with material-symbols glyph + tracking-widest
 * uppercase 10px label. Color resolves from the Herald priority tokens
 * (--color-priority-* in theme.css). Use over the title row of cards / detail
 * pages and inline anywhere a priority is expressed.
 *
 * Translated from forum/ThreadRow status-pill pattern (Pinned/Resolved/Hot)
 * fused with the DESIGN.md Priority Badge spec from internal-announcements.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type AnnouncementPriority = 'urgent' | 'pinned' | 'normal' | 'fyi'

interface PriorityPillProps {
  priority: AnnouncementPriority
  size?: 'sm' | 'md'
}

const PRIORITY_CONFIG: Record<
  AnnouncementPriority,
  { icon: string; bg: string; fg: string; key: string; defaultLabel: string }
> = {
  urgent: {
    icon: 'priority_high',
    bg: 'var(--color-priority-urgent-light, #fee2e2)',
    fg: 'var(--color-priority-urgent, #dc2626)',
    key: 'priorityPill.urgent',
    defaultLabel: 'Urgent',
  },
  pinned: {
    icon: 'push_pin',
    bg: 'var(--color-priority-pinned-light, #fef3c7)',
    fg: 'var(--color-priority-pinned, #d97706)',
    key: 'priorityPill.pinned',
    defaultLabel: 'Pinned',
  },
  normal: {
    icon: 'campaign',
    bg: 'var(--color-priority-normal-light, #eef2ff)',
    fg: 'var(--color-priority-normal, #4f46e5)',
    key: 'priorityPill.normal',
    defaultLabel: 'Announcement',
  },
  fyi: {
    icon: 'info',
    bg: 'var(--color-priority-fyi-light, #f1f5f9)',
    fg: 'var(--color-priority-fyi, #64748b)',
    key: 'priorityPill.fyi',
    defaultLabel: 'FYI',
  },
}

export function PriorityPill({ priority, size = 'md' }: PriorityPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const cfg = PRIORITY_CONFIG[priority]
  const padX = size === 'sm' ? 2 : 3
  const padY = size === 'sm' ? 0 : 1

  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.fontWeight('bold'),
        cm.sp('px', padX),
        cm.sp('py', padY),
        'self-start text-[10px] uppercase tracking-widest rounded-full',
      )}
      style={{ backgroundColor: cfg.bg, color: cfg.fg }}
    >
      <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
        {cfg.icon}
      </span>
      {t(cfg.key, {}, { defaultValue: cfg.defaultLabel })}
    </span>
  )
}

export default PriorityPill

export const PRIORITY_BORDER_COLOR: Record<AnnouncementPriority, string> = {
  urgent: 'var(--color-priority-urgent, #dc2626)',
  pinned: 'var(--color-priority-pinned, #d97706)',
  normal: 'var(--color-priority-normal, #4f46e5)',
  fyi: 'var(--color-priority-fyi, #94a3b8)',
}
