import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Activity feed row — used on /notifications and as the right-rail on
 * /decks. Renders an actor avatar bubble (color-coded from the cursor
 * palette) + verb sentence + relative-time eyebrow, with an optional
 * inline comment-preview pill. Unread state signalled by a left primary
 * dot.
 *
 * Translated from design-canvas's ActivityFeedItem.tsx — kept the actor
 * avatar + kind-icon overlap pattern, retuned with presentation verbs
 * (commented, viewed, exported, presented) for Overture.
 */
export type ActivityKind =
  | 'mention'
  | 'comment'
  | 'invite'
  | 'edit'
  | 'share'
  | 'lock'
  | 'restore'
  | 'export'
  | 'view'
  | 'present'
  | 'create'

export interface ActivityFeedItemProps {
  item: {
    id: string
    kind: ActivityKind
    actorName: string
    actorColor: string
    /** Bold target (deck / template name) embedded in the sentence. */
    target?: string
    /** Optional href for the target. */
    targetHref?: string
    /** Free-form sentence connector ("commented on", "invited you to"…). */
    sentence: string
    /** Optional preview body — quoted comment or note text. */
    preview?: string
    timeLabel: string
    unread?: boolean
  }
}

const KIND_ICON: Record<ActivityKind, string> = {
  mention: 'alternate_email',
  comment: 'forum',
  invite: 'group_add',
  edit: 'edit',
  share: 'ios_share',
  lock: 'lock',
  restore: 'history',
  export: 'download',
  view: 'visibility',
  present: 'co_present',
  create: 'add_circle',
}

export function ActivityFeedItem({ item }: ActivityFeedItemProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <article
      className={cm.cn(
        cm.flex({ gap: 'md' }),
        cm.sp('p', 4),
        'group relative bg-surface-container-lowest rounded-xl border border-outline-variant/30 hover:bg-surface-container-low transition-colors',
      )}
    >
      {item.unread && (
        <span
          aria-label={t('status.unread', {}, { defaultValue: 'Unread' })}
          className={cm.cn(
            'absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary',
          )}
        ></span>
      )}
      <span
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(11),
          cm.h(11),
          cm.roundedFull,
          cm.fontWeight('bold'),
          'shrink-0 text-white text-sm relative',
        )}
        style={{ backgroundColor: item.actorColor }}
      >
        {item.actorName.charAt(0).toUpperCase()}
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(5),
            cm.h(5),
            cm.roundedFull,
            'absolute -bottom-1 -right-1 bg-surface-container-lowest border border-outline-variant/40',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-[12px] text-on-surface-variant')}
            aria-hidden="true"
          >
            {KIND_ICON[item.kind]}
          </span>
        </span>
      </span>
      <div className={cm.cn(cm.flex1, cm.stack(1))}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
          <span className={cm.cn('text-primary')}>{item.actorName}</span>{' '}
          <span className={cm.cn('text-on-surface-variant font-medium')}>{item.sentence}</span>{' '}
          {item.target && (
            <Link
              to={item.targetHref ?? '#'}
              className={cm.cn('text-primary font-bold hover:underline')}
            >
              {item.target}
            </Link>
          )}
        </p>
        {item.preview && (
          <div
            className={cm.cn(
              cm.sp('p', 3),
              cm.sp('mt', 1),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'bg-surface-container-low rounded-lg italic text-on-surface-variant border-l-2 border-primary/40',
            )}
          >
            “{item.preview}”
          </div>
        )}
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant/70',
          )}
        >
          {item.timeLabel}
        </span>
      </div>
    </article>
  )
}

export default ActivityFeedItem
