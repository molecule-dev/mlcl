import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function DealRow() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <button
      type="button"
      className={cm.cn(
        cm.sp('p', 4),
        cm.cursorPointer,
        'w-full text-left bg-surface-container-low rounded group hover:bg-surface-container transition-colors',
      )}
      onClick={() => {
        /* TODO: wire when deal id prop exists */
      }}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 1))}>
        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
          {t('dealRow.name', {}, { defaultValue: 'Cloud Migration Phase 2' })}
        </span>
        <span className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'font-black')}>
          {t('dealRow.amount', { amount: '$142,000' }, { defaultValue: '{{amount}}' })}
        </span>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] text-on-surface-variant uppercase tracking-wider',
          )}
        >
          {t('dealRow.stage', {}, { defaultValue: 'Discovery' })}
        </span>
        <div
          className={cm.cn(
            cm.h(1),
            cm.flex1,
            'bg-surface-container-high rounded-full overflow-hidden',
          )}
        >
          <div className={cm.cn(cm.h('full'), 'bg-primary w-1/4')}></div>
        </div>
      </div>
    </button>
  )
}
export { DealRow }
