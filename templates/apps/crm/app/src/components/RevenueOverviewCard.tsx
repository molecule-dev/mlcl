import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function RevenueOverviewCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-3xl architectural-shadow',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 8))}>
        <h3
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'tracking-wider text-on-surface uppercase opacity-80',
          )}
        >
          {t('revenueOverviewCard.title', {}, { defaultValue: 'Revenue Overview' })}
        </h3>
        <div className={cm.cn(cm.flex(), 'gap-4')}>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
            <div className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-primary')}></div>
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('revenueOverviewCard.projected', {}, { defaultValue: 'Projected' })}
            </span>
          </div>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.h(64),
          cm.flex({ align: 'end', justify: 'between' }),
          cm.sp('px', 2),
          'gap-4',
        )}
      >
        <div
          className={cm.cn(
            cm.flex1,
            'bg-surface-container-low rounded-t-lg relative group h-[40%]',
          )}
        >
          <div
            className={cm.cn(
              'h-[80%]',
              'absolute inset-x-0 bottom-0 bg-primary opacity-20 rounded-t-lg transition-all group-hover:opacity-40',
            )}
          ></div>
          <span
            className={cm.cn(
              cm.fontWeight('medium'),
              'absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-outline',
            )}
          >
            {t('common.monthShortJan', {}, { defaultValue: 'JAN' })}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex1,
            'bg-surface-container-low rounded-t-lg relative group h-[55%]',
          )}
        >
          <div
            className={cm.cn(
              'h-[90%]',
              'absolute inset-x-0 bottom-0 bg-primary opacity-20 rounded-t-lg transition-all group-hover:opacity-40',
            )}
          ></div>
          <span
            className={cm.cn(
              cm.fontWeight('medium'),
              'absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-outline',
            )}
          >
            {t('common.monthShortFeb', {}, { defaultValue: 'FEB' })}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex1,
            'bg-surface-container-low rounded-t-lg relative group h-[45%]',
          )}
        >
          <div
            className={cm.cn(
              'h-[70%]',
              'absolute inset-x-0 bottom-0 bg-primary opacity-20 rounded-t-lg transition-all group-hover:opacity-40',
            )}
          ></div>
          <span
            className={cm.cn(
              cm.fontWeight('medium'),
              'absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-outline',
            )}
          >
            {t('common.monthShortMar', {}, { defaultValue: 'MAR' })}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex1,
            'bg-surface-container-low rounded-t-lg relative group h-[70%]',
          )}
        >
          <div
            className={cm.cn(
              'h-[95%]',
              'absolute inset-x-0 bottom-0 bg-primary opacity-20 rounded-t-lg transition-all group-hover:opacity-40',
            )}
          ></div>
          <span
            className={cm.cn(
              cm.fontWeight('medium'),
              'absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-outline',
            )}
          >
            {t('common.monthShortApr', {}, { defaultValue: 'APR' })}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex1,
            'bg-surface-container-low rounded-t-lg relative group h-[85%]',
          )}
        >
          <div
            className={cm.cn('h-[100%]', 'absolute inset-x-0 bottom-0 bg-primary rounded-t-lg')}
          ></div>
          <span
            className={cm.cn(
              cm.fontWeight('medium'),
              'absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-outline',
            )}
          >
            {t('common.monthShortMay', {}, { defaultValue: 'MAY' })}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex1,
            'bg-surface-container-low rounded-t-lg relative group h-[65%]',
          )}
        >
          <div
            className={cm.cn(
              'h-[85%]',
              'absolute inset-x-0 bottom-0 bg-primary opacity-20 rounded-t-lg transition-all group-hover:opacity-40',
            )}
          ></div>
          <span
            className={cm.cn(
              cm.fontWeight('medium'),
              'absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-outline',
            )}
          >
            {t('common.monthShortJun', {}, { defaultValue: 'JUN' })}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex1,
            'bg-surface-container-low rounded-t-lg relative group h-[75%]',
          )}
        >
          <div
            className={cm.cn(
              'h-[90%]',
              'absolute inset-x-0 bottom-0 bg-primary opacity-20 rounded-t-lg transition-all group-hover:opacity-40',
            )}
          ></div>
          <span
            className={cm.cn(
              cm.fontWeight('medium'),
              'absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-outline',
            )}
          >
            {t('common.monthShortJul', {}, { defaultValue: 'JUL' })}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex1,
            'bg-surface-container-low rounded-t-lg relative group h-[90%]',
          )}
        >
          <div
            className={cm.cn(
              'h-[100%]',
              'absolute inset-x-0 bottom-0 bg-primary opacity-20 rounded-t-lg transition-all group-hover:opacity-40',
            )}
          ></div>
          <span
            className={cm.cn(
              cm.fontWeight('medium'),
              'absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-outline',
            )}
          >
            {t('common.monthShortAug', {}, { defaultValue: 'AUG' })}
          </span>
        </div>
      </div>
    </section>
  )
}

export default RevenueOverviewCard
export { RevenueOverviewCard }
