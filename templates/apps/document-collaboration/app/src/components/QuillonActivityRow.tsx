import { Link } from 'react-router'

import type { TranslateFunction } from '@molecule/app-i18n'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Editorial activity row — circular toned icon, actor + verb sentence,
 * relative timestamp, optional link to the document. Used by the
 * Dashboard "What's happening" feed and the Notifications page.
 *
 * Translated from contract-management/Dashboard activity items and
 * crm/ActivityFeed — adapted to Quillon's literary verb taxonomy.
 */
export type QuillonActivityType =
  | 'comment_added'
  | 'comment_resolved'
  | 'mention'
  | 'shared'
  | 'edited'
  | 'suggestion'
  | 'restored'
  | 'system_message'

const ACTIVITY_ICON: Record<QuillonActivityType, string> = {
  comment_added: 'chat_bubble',
  comment_resolved: 'task_alt',
  mention: 'alternate_email',
  shared: 'share',
  edited: 'edit',
  suggestion: 'lightbulb',
  restored: 'restore',
  system_message: 'info',
}

const ACTIVITY_TONE: Record<QuillonActivityType, string> = {
  comment_added: 'bg-warning/15 text-warning',
  comment_resolved: 'bg-success/15 text-success',
  mention: 'bg-primary/15 text-primary',
  shared: 'bg-info/15 text-info',
  edited: 'bg-tertiary/15 text-tertiary',
  suggestion: 'bg-secondary/15 text-secondary',
  restored: 'bg-surface-container text-on-surface-variant',
  system_message: 'bg-surface-container text-on-surface-variant',
}

export interface QuillonActivityRowProps {
  id: string
  type: QuillonActivityType
  actor: string
  /** A short verb phrase, e.g. "commented on \"Q4 Strategy\"". */
  description: string
  /** ISO timestamp. */
  createdAt: string
  /** Optional link target (defaults to none). */
  href?: string
  unread?: boolean
}

function fmtRelative(iso: string, t: TranslateFunction): string {
  const diffH = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60))
  if (diffH < 1) return t('time.justNow', {}, { defaultValue: 'just now' })
  if (diffH < 24) return t('time.hoursAgo', { hours: diffH }, { defaultValue: '{{hours}}h ago' })
  return t('time.daysAgo', { days: Math.floor(diffH / 24) }, { defaultValue: '{{days}}d ago' })
}

export function QuillonActivityRow({
  type,
  actor,
  description,
  createdAt,
  href,
  unread = false,
}: QuillonActivityRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const inner = (
    <>
      <span
        className={cm.cn(
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          ACTIVITY_TONE[type],
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          style={{ fontSize: '1.125rem' }}
          aria-hidden="true"
        >
          {ACTIVITY_ICON[type]}
        </span>
      </span>
      <div className={cm.cn('min-w-0 flex-1')}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
          <span className={cm.fontWeight('extrabold')}>{actor}</span> {description}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'mt-1 text-on-surface-variant')}>
          {fmtRelative(createdAt, t)}
        </p>
      </div>
      {unread ? (
        <span
          aria-label={t('status.unread', {}, { defaultValue: 'Unread' })}
          className={cm.cn('ml-auto inline-flex h-2 w-2 shrink-0 rounded-full bg-primary')}
        />
      ) : null}
    </>
  )

  const wrapperClass = cm.cn(
    cm.flex({ align: 'start', gap: 'sm' }),
    cm.sp('px', 3),
    cm.sp('py', 3),
    'rounded-xl transition-colors hover:bg-surface-container',
    unread ? 'bg-primary/5' : '',
  )

  if (href) {
    return (
      <Link to={href} className={wrapperClass}>
        {inner}
      </Link>
    )
  }
  return <div className={wrapperClass}>{inner}</div>
}
