import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { pagePath } from '../content.js'

/** Newer / older links under an index page, with the page position. */
export function Pagination({ page, pages }: { page: number; pages: number }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  if (pages <= 1) return null
  return (
    <nav
      className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 4 }), cm.sp('pt', 8))}
      aria-label={t('pagination.label', undefined, { defaultValue: 'Pages' })}
      data-mol-id="pagination"
    >
      {page > 1 ? (
        <Link className={cm.link} to={pagePath(page - 1)} data-mol-id="pagination-newer">
          {t('pagination.newer', undefined, { defaultValue: 'Newer posts' })}
        </Link>
      ) : (
        <span />
      )}
      <span className={cm.cn(cm.textMuted, cm.textSize('sm'))} data-mol-id="pagination-position">
        {t('pagination.position', { page, pages }, { defaultValue: 'Page {{page}} of {{pages}}' })}
      </span>
      {page < pages ? (
        <Link className={cm.link} to={pagePath(page + 1)} data-mol-id="pagination-older">
          {t('pagination.older', undefined, { defaultValue: 'Older posts' })}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}
