import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function formatTimeAgo(
  dateStr: string,
  t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue: string }) => string,
): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return t('common.justNow', {}, { defaultValue: 'just now' })
  if (diffMin < 60)
    return t('common.minutesAgo', { count: diffMin }, { defaultValue: '{{count}}m ago' })
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24)
    return t('common.hoursAgo', { count: diffHours }, { defaultValue: '{{count}}h ago' })
  return t(
    'common.daysAgo',
    { count: Math.floor(diffHours / 24) },
    { defaultValue: '{{count}}d ago' },
  )
}

export default function DiscussionThreadCard({
  discussion,
}: {
  discussion: Record<string, unknown>
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const category = String(discussion.category ?? 'general')
  const CATEGORY_LABELS: Record<string, string> = {
    'project-help': t('categories.projectHelp', {}, { defaultValue: 'Project Help' }),
    qa: t('categories.qa', {}, { defaultValue: 'Q&A' }),
    general: t('categories.general', {}, { defaultValue: 'General' }),
    'off-topic': t('categories.offTopic', {}, { defaultValue: 'Off-topic' }),
  }
  const categoryLabel = CATEGORY_LABELS[category] ?? category
  const categoryTone: Record<string, string> = {
    'project-help': 'text-violet-700 dark:text-violet-300',
    qa: 'text-sky-700 dark:text-sky-300',
    general: 'text-warning',
    'off-topic': 'text-foreground-secondary',
  }
  const categoryClass = categoryTone[category] ?? 'text-primary'
  const dateStr = String(discussion.updatedAt ?? discussion.createdAt ?? '')
  const timeAgo = dateStr ? formatTimeAgo(dateStr, t) : ''
  return (
    <article
      className={cm.cn(
        cm.flex({ gap: 5 }),
        cm.sp('p', 6),
        cm.cursorPointer,
        'bg-surface-container-lowest rounded-2xl shadow-sm transition-all hover:scale-[1.01] hover:shadow-xl hover:shadow-on-surface/5 group relative',
      )}
    >
      <div
        className={cm.cn(cm.w(1), 'absolute left-0 top-0 bottom-0 bg-primary rounded-l-xl')}
      ></div>
      <img
        className={cm.cn(cm.w(12), cm.h(12), cm.roundedFull, cm.shrink0, 'object-cover')}
        src={String(
          discussion.authorAvatar ??
            `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
              String(discussion.authorId ?? discussion.authorName ?? discussion.id ?? 'student'),
            )}`,
        )}
        alt={String(discussion.authorName ?? '')}
      />
      <div className={cm.flex1}>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 1))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              categoryClass,
              'text-[10px] uppercase tracking-wider',
            )}
          >
            {categoryLabel}
          </span>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{timeAgo}</span>
        </div>
        <h3
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'text-on-surface leading-snug group-hover:text-primary transition-colors',
          )}
        >
          <Link
            to={`/discussions/${String(discussion.id ?? '')}`}
            className={cm.cn('after:absolute after:inset-0')}
          >
            {String(discussion.title ?? '')}
          </Link>
        </h3>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mb', 4),
            'text-on-surface-variant line-clamp-1 opacity-80',
          )}
        >
          {String(discussion.body ?? discussion.excerpt ?? '')}
        </p>
        <div className={cm.flex({ align: 'center', gap: 6 })}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-on-surface-variant',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon="forum">
              forum
            </span>
            {t(
              'discussionThreadCard.replies',
              { count: Number(discussion.replyCount ?? 0) },
              { defaultValue: '{{count}} replies' },
            )}
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-on-surface-variant',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon="person">
              person
            </span>
            {t(
              'discussionThreadCard.author',
              { name: String(discussion.authorName ?? '') },
              { defaultValue: '{{name}}' },
            )}
          </div>
        </div>
      </div>
      <div className={cm.flex({ direction: 'col', align: 'end', justify: 'center' })}>
        <div
          className={cm.cn(
            cm.roundedFull,
            cm.sp('mb', 2),
            'w-2.5 h-2.5 bg-primary shadow-glow shadow-primary/50',
          )}
        ></div>
      </div>
    </article>
  )
}
export { DiscussionThreadCard }
