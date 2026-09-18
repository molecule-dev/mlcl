import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageMeta } from '../components/PageMeta.js'
import { tagCounts, tagPath } from '../content.js'

/** Every tag with its post count, at `/tags/`. */
export function Tags() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const title = t('tags.title', undefined, { defaultValue: 'Tags' })
  const tags = tagCounts()

  return (
    <div className={cm.cn(cm.container({ size: 'md' }), cm.sp('py', 8))} data-mol-id="tags-page">
      <PageMeta
        title={title}
        description={t('tags.description', undefined, { defaultValue: 'Every tag on this site.' })}
      />
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('pb', 6))}>{title}</h1>
      <ul className={cm.flex({ wrap: 'wrap', gap: 3 })} data-mol-id="tag-list">
        {tags.map(({ tag, count }) => (
          <li key={tag}>
            <Link
              className={cm.badge({ variant: 'secondary' })}
              to={tagPath(tag)}
              data-mol-id={`tag-${tag}`}
            >
              {tag}{' '}
              <span className={cm.textMuted}>
                {t('tags.count', { count }, { defaultValue: '({{count}})' })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
