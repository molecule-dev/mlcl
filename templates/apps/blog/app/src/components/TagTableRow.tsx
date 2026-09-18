import { useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
export default function TagTableRow() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await http.delete('/api/tags/technology')
      setIsVisible(false)
    } finally {
      setIsDeleting(false)
    }
  }
  return (
    <tr className={cm.cn('hover:bg-surface-secondary/80 transition-colors group')}>
      <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 4))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <div className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-indigo-500')}></div>
          <span className={cm.cn(cm.fontWeight('semibold'), 'text-foreground')}>
            {t('tagTableRow.name', { name: 'technology' }, { defaultValue: '{{name}}' })}
          </span>
        </div>
      </td>
      <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 4))}>
        <code className={cm.cn(cm.textSize('xs'), 'font-mono text-foreground-secondary')}>
          {t('tagTableRow.permalink', { slug: 'technology' }, { defaultValue: '/tag/{{slug}}' })}
        </code>
      </td>
      <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 4))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.w(6),
              'text-foreground',
            )}
          >
            {t('tagTableRow.postCount', { count: 12 }, { defaultValue: '{{count}}' })}
          </span>
          <div
            className={cm.cn(
              cm.roundedFull,
              cm.w(24),
              cm.h(1.5),
              'bg-surface-secondary overflow-hidden',
            )}
          >
            <div className={cm.cn(cm.roundedFull, cm.h('full'), 'bg-indigo-500 w-[80%]')}></div>
          </div>
        </div>
      </td>
      <td
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 4),
          cm.textSize('sm'),
          'text-foreground-secondary',
        )}
      >
        {t('tagTableRow.lastUsed', { count: 2 }, { defaultValue: '{{count}} days ago' })}
      </td>
      <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 4), cm.textRight)}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'end', gap: 'sm' }),
            'opacity-0 group-hover:opacity-100 transition-opacity',
          )}
        >
          <Link className={cm.fv1b5883b2} to="/posts/new">
            <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>edit</span>
          </Link>
          <button
            className={cm.cn(
              cm.sp('p', 2),
              'text-foreground-tertiary hover:text-error hover:bg-error-light rounded-lg transition-all',
            )}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>delete</span>
          </button>
        </div>
      </td>
    </tr>
  )
}
export { TagTableRow }
