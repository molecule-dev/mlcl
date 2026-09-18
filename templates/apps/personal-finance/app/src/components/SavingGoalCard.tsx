import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SavingGoalCard() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const navigate = useNavigate()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'rounded-2xl text-white relative overflow-hidden group hover:shadow-2xl hover:shadow-on-surface/5 transition-all bg-gradient-to-br from-sky-600 to-sky-800',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'text-[10px] uppercase tracking-widest text-white/60',
          )}
        >
          {t('savingGoalCard.type', {}, { defaultValue: 'Saving Goal' })}
        </p>
        <h4
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('lg'),
            cm.sp('mb', 6),
            'font-headline',
          )}
        >
          {t(
            'savingGoalCard.title',
            { title: 'European Summer Trip' },
            { defaultValue: '{{title}}' },
          )}
        </h4>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'end' }), cm.sp('mb', 2))}>
          <span
            className={cm.cn(cm.textSize('3xl'), 'font-headline font-extrabold tracking-tight')}
          >
            {t('savingGoalCard.saved', { amount: '$8,400' }, { defaultValue: '{{amount}}' })}
          </span>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-white/80')}>
            {t(
              'savingGoalCard.target',
              { amount: '$12,000' },
              { defaultValue: 'Target: {{amount}}' },
            )}
          </span>
        </div>
        <div
          className={cm.cn(cm.w('full'), cm.h(2), cm.roundedFull, 'bg-surface/20 overflow-hidden')}
        >
          <div
            className={cm.cn(cm.h('full'), cm.roundedFull, 'bg-surface')}
            style={{ width: '70%' }}
          ></div>
        </div>
        <button
          type="button"
          className={cm.cn(
            cm.sp('mt', 8),
            cm.w('full'),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'bg-surface text-sky-700 font-headline rounded-xl active:scale-95 transition-transform',
          )}
          onClick={() => navigate('/goals')}
        >
          {t('savingGoalCard.addContribution', {}, { defaultValue: 'Add Contribution' })}
        </button>
      </div>
      {/* Decorative background */}
      <div
        className={cm.cn(
          cm.w(40),
          cm.h(40),
          cm.roundedFull,
          'absolute -top-10 -right-10 bg-surface/10 blur-2xl group-hover:scale-110 transition-transform duration-700',
        )}
      ></div>
    </div>
  )
}

export default SavingGoalCard
export { SavingGoalCard }
