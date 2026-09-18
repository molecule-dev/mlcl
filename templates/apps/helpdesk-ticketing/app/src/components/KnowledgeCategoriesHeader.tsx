import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function KnowledgeCategoriesHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(cm.flex({ align: 'end', justify: 'between' }))}
      data-mol-id="categories-header"
    >
      <div>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.sp('mb', 1),
            'text-secondary uppercase tracking-widest',
          )}
          data-mol-id="cat-pre"
        >
          {t('knowledgeCategoriesHeader.eyebrow', {}, { defaultValue: 'Browse by topic' })}
        </p>
        <h3
          className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-on-surface')}
          data-mol-id="cat-title"
        >
          {t('knowledgeCategoriesHeader.heading', {}, { defaultValue: 'Help Categories' })}
        </h3>
      </div>
      <Link
        className={cm.cn(
          cm.textPrimary,
          cm.fontWeight('semibold'),
          cm.flex({ align: 'center', gap: 1 }),
          'hover:underline',
        )}
        data-mol-id="cat-view-all"
        to="/knowledge-base"
      >
        {t('knowledgeCategoriesHeader.viewAll', {}, { defaultValue: 'View all categories' })}{' '}
        <span
          className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
          data-icon="arrow_forward"
        >
          arrow_forward
        </span>
      </Link>
    </div>
  )
}

export default KnowledgeCategoriesHeader
export { KnowledgeCategoriesHeader }
