import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AiInsightCard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-gradient-to-br from-secondary to-primary-container rounded-3xl text-white shadow-lg relative overflow-hidden',
      )}
    >
      <div className={cm.fv7a8ff926}>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest opacity-80',
          )}
        >
          {t('aiInsightCard.label', {}, { defaultValue: 'AI Insight' })}
        </p>
        <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
          {t(
            'aiInsightCard.headline',
            { company: 'BlueSky Inc' },
            { defaultValue: '{{company}} is likely to close this week.' },
          )}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'opacity-90')}>
          {t(
            'aiInsightCard.prediction',
            { probability: 85, days: 20 },
            {
              defaultValue:
                'Historical data suggests {{probability}}% probability of win after reaching Negotiation stage within {{days}} days.',
            },
          )}
        </p>
        <button
          className={cm.cn(
            cm.sp('mt', 4),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'bg-surface/20 hover:bg-surface/30 backdrop-blur-md rounded-lg transition-all',
          )}
          onClick={() => navigate('/predictions')}
        >
          {t('aiInsightCard.viewDetails', {}, { defaultValue: 'View Prediction Details' })}
        </button>
      </div>
      {/* Abstract glow */}
      <div
        className={cm.cn(
          cm.w(24),
          cm.h(24),
          cm.roundedFull,
          'absolute -right-4 -bottom-4 bg-surface/10 blur-3xl',
        )}
      ></div>
    </div>
  )
}

export default AiInsightCard
export { AiInsightCard }
