import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface AgentAnalyticsHeaderProps {
  period: string
  onPeriodChange: (p: string) => void
}

function AgentAnalyticsHeader({ period, onPeriodChange }: AgentAnalyticsHeaderProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between', gap: 'lg' }),
        'md:flex-row md:items-end',
      )}
    >
      <div>
        <h2
          className={cm.cn(
            'text-5xl',
            cm.textPrimary,
            cm.sp('mb', 2),
            'font-extrabold tracking-tighter',
          )}
        >
          {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
        </h2>
        <p className={cm.cn(cm.fontWeight('medium'), 'text-on-surface-variant')}>
          {t(
            'agentAnalyticsHeader.subtitle',
            {},
            { defaultValue: 'Performance oversight for your portfolio.' },
          )}
        </p>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.roundedFull,
          'bg-surface-container-low p-1.5',
        )}
      >
        {[
          {
            key: '7D',
            label: t(
              'agentAnalyticsHeader.periodDays',
              { count: 7 },
              { defaultValue: '{{count}}D' },
            ),
          },
          {
            key: '30D',
            label: t(
              'agentAnalyticsHeader.periodDays',
              { count: 30 },
              { defaultValue: '{{count}}D' },
            ),
          },
          {
            key: '90D',
            label: t(
              'agentAnalyticsHeader.periodDays',
              { count: 90 },
              { defaultValue: '{{count}}D' },
            ),
          },
          {
            key: '1Y',
            label: t(
              'agentAnalyticsHeader.periodYears',
              { count: 1 },
              { defaultValue: '{{count}}Y' },
            ),
          },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onPeriodChange(key)}
            aria-pressed={period === key}
            className={
              period === key
                ? cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 2),
                    cm.roundedFull,
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'bg-surface-container-lowest text-primary-container shadow-sm',
                  )
                : cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 2),
                    cm.roundedFull,
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'text-on-surface-variant hover:bg-surface-container-high transition-colors',
                  )
            }
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  )
}

export default AgentAnalyticsHeader
export { AgentAnalyticsHeader }
