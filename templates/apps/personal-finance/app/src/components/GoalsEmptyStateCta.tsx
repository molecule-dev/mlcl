import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function GoalsEmptyStateCta({ onAddGoal }: { onAddGoal?: () => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 12),
        cm.textCenter,
        'bg-surface-container-low rounded-3xl relative overflow-hidden',
      )}
      data-mol-id="empty-state-cta"
    >
      <div className={cm.cn('relative z-10')}>
        <div
          className={cm.cn(
            cm.w(20),
            cm.h(20),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.mxAuto,
            cm.sp('mb', 6),
            'bg-surface shadow-sm',
          )}
        >
          <span
            className={cm.cn(cm.textSize('4xl'), 'material-symbols-outlined text-success')}
            data-icon="target"
          >
            ads_click
          </span>
        </div>
        <h3
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 3),
            'text-on-surface',
          )}
        >
          {t('goalsEmptyStateCta.heading', {}, { defaultValue: 'Set your first financial goal' })}
        </h3>
        <p className={cm.cn(cm.maxW('sm'), cm.mxAuto, cm.sp('mb', 8), 'text-on-surface-variant')}>
          {t(
            'goalsEmptyStateCta.description',
            {},
            {
              defaultValue:
                "Whether it's a dream home, a peaceful retirement, or a new venture, start planning your future today.",
            },
          )}
        </p>
        <button
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.sp('px', 8),
            cm.sp('py', 3),
            'bg-surface text-success rounded-xl border border-emerald-100 hover:bg-success-light transition-colors inline-flex items-center gap-2',
          )}
          onClick={onAddGoal}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="rocket_launch">
            rocket_launch
          </span>

          {t('goalsEmptyStateCta.cta', {}, { defaultValue: 'Get Started Now' })}
        </button>
      </div>
      {/* Abstract background graphic */}
      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -bottom-20 -right-20 bg-success-light/30 blur-3xl',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.w(60),
          cm.h(60),
          cm.roundedFull,
          'absolute -top-20 -left-20 bg-secondary-fixed/20 blur-3xl',
        )}
      ></div>
    </section>
  )
}

export default GoalsEmptyStateCta
export { GoalsEmptyStateCta }
