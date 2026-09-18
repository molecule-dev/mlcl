import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

type TagRow = { id?: string | number }

export default function TagsStatsRow({ tags }: { tags: TagRow[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-3')}>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between' }),
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-xl shadow-sm border border-border',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 2))}>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-foreground-secondary',
            )}
          >
            {t('tagsStatsRow.totalTags', {}, { defaultValue: 'Total Tags' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(8),
              cm.h(8),
              'rounded-lg bg-indigo-50 text-indigo-600',
            )}
          >
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>sell</span>
          </div>
        </div>
        <div>
          <div className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'text-foreground')}>
            {tags.length}
          </div>
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-foreground-tertiary')}>
            {t(
              'tagsStatsRow.growthRate',
              { rate: '+12%' },
              { defaultValue: 'Growth {{rate}} this month' },
            )}
          </p>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between' }),
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-xl shadow-sm border border-border',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 2))}>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-foreground-secondary',
            )}
          >
            {t('tagsStatsRow.taggedPosts', {}, { defaultValue: 'Tagged Posts' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(8),
              cm.h(8),
              'rounded-lg bg-success-light text-success',
            )}
          >
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>article</span>
          </div>
        </div>
        <div>
          <div className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'text-foreground')}>
            47
          </div>
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-foreground-tertiary')}>
            {t('tagsStatsRow.taggedPostsSubtitle', {}, { defaultValue: 'Across all categories' })}
          </p>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between' }),
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-xl shadow-sm border border-border',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 2))}>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-foreground-secondary',
            )}
          >
            {t('tagsStatsRow.mostUsed', {}, { defaultValue: 'Most Used' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(8),
              cm.h(8),
              'rounded-lg bg-warning-light text-warning',
            )}
          >
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
              trending_up
            </span>
          </div>
        </div>
        <div>
          <div className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'text-foreground')}>
            15
          </div>
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-foreground-tertiary')}>
            {t(
              'tagsStatsRow.mostUsedSubtitle',
              { tag: 'programming' },
              { defaultValue: '{{tag}} used most often' },
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
export { TagsStatsRow }
