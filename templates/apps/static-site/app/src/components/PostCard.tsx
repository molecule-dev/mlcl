import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type Post, postPath } from '../content.js'
import { PostDate } from './PostDate.js'
import { TagList } from './TagList.js'

/** One post in a list: title, date, reading time, description, tags. */
export function PostCard({ post }: { post: Post }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    // No card chrome (background/border/shadow): a reading list is type on the
    // page, not a stack of boxes — the list's gap provides the separation.
    <article data-mol-id={`post-card-${post.slug}`}>
      <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'))}>
        <Link className={cm.link} to={postPath(post.slug)}>
          {post.title}
        </Link>
      </h2>
      <p className={cm.cn(cm.sp('pt', 1), cm.textMuted, cm.textSize('sm'))}>
        <PostDate date={post.date} />
        {' · '}
        {t(
          'post.readingTime',
          { minutes: post.readingMinutes },
          { defaultValue: '{{minutes}} min read' },
        )}
      </p>
      <p className={cm.sp('pt', 2)}>{post.description}</p>
      <div className={cm.sp('pt', 3)}>
        <TagList tags={post.tags} />
      </div>
    </article>
  )
}
