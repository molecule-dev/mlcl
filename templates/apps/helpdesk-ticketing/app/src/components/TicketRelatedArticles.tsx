import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function TicketRelatedArticles({
  articles,
}: {
  articles: Array<{ id: string; title: string; excerpt: string }>
}) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        cm.stack(4),
        'bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/10',
      )}
    >
      <h3
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          cm.flex({ align: 'center', gap: 2 }),
          'text-on-surface',
        )}
      >
        <span
          className={cm.cn(cm.textPrimary, 'material-symbols-outlined text-[20px]')}
          data-icon="lightbulb"
        >
          lightbulb
        </span>
        {t('ticketRelatedArticles.heading', {}, { defaultValue: 'Related Articles' })}
      </h3>
      <div className={cm.stack(3)}>
        {articles.length === 0 ? (
          <div className={cm.cn(cm.sp('p', 3), cm.textSize('xs'), 'text-outline')}>
            {t('ticketRelatedArticles.empty', {}, { defaultValue: 'No related articles.' })}
          </div>
        ) : (
          articles.map((article) => (
            <Link
              key={article.id}
              className={cm.cn(
                cm.sp('p', 3),
                'group block rounded-2xl bg-surface hover:bg-surface-container transition-all',
              )}
              data-mol-id={`kb-link-${article.id}`}
              to={`/knowledge-base/${article.id}`}
            >
              <div
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-on-surface group-hover:text-primary transition-colors',
                )}
              >
                {article.title}
              </div>
              <div className={cm.cn(cm.sp('mt', 1), 'text-[10px] text-outline line-clamp-1')}>
                {article.excerpt}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

export default TicketRelatedArticles
export { TicketRelatedArticles }
