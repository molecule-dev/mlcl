import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Article {
  id: string
  title: string
  body?: string
  category?: string
  tag?: string
  created_at?: string
  updated_at?: string
  views?: number
}

type TranslateFn = (
  key: string,
  values?: Record<string, string | number | boolean>,
  options?: { defaultValue?: string },
) => string

function formatRelativeTime(dateStr: string, t: TranslateFn): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return t('common.justNow', {}, { defaultValue: 'just now' })
  if (diffMin < 60)
    return t(
      'knowledgeArticleItem.minutesAgo',
      { count: diffMin },
      { defaultValue: '{{count}}m ago' },
    )
  const diffHr = Math.floor(diffMs / 3600000)
  if (diffHr < 24)
    return t('knowledgeArticleItem.hoursAgo', { count: diffHr }, { defaultValue: '{{count}}h ago' })
  return t(
    'knowledgeArticleItem.daysAgo',
    { count: Math.floor(diffMs / 86400000) },
    { defaultValue: '{{count}}d ago' },
  )
}

function formatViewCount(views: number, t: TranslateFn): string {
  if (views >= 1000) {
    return t(
      'knowledgeArticleItem.viewCountCompact',
      { count: (views / 1000).toFixed(1) },
      { defaultValue: '{{count}}k' },
    )
  }
  return String(views)
}

function KnowledgeArticleItem({ article }: { article: Article }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const dateStr = article.updated_at || article.created_at
  const timeAgo = dateStr ? formatRelativeTime(dateStr, t) : ''
  const tag =
    article.tag ??
    article.category ??
    t('knowledgeArticleItem.defaultCategory', {}, { defaultValue: 'general' })
  const viewsLabel =
    article.views != null
      ? formatViewCount(article.views, t)
      : t('knowledgeArticleItem.noViews', {}, { defaultValue: '—' })

  return (
    <Link to={'/knowledge-base/articles/' + article.id} className={cm.cn('contents')}>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('p', 5),
          'group bg-surface-container-lowest hover:bg-primary-fixed/30 rounded-2xl transition-all duration-200 border border-outline-variant/10',
        )}
        data-mol-id="article-1"
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), cm.flex1)}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              cm.shrink0,
              'bg-surface-secondary text-foreground-tertiary group-hover:text-primary transition-colors',
            )}
            data-mol-id="article-icon-1"
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="description">
              description
            </span>
          </div>
          <div>
            <h5
              className={cm.cn(
                cm.textSize('base'),
                cm.fontWeight('semibold'),
                cm.sp('mb', 1),
                'text-on-surface group-hover:text-primary transition-colors',
              )}
              data-mol-id="article-title-1"
            >
              {article.title}
            </h5>
            <div
              className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}
              data-mol-id="article-meta-1"
            >
              <span
                className={cm.cn(
                  cm.roundedFull,
                  cm.fontWeight('bold'),
                  'px-2.5 py-0.5 bg-primary-fixed text-on-primary-fixed-variant text-[10px] uppercase tracking-wider',
                )}
                data-mol-id="article-tag-1"
              >
                {tag.replace(/_/g, ' ')}
              </span>
              {timeAgo && (
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.flex({ align: 'center', gap: 1 }),
                    'text-on-surface-variant',
                  )}
                  data-mol-id="article-time-1"
                >
                  <span
                    className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}
                    data-icon="schedule"
                  >
                    schedule
                  </span>
                  {timeAgo}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 10 }))} data-mol-id="article-stats-1">
          {article.views != null && (
            <div className={cm.textRight} data-mol-id="article-views-1">
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
                {viewsLabel}
              </p>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] text-on-surface-variant uppercase tracking-tighter',
                )}
              >
                {t('knowledgeArticleItem.viewsLabel', {}, { defaultValue: 'Views' })}
              </p>
            </div>
          )}
          <span
            className={cm.cn(
              'material-symbols-outlined text-outline transition-transform group-hover:translate-x-1',
            )}
            data-icon="chevron_right"
          >
            chevron_right
          </span>
        </div>
      </div>
    </Link>
  )
}
export default KnowledgeArticleItem
export { KnowledgeArticleItem }
