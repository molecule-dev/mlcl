import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type NotificationFilter = 'All' | 'Mentions' | 'Comments' | 'Renders' | 'Shares'

interface NotificationFilterBarProps {
  active: NotificationFilter
  onChange: (filter: NotificationFilter) => void
}

function NotificationFilterBar({ active, onChange }: NotificationFilterBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const activeClass = cm.cn(
    cm.sp('px', 4),
    cm.roundedFull,
    cm.textSize('sm'),
    cm.fontWeight('medium'),
    'py-1.5 bg-surface-container-highest text-on-surface shadow-sm transition-transform active:scale-95',
  )
  const inactiveClass = cm.cn(
    cm.sp('px', 4),
    cm.roundedFull,
    cm.textSize('sm'),
    cm.fontWeight('medium'),
    'py-1.5 bg-surface border border-border text-foreground-secondary hover:bg-surface-secondary hover:text-foreground shadow-sm transition-all active:scale-95',
  )
  const filters = ['All', 'Mentions', 'Comments', 'Renders', 'Shares'] as const
  const filterLabels: Record<(typeof filters)[number], string> = {
    All: t('status.all', {}, { defaultValue: 'All' }),
    Mentions: t('notificationFilterBar.mentions', {}, { defaultValue: 'Mentions' }),
    Comments: t('notificationFilterBar.comments', {}, { defaultValue: 'Comments' }),
    Renders: t('notificationFilterBar.renders', {}, { defaultValue: 'Renders' }),
    Shares: t('notificationFilterBar.shares', {}, { defaultValue: 'Shares' }),
  }
  return (
    <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 2 }), cm.sp('mb', 8))} role="tablist">
      {filters.map((f) => (
        <button
          key={f}
          role="tab"
          aria-selected={active === f}
          onClick={() => onChange(f)}
          className={active === f ? activeClass : inactiveClass}
        >
          {filterLabels[f]}
        </button>
      ))}
    </div>
  )
}
export default NotificationFilterBar
export { NotificationFilterBar }
