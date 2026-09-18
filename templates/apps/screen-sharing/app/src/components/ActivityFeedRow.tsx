/**
 * Activity-feed row — icon tile (status-coded), actor + verb + recording link,
 * optional comment-preview snippet, relative time, hover lift.
 *
 * Translated from team-chat's MessagePreviewCard with the per-event-type
 * accent border-l from personal-finance ActivityRow.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type ActivityKind = 'comment' | 'view' | 'mention' | 'share' | 'reaction' | 'invite'

export interface ActivityFeedItem {
  id: string
  kind: ActivityKind
  actor: string
  recordingTitle: string
  recordingId?: string
  excerpt?: string
  timestamp: string
  isUnread?: boolean
}

const kindIcon: Record<ActivityKind, string> = {
  comment: 'chat_bubble',
  view: 'visibility',
  mention: 'alternate_email',
  share: 'share',
  reaction: 'favorite',
  invite: 'group_add',
}

const kindAccent: Record<ActivityKind, string> = {
  comment: 'border-cyan-500 bg-cyan-50 text-cyan-600',
  view: 'border-violet-500 bg-violet-50 text-violet-600',
  mention: 'border-amber-500 bg-warning-light text-warning',
  share: 'border-emerald-500 bg-success-light text-success',
  reaction: 'border-pink-500 bg-pink-50 text-pink-600',
  invite: 'border-sky-500 bg-sky-50 text-sky-600',
}

const kindCopy: Record<ActivityKind, string> = {
  comment: 'commented on',
  view: 'viewed',
  mention: 'mentioned you in',
  share: 'shared',
  reaction: 'reacted to',
  invite: 'was invited to',
}

interface ActivityFeedRowProps {
  item: ActivityFeedItem
}

export function ActivityFeedRow({ item }: ActivityFeedRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accent = kindAccent[item.kind] ?? kindAccent.view

  const recordingHref = item.recordingId ? `/recordings/${item.recordingId}` : '/library'

  return (
    <Link
      to={recordingHref}
      className={cm.cn(
        cm.flex({ align: 'start', gap: 4 }),
        cm.sp('p', 5),
        'group rounded-2xl border-l-4 bg-surface-container-lowest shadow-sm hover:translate-x-1 transition-transform',
        accent.split(' ')[0],
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(11),
          cm.h(11),
          'rounded-xl shrink-0',
          accent.split(' ').slice(1).join(' '),
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-xl')}>{kindIcon[item.kind]}</span>
      </div>
      <div className={cm.cn(cm.flex1, 'min-w-0')}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 2 }))}>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface truncate')}>
            <span className={cm.cn(cm.fontWeight('bold'))}>{item.actor}</span>{' '}
            <span className={cm.cn('text-on-surface-variant')}>
              {t(`activity.verb.${item.kind}`, {}, { defaultValue: kindCopy[item.kind] })}
            </span>{' '}
            <span
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-[var(--color-brand-gradient-from)]',
              )}
            >
              {item.recordingTitle}
            </span>
          </p>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              'shrink-0 text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {item.timestamp}
          </span>
        </div>
        {item.excerpt && (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 1),
              'text-on-surface-variant truncate italic',
            )}
          >
            {`“${item.excerpt}”`}
          </p>
        )}
      </div>
      {item.isUnread && (
        <span
          aria-hidden="true"
          className={cm.cn(
            cm.w(2),
            cm.h(2),
            cm.roundedFull,
            'mt-2 bg-[var(--color-brand-gradient-to)] shadow-[0_0_0_4px_rgba(6,182,212,0.2)]',
          )}
        />
      )}
    </Link>
  )
}
