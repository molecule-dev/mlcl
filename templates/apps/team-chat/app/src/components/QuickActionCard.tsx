import { getClassMap } from '@molecule/app-ui'

interface QuickActionCardProps {
  icon: string
  title: string
  description: string
  onClick?: () => void
}

export function QuickActionCard({ icon, title, description, onClick }: QuickActionCardProps) {
  const cm = getClassMap()
  return (
    <button
      onClick={onClick}
      className={cm.cn(
        cm.flex({ align: 'start', gap: 4 }),
        cm.sp('p', 6),
        'group bg-surface-container-lowest rounded-xl shadow-sm transition-all text-left',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(12),
          cm.h(12),
          cm.textPrimary,
          'rounded-lg bg-primary-container group-hover:bg-primary group-hover:text-on-primary transition-colors',
        )}
      >
        <span className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')}>{icon}</span>
      </div>
      <div>
        <h4 className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>{title}</h4>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{description}</p>
      </div>
    </button>
  )
}
export default QuickActionCard
