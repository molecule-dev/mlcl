import { useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageMeta } from '../components/PageMeta.js'
import { PostCard } from '../components/PostCard.js'
import { postsWithTag } from '../content.js'
import { NotFound } from './NotFound.js'

/** The posts carrying one tag, at `/tags/<tag>/`. An unknown tag is a 404. */
export function Tag() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { tag = '' } = useParams<{ tag: string }>()
  const list = postsWithTag(tag)
  if (list.length === 0) return <NotFound />
  const title = t('tag.title', { tag }, { defaultValue: 'Posts tagged {{tag}}' })

  return (
    <div className={cm.cn(cm.container({ size: 'md' }), cm.sp('py', 8))} data-mol-id="tag-page">
      <PageMeta
        title={title}
        description={t(
          'tag.description',
          { tag, count: list.length },
          { defaultValue: '{{count}} posts tagged {{tag}}.' },
        )}
      />
      <h1
        className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('pb', 6))}
        data-mol-id="tag-title"
      >
        {title}
      </h1>
      <ol className={cm.flex({ direction: 'col', gap: 6 })} data-mol-id="post-list">
        {list.map((post) => (
          <li key={post.slug}>
            <PostCard post={post} />
          </li>
        ))}
      </ol>
    </div>
  )
}
