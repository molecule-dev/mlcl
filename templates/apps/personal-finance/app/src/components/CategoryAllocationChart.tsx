import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function CategoryAllocationChart() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn('lg:col-span-2 bg-surface-container-low rounded-3xl', cm.sp('p', 8))}
      data-mol-id="spending-analysis"
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 8))}>
        <h3
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'font-headline text-on-surface',
          )}
        >
          {t('categoryAllocationChart.title', {}, { defaultValue: 'Category Allocation' })}
        </h3>
        <Link
          to="/reports"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.textPrimary,
            'hover:underline',
          )}
        >
          {t('categoryAllocationChart.viewAllInsights', {}, { defaultValue: 'View All Insights' })}
        </Link>
      </div>
      <div className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'sm:grid-cols-2 items-center')}>
        <div className={cm.cn('relative', cm.w(48), cm.h(48), cm.mxAuto)} data-mol-id="donut-chart">
          <svg className={cm.cn(cm.w('full'), cm.h('full'))} viewBox="0 0 36 36">
            <path
              className={cm.cn('stroke-primary-container fill-none')}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              strokeDasharray="100, 100"
              strokeWidth="4"
            ></path>
            <path
              className={cm.cn('stroke-secondary fill-none')}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              strokeDasharray="35, 100"
              strokeWidth="4"
            ></path>
            <path
              className={cm.cn('stroke-tertiary fill-none')}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              strokeDasharray="15, 100"
              strokeWidth="4"
            ></path>
          </svg>
          <div
            className={cm.cn(
              'absolute inset-0',
              cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
              cm.textCenter,
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-tighter text-foreground-tertiary',
              )}
            >
              {t('categoryAllocationChart.largestLabel', {}, { defaultValue: 'Largest' })}
            </span>
            <span
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                'font-headline text-on-surface',
              )}
            >
              {t('categoryAllocationChart.largestCategory', {}, { defaultValue: 'Housing' })}
            </span>
          </div>
        </div>
        <div className={cm.stack(4)}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('p', 4),
              'bg-surface/40 rounded-xl',
            )}
          >
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <div
                className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-primary-container')}
              ></div>
              <span className={cm.cn(cm.fontWeight('medium'), 'text-foreground')}>
                {t('categoryAllocationChart.essentialCategory', {}, { defaultValue: 'Essential' })}
              </span>
            </div>
            <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
              {t(
                'categoryAllocationChart.percentage',
                { value: 50 },
                { defaultValue: '{{value}}%' },
              )}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('p', 4),
              'bg-surface/40 rounded-xl',
            )}
          >
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <div className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-secondary')}></div>
              <span className={cm.cn(cm.fontWeight('medium'), 'text-foreground')}>
                {t('categoryAllocationChart.lifestyleCategory', {}, { defaultValue: 'Lifestyle' })}
              </span>
            </div>
            <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
              {t(
                'categoryAllocationChart.percentage',
                { value: 35 },
                { defaultValue: '{{value}}%' },
              )}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('p', 4),
              'bg-surface/40 rounded-xl',
            )}
          >
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <div className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-tertiary')}></div>
              <span className={cm.cn(cm.fontWeight('medium'), 'text-foreground')}>
                {t('categoryAllocationChart.otherCategory', {}, { defaultValue: 'Other' })}
              </span>
            </div>
            <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
              {t(
                'categoryAllocationChart.percentage',
                { value: 15 },
                { defaultValue: '{{value}}%' },
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CategoryAllocationChart
export { CategoryAllocationChart }
