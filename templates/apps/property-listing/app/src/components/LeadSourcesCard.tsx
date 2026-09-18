import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface LeadSource {
  source: string
  count: number
  percentage: number
}

const SOURCE_COLORS = [
  'bg-primary-container',
  'bg-primary',
  'bg-secondary-container',
  'bg-primary-fixed',
  'bg-secondary',
]

export default function LeadSourcesCard({
  leadsCount = 84,
  sources,
}: {
  leadsCount?: number
  sources?: LeadSource[]
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const displaySources = sources ?? [
    {
      source: t('leadSourcesCard.source.portal', {}, { defaultValue: 'Portal' }),
      count: 34,
      percentage: 45,
    },
    {
      source: t('leadSourcesCard.source.referral', {}, { defaultValue: 'Referral' }),
      count: 27,
      percentage: 30,
    },
    {
      source: t('leadSourcesCard.source.social', {}, { defaultValue: 'Social' }),
      count: 23,
      percentage: 25,
    },
  ]
  return (
    <div
      className={cm.cn(
        'bg-surface-container-lowest rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow',
        cm.flex({ direction: 'col' }),
        cm.sp('p', 6),
      )}
      data-mol-id="lead_sources_card"
    >
      <h3
        className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-success', cm.sp('mb', 8))}
      >
        {t('leadSourcesCard.title', {}, { defaultValue: 'Lead Sources' })}
      </h3>
      <div
        className={cm.cn(
          'relative',
          cm.flex1,
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        )}
      >
        <div
          className={cm.cn(
            cm.w(48),
            cm.h(48),
            cm.roundedFull,
            'border-[18px] border-primary-container border-r-secondary-container border-b-primary relative',
            cm.flex({ align: 'center', justify: 'center' }),
          )}
        >
          <div className={cm.textCenter}>
            <span
              className={cm.cn(
                'block',
                cm.textSize('3xl'),
                'font-extrabold text-success tracking-tighter',
              )}
            >
              {leadsCount}
            </span>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-wider text-on-surface-variant',
                cm.fontWeight('semibold'),
              )}
            >
              {t('leadSourcesCard.leadsLabel', {}, { defaultValue: 'Leads' })}
            </span>
          </div>
        </div>
        <div className={cm.cn(cm.sp('mt', 8), cm.grid({ cols: 1, gap: 'md' }), 'w-full')}>
          {displaySources.map((s, i) => (
            <div
              key={s.source}
              className={cm.cn(
                cm.flex({ justify: 'between', align: 'center' }),
                'bg-surface-container-low',
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.roundedFull,
              )}
            >
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.flex({ align: 'center', gap: 'sm' }),
                )}
              >
                <span
                  className={cm.cn(
                    cm.w(2),
                    cm.h(2),
                    cm.roundedFull,
                    SOURCE_COLORS[i % SOURCE_COLORS.length],
                  )}
                ></span>
                {s.source}
              </span>
              <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'))}>
                {t(
                  'leadSourcesCard.percentage',
                  { percentage: s.percentage },
                  { defaultValue: '{{percentage}}%' },
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
export { LeadSourcesCard }
