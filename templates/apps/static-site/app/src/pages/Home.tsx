import { useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_DESCRIPTION } from '../branding.js'
import { PageMeta } from '../components/PageMeta.js'
import { Pagination } from '../components/Pagination.js'
import { PostCard } from '../components/PostCard.js'
import { pageCount, posts, postsOnPage } from '../content.js'
import { NotFound } from './NotFound.js'

/**
 * The index: the newest posts, PAGE_SIZE per page. `/` is page 1 and
 * `/page/<n>/` the rest; a page past the end is a 404.
 */
export function Home() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const params = useParams<{ page?: string }>()
  const page = params.page ? Number.parseInt(params.page, 10) : 1
  const pages = pageCount(posts)
  if (!Number.isInteger(page) || page < 1 || page > pages) return <NotFound />
  const list = postsOnPage(posts, page)

  return (
    <div className={cm.cn(cm.container({ size: 'md' }), cm.sp('py', 8))} data-mol-id="home-page">
      <PageMeta
        title={page > 1 ? t('home.pageTitle', { page }, { defaultValue: 'Page {{page}}' }) : ''}
        description={APP_DESCRIPTION}
      />
      {/* No site-name h1: the site header above already carries the name —
          repeating it here pushed every list down. The tagline stays. */}
      <p className={cm.cn(cm.sp('pb', 8), cm.textMuted)}>
        {t('home.tagline', undefined, { defaultValue: APP_DESCRIPTION })}
      </p>
      <ol className={cm.flex({ direction: 'col', gap: 6 })} data-mol-id="post-list">
        {list.map((post) => (
          <li key={post.slug}>
            <PostCard post={post} />
          </li>
        ))}
      </ol>
      <Pagination page={page} pages={pages} />
    </div>
  )
}
