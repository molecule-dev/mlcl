import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { tagPath } from '../content.js'

/** A post's tags as links to their tag pages. Renders nothing for no tags. */
export function TagList({ tags, center = false }: { tags: string[]; center?: boolean }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  if (tags.length === 0) return null
  return (
    <ul
      className={cm.flex({ wrap: 'wrap', gap: 2, justify: center ? 'center' : undefined })}
      aria-label={t('post.tags', undefined, { defaultValue: 'Tags' })}
      data-mol-id="post-tags"
    >
      {tags.map((tag) => (
        <li key={tag}>
          <Link className={cm.badge({ variant: 'secondary', size: 'sm' })} to={tagPath(tag)}>
            {tag}
          </Link>
        </li>
      ))}
    </ul>
  )
}
