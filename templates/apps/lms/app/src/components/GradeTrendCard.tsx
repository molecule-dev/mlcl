import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function GradeTrendCard({ barData = [] }: { barData?: number[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('p', 6),
        'md:col-span-2 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 group',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <div>
          <h3
            className={cm.cn(
              'font-label text-on-surface-variant text-[10px] uppercase tracking-widest',
            )}
          >
            {t('gradeTrendCard.sectionLabel', {}, { defaultValue: 'PERFORMANCE TREND' })}
          </h3>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'font-headline',
            )}
          >
            {t('gradeTrendCard.title', {}, { defaultValue: 'Consistency Analysis' })}
          </p>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex1,
          cm.flex({ align: 'end', justify: 'between' }),
          cm.sp('pb', 2),
          'gap-2 min-h-[160px]',
        )}
      >
        {barData.length === 0 ? (
          <div
            className={cm.cn(
              cm.w('full'),
              cm.flex({ align: 'center', justify: 'center' }),
              'h-24 rounded-xl bg-primary/5 text-on-surface-variant text-xs',
            )}
            data-mol-id="grade-trend-empty"
          >
            {t(
              'gradeTrendCard.empty',
              {},
              { defaultValue: 'Submit assignments to see your performance trend.' },
            )}
          </div>
        ) : (
          <div
            className={cm.cn(
              cm.w('full'),
              cm.h(24),
              cm.flex({ align: 'end' }),
              cm.sp('px', 2),
              'bg-primary/5 rounded-xl relative overflow-hidden gap-1.5',
            )}
          >
            {barData.map((pct, i, arr) => (
              <div
                key={i}
                className={cm.cn(
                  'flex-1 rounded-t-sm transition-all duration-500',
                  i === arr.length - 1 ? 'bg-primary-container' : 'bg-primary/50',
                )}
                style={{ height: `${pct}%` }}
              />
            ))}
          </div>
        )}
      </div>
      {barData.length > 0 ? (
        <div
          className={cm.cn(
            cm.flex({ justify: 'between' }),
            cm.sp('mt', 4),
            cm.fontWeight('bold'),
            cm.sp('px', 2),
            'text-[10px] text-on-surface-variant uppercase tracking-widest',
          )}
        >
          <span>
            {t(
              'gradeTrendCard.assignmentLabel',
              { number: 1 },
              { defaultValue: 'Assignment {{number}}' },
            )}
          </span>
          <span>
            {t(
              'gradeTrendCard.assignmentLabel',
              { number: barData.length },
              { defaultValue: 'Assignment {{number}}' },
            )}
          </span>
        </div>
      ) : null}
    </div>
  )
}

export default GradeTrendCard
export { GradeTrendCard }
