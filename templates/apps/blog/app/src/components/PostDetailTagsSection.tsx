import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { tagsArray, usePost } from './PostContext.js'

function PostDetailTagsSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { post } = usePost()
  const tags = tagsArray(post)
  if (tags.length === 0) return null
  return (
    <div
      data-mol-id="post-tags"
      className={cm.cn(
        cm.flex({ wrap: 'wrap', gap: 'sm' }),
        cm.sp('mt', 16),
        cm.sp('pb', 12),
        'border-b border-outline-variant/20',
      )}
    >
      {tags.map((tag) => (
        <Link
          key={tag}
          to={`/tags?q=${encodeURIComponent(tag)}`}
          data-mol-id="post-tag"
          className={cm.cn(
            cm.sp('px', 4),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            cm.cursorPointer,
            'bg-surface-container-highest py-1.5 font-label text-on-surface-variant hover:bg-surface-container-high transition-colors',
          )}
        >
          {t('postDetailTagsSection.tag', { name: tag }, { defaultValue: '{{name}}' })}
        </Link>
      ))}
    </div>
  )
}

export default PostDetailTagsSection
export { PostDetailTagsSection }
