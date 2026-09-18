import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ReportsConversionRatesCard() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-3xl architectural-shadow overflow-hidden',
      )}
    >
      <h3
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          cm.sp('mb', 6),
          'tracking-wider text-on-surface uppercase opacity-80',
        )}
      >
        {t('reportsConversionRatesCard.title', {}, { defaultValue: 'Conversion Rates' })}
      </h3>
      <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), 'relative gap-1')}>
        {/* Funnel Steps */}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-full bg-primary/10 h-12 rounded-lg relative overflow-hidden',
          )}
        >
          <div className={cm.fv8d096321}></div>
          <span className={cm.cn(cm.fontWeight('bold'), 'relative z-10 text-[10px] text-primary')}>
            {t(
              'reportsConversionRatesCard.funnelLeads',
              { count: '2,400' },
              { defaultValue: 'LEADS: {{count}}' },
            )}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-[85%] bg-primary/10 h-12 rounded-lg relative overflow-hidden',
          )}
        >
          <div className={cm.fv8d096326}></div>
          <span className={cm.cn(cm.fontWeight('bold'), 'relative z-10 text-[10px] text-primary')}>
            {t(
              'reportsConversionRatesCard.funnelMqls',
              { count: '1,120', pct: '46%' },
              { defaultValue: 'MQLs: {{count}} ({{pct}})' },
            )}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-[65%] bg-primary/10 h-12 rounded-lg relative overflow-hidden',
          )}
        >
          <div className={cm.fv8d096340}></div>
          <span className={cm.cn(cm.fontWeight('bold'), 'relative z-10 text-[10px] text-primary')}>
            {t(
              'reportsConversionRatesCard.funnelSalesReady',
              { count: '480', pct: '20%' },
              { defaultValue: 'SALES READY: {{count}} ({{pct}})' },
            )}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-[40%] bg-primary/10 h-12 rounded-lg relative overflow-hidden',
          )}
        >
          <div className={cm.fv8d09635f}></div>
          <span className={cm.cn(cm.fontWeight('bold'), 'relative z-10 text-[10px] text-primary')}>
            {t(
              'reportsConversionRatesCard.funnelClosed',
              { count: '112', pct: '4.6%' },
              { defaultValue: 'CLOSED: {{count}} ({{pct}})' },
            )}
          </span>
        </div>
      </div>
      <div className={cm.cn(cm.flex({ justify: 'between' }), cm.sp('mt', 6), cm.sp('px', 2))}>
        <div className={cm.textCenter}>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t(
              'reportsConversionRatesCard.mqlToSqlRate',
              { rate: '42.9%' },
              { defaultValue: '{{rate}}' },
            )}
          </p>
          <p
            className={cm.cn(
              cm.fontWeight('semibold'),
              'text-[9px] uppercase tracking-tighter text-outline',
            )}
          >
            {t('reportsConversionRatesCard.mqlToSqlLabel', {}, { defaultValue: 'MQL to SQL' })}
          </p>
        </div>
        <div className={cm.textCenter}>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-secondary')}>
            {t(
              'reportsConversionRatesCard.sqlToWonRate',
              { rate: '23.3%' },
              { defaultValue: '{{rate}}' },
            )}
          </p>
          <p
            className={cm.cn(
              cm.fontWeight('semibold'),
              'text-[9px] uppercase tracking-tighter text-outline',
            )}
          >
            {t('reportsConversionRatesCard.sqlToWonLabel', {}, { defaultValue: 'SQL to Won' })}
          </p>
        </div>
      </div>
    </section>
  )
}

export default ReportsConversionRatesCard
export { ReportsConversionRatesCard }
