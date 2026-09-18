import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function QuickActionsCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(cm.sp('p', 8), 'bg-surface-container-lowest rounded-xl editorial-shadow')}
      data-mol-id="dashboard-quick-actions"
    >
      <h3
        className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 6), 'font-headline')}
      >
        {t('quickActionsCard.title', {}, { defaultValue: 'Quick Actions' })}
      </h3>
      <div className={cm.cn(cm.stack(4))}>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            cm.sp('py', 3),
            cm.sp('px', 6),
            cm.fontWeight('bold'),
            'w-full bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-lg hover:scale-[0.98] transition-transform shadow-lg shadow-primary/20',
          )}
          data-mol-id="btn-new-post"
          to="/posts/new"
        >
          <span className={cm.fv5b245ffa} data-icon="add">
            add
          </span>
          {t('quickActionsCard.newPost', {}, { defaultValue: 'New Post' })}
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.fontWeight('medium'),
            'w-full bg-surface-container-low hover:bg-surface-container rounded-lg text-on-background transition-colors',
          )}
          data-mol-id="btn-view-drafts"
          to="/posts?status=draft"
        >
          <span className={cm.fv62d679ba} data-icon="drafts">
            drafts
          </span>
          {t('quickActionsCard.viewDrafts', {}, { defaultValue: 'View drafts' })}
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.fontWeight('medium'),
            'w-full bg-surface-container-low hover:bg-surface-container rounded-lg text-on-background transition-colors',
          )}
          data-mol-id="btn-view-analytics"
          to="/analytics"
        >
          <span className={cm.fv62d679ba} data-icon="bar_chart">
            bar_chart
          </span>
          {t('quickActionsCard.viewAnalytics', {}, { defaultValue: 'View analytics' })}
        </Link>
      </div>
    </div>
  )
}

export default QuickActionsCard
export { QuickActionsCard }
