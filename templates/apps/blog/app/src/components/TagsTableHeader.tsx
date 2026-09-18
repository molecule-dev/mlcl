import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function TagsTableHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <thead>
      <tr className={cm.fv007c7f44}>
        <th
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-wider text-on-surface-variant',
          )}
        >
          {t('tagsTableHeader.tag', {}, { defaultValue: 'Tag' })}
        </th>
        <th
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-wider text-on-surface-variant',
          )}
        >
          {t('tagsTableHeader.slug', {}, { defaultValue: 'Slug' })}
        </th>
        <th
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-wider text-on-surface-variant',
          )}
        >
          {t('tagsTableHeader.posts', {}, { defaultValue: 'Posts' })}
        </th>
        <th
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-wider text-on-surface-variant',
          )}
        >
          {t('tagsTableHeader.created', {}, { defaultValue: 'Created' })}
        </th>
        <th
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.textRight,
            'uppercase tracking-wider text-on-surface-variant',
          )}
        >
          {t('nav.actions', {}, { defaultValue: 'Actions' })}
        </th>
      </tr>
    </thead>
  )
}

export default TagsTableHeader
export { TagsTableHeader }
