import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SystemActivityItem() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex(),
        cm.sp('p', 4),
        'gap-4 hover:bg-surface-container-low transition-colors rounded-xl group',
      )}
    >
      <div
        className={cm.cn(
          cm.w(10),
          cm.h(10),
          cm.roundedFull,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.shrink0,
          'bg-secondary-container text-white',
        )}
      >
        <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>mail</span>
      </div>
      <div className={cm.flex1}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
          <span className={cm.fontWeight('bold')}>
            {t('systemActivityItem.actorName', {}, { defaultValue: 'System' })}
          </span>
          {t('systemActivityItem.action', {}, { defaultValue: ' sent proposal to ' })}
          <span className={cm.cn(cm.textPrimary, cm.fontWeight('semibold'))}>
            {t('systemActivityItem.recipientName', {}, { defaultValue: 'NexGen AI' })}
          </span>
        </p>
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'systemActivityItem.meta',
            { hours: 5, category: 'Automations' },
            { defaultValue: '{{hours}} hours ago • {{category}}' },
          )}
        </span>
      </div>
    </div>
  )
}

export default SystemActivityItem
export { SystemActivityItem }
