/**
 * Category bubble — round emoji/icon tile with title + course count
 * underneath. Used in the Landing page's "Explore the Archive" strip.
 *
 * Pattern translated from blog-style editorial category chips into
 * the Lectura purple/gold palette.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type CategoryBubbleProps = {
  emoji: string
  label: string
  courseCount: number
  to?: string
}

export function CategoryBubble({ emoji, label, courseCount, to = '/browse' }: CategoryBubbleProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Link
      to={to}
      data-mol-id={`category-${label.toLowerCase()}`}
      className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 4 }), 'group')}
    >
      <div
        className={cm.cn(
          cm.w(20),
          cm.h(20),
          cm.flex({ align: 'center', justify: 'center' }),
          'bg-surface-container-lowest rounded-full text-3xl shadow-sm group-hover:shadow-[0px_12px_32px_rgba(75,8,201,0.12)] group-hover:-translate-y-1 transition-all',
        )}
        aria-hidden="true"
      >
        {emoji}
      </div>
      <div className={cm.cn('text-center')}>
        <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-on-surface')}>
          {label}
        </h3>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'categoryBubble.courses',
            { count: courseCount },
            { defaultValue: '{{count}} courses' },
          )}
        </p>
      </div>
    </Link>
  )
}

export default CategoryBubble
