import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function NetWorthOverTimeCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <article
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'lg' }),
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl lg:col-span-1 group hover:shadow-2xl hover:shadow-on-surface/5 transition-all',
      )}
      data-mol-id="report-card-3"
    >
      <div className={cm.flex({ justify: 'between', align: 'start' })}>
        <div>
          <span
            className={cm.cn(
              cm.sp('mb', 1),
              cm.fontWeight('bold'),
              'text-[10px] tracking-[0.15em] uppercase text-outline block',
            )}
          >
            {t('netWorthOverTimeCard.category', {}, { defaultValue: 'Growth' })}
          </span>
          <h2
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'font-headline text-on-surface-variant group-hover:text-primary transition-colors',
            )}
          >
            {t('netWorthOverTimeCard.title', {}, { defaultValue: 'Net Worth Over Time' })}
          </h2>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.sp('py', 1),
            'text-[10px] uppercase tracking-wider',
            cm.fontWeight('bold'),
            cm.textPrimary,
            cm.roundedFull,
            'bg-primary/10',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>trending_up</span>
          {t('netWorthOverTimeCard.changeRate', { rate: '+12.4%' }, { defaultValue: '{{rate}}' })}
        </div>
      </div>
      <div
        className={cm.cn(cm.h(64), cm.w('full'), 'relative overflow-hidden')}
        data-mol-id="viz-3"
      >
        <svg className={cm.cn(cm.w('full'), cm.h('full'))} viewBox="0 0 400 150">
          <path
            className={cm.cn('fill-primary/5')}
            d="M0,130 C50,120 100,140 150,100 C200,60 250,80 300,40 C350,0 400,20 400,20 L400,150 L0,150 Z"
          ></path>
          <path
            className={cm.textPrimary}
            d="M0,130 C50,120 100,140 150,100 C200,60 250,80 300,40 C350,0 400,20 400,20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          ></path>
          <circle
            className={cm.cn('fill-white stroke-primary stroke-2')}
            cx="300"
            cy="40"
            r="4"
          ></circle>
        </svg>
        <div
          className={cm.cn(
            cm.w('full'),
            cm.flex({ justify: 'between' }),
            cm.sp('px', 2),
            cm.fontWeight('bold'),
            'absolute bottom-4 left-0 text-[10px] text-outline tracking-widest uppercase',
          )}
        >
          <span>{t('common.month.januaryShort', {}, { defaultValue: 'Jan' })}</span>
          <span>{t('common.month.februaryShort', {}, { defaultValue: 'Feb' })}</span>
          <span>{t('common.month.marchShort', {}, { defaultValue: 'Mar' })}</span>
          <span>{t('common.month.aprilShort', {}, { defaultValue: 'Apr' })}</span>
          <span>{t('common.month.mayShort', {}, { defaultValue: 'May' })}</span>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('pt', 4),
          'border-t border-surface-container-high mt-auto',
        )}
      >
        <p className={cm.cn(cm.textSize('xs'), 'text-outline italic')}>
          {t(
            'netWorthOverTimeCard.lastSync',
            { time: '2 hours ago' },
            { defaultValue: 'Last sync: {{time}}' },
          )}
        </p>
        <Link
          className={cm.cn(
            'text-primary font-bold text-sm tracking-tight hover:underline underline-offset-4',
          )}
          data-mol-id="link-details-3"
          to="/reports"
        >
          {t('common.viewDetails', {}, { defaultValue: 'View Details' })}
        </Link>
      </div>
    </article>
  )
}

export default NetWorthOverTimeCard
export { NetWorthOverTimeCard }
