import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function ActivityRow() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('p', 4),
        'bg-surface/50 hover:bg-surface-container-lowest rounded-2xl transition-all group',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'bg-surface-container overflow-hidden',
          )}
        >
          <img
            className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
            alt=""
            data-alt="minimalist logo of a high-end grocery store with green organic font on a white background"
            src="https://picsum.photos/seed/ActivityRow-1/1200/800"
          />
        </div>
        <div>
          <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
            {t('activityRow.merchantName', {}, { defaultValue: 'Whole Foods' })}
          </p>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'mt-0.5')}>
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.roundedFull,
                cm.fontWeight('bold'),
                'text-[10px] py-0.5 bg-surface-secondary text-foreground-secondary uppercase tracking-tighter',
              )}
            >
              {t('activityRow.category', {}, { defaultValue: 'Groceries' })}
            </span>
            <span
              className={cm.cn(cm.fontWeight('medium'), 'text-[10px] text-foreground-tertiary')}
            >
              {t(
                'status.today',
                { date: t('common.today', {}, { defaultValue: 'Today' }), time: '10:45 AM' },
                { defaultValue: '{{date}}, {{time}}' },
              )}
            </span>
          </div>
        </div>
      </div>
      <span className={cm.cn(cm.fontWeight('bold'), 'font-manrope text-on-surface')}>
        {t('activityRow.amount', { amount: '82.50' }, { defaultValue: '-${{amount}}' })}
      </span>
    </div>
  )
}
export default ActivityRow
