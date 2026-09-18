import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useDashboardStats } from '../lib/useDashboardStats.js'

/**
 * "Curated for You" card on the dashboard.
 *
 * The CTA used to link to a non-existent /ai-track route and the body
 * pretended a real recommendation engine was in play. We don't ship
 * a recommender, so the copy now describes the user's actual state
 * (no enrollments yet → "browse the catalog"; some enrollments →
 * "keep going") and the CTA navigates to the courses page.
 */
function AiRecommendationCard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const cm = getClassMap()
  const { stats } = useDashboardStats()
  const isNewLearner = !stats || stats.activeCourses === 0
  const description = isNewLearner
    ? t(
        'aiRecommendationCard.descriptionNew',
        {},
        {
          defaultValue:
            'Browse the course catalog to find a topic that matches your goals — your dashboard fills in as you enroll.',
        },
      )
    : t(
        'aiRecommendationCard.descriptionContinue',
        { courses: stats?.activeCourses ?? 0 },
        {
          defaultValue:
            "You're enrolled in {{courses}} course(s). Keep your streak by completing a lesson today.",
        },
      )
  const ctaLabel = isNewLearner
    ? t('aiRecommendationCard.ctaBrowse', {}, { defaultValue: 'Browse Courses' })
    : t('aiRecommendationCard.ctaContinue', {}, { defaultValue: 'Open My Courses' })
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'bg-tertiary-container text-on-tertiary-container rounded-2xl shadow-sm relative overflow-hidden group',
      )}
      data-mol-id="ai-recommendation-card"
    >
      <div className={cm.cn('relative z-10')}>
        <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 4), 'space-x-2')}>
          <span className={cm.cn('material-symbols-outlined')} data-icon="auto_awesome">
            auto_awesome
          </span>
          <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'font-headline')}>
            {t('aiRecommendationCard.title', {}, { defaultValue: 'Curated for You' })}
          </h3>
        </div>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 6), 'opacity-90')}>{description}</p>
        <button
          className={cm.cn(
            cm.w('full'),
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'py-2.5 bg-surface/20 backdrop-blur-md rounded-xl hover:bg-surface/30 transition-all border border-surface/10',
          )}
          data-mol-id="btn-ai-recommendation"
          onClick={() => navigate('/courses')}
        >
          {ctaLabel}
        </button>
      </div>
      <div className={cm.cn('absolute -right-4 -bottom-4 text-[100px] opacity-10 rotate-12')}>
        <span className={cm.cn('material-symbols-outlined')} data-icon="psychology">
          psychology
        </span>
      </div>
    </section>
  )
}

export default AiRecommendationCard
export { AiRecommendationCard }
