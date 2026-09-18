/**
 * Activity feed item — colored icon-tile (status-driven), actor avatar,
 * inline message with bold actor name, relative timestamp, optional
 * primary CTA. Hover row background + border-l-2 unread accent.
 *
 * Translated from crm/ActivityFeed.tsx and team-chat/MessagePreviewCard.tsx.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type ActivityType =
  'invited' | 'mentioned' | 'recording_ready' | 'hand_raised' | 'transcript_ready' | 'reminder'

const TYPE_STYLES: Record<ActivityType, { icon: string; bg: string; fg: string }> = {
  invited: { icon: 'mail', bg: 'bg-primary-container/40', fg: 'text-primary' },
  mentioned: { icon: 'alternate_email', bg: 'bg-secondary/15', fg: 'text-secondary' },
  recording_ready: { icon: 'play_circle', bg: 'bg-error-container/50', fg: 'text-error' },
  hand_raised: { icon: 'pan_tool', bg: 'bg-warning/15', fg: 'text-warning' },
  transcript_ready: { icon: 'description', bg: 'bg-success/15', fg: 'text-success' },
  reminder: { icon: 'notifications', bg: 'bg-info/15', fg: 'text-info' },
}

const TYPE_KEY: Record<ActivityType, { key: string; defaultValue: string }> = {
  invited: { key: 'activityFeedItem.invited', defaultValue: 'invited you to {{title}}' },
  mentioned: { key: 'activityFeedItem.mentioned', defaultValue: 'mentioned you in {{context}}' },
  recording_ready: {
    key: 'activityFeedItem.recordingReady',
    defaultValue: 'recording for {{title}} is ready',
  },
  hand_raised: {
    key: 'activityFeedItem.handRaised',
    defaultValue: 'raised their hand in {{title}}',
  },
  transcript_ready: {
    key: 'activityFeedItem.transcriptReady',
    defaultValue: 'transcript for {{title}} is ready',
  },
  reminder: { key: 'activityFeedItem.reminder', defaultValue: 'reminder: {{title}}' },
}

export interface ActivityFeedItemProps {
  id: string
  type: ActivityType
  actorName: string
  actorAvatarUrl?: string
  contextTitle: string
  timestampLabel: string
  unread?: boolean
  ctaLabel?: string
  onCta?: () => void
}

export function ActivityFeedItem({
  type,
  actorName,
  actorAvatarUrl,
  contextTitle,
  timestampLabel,
  unread,
  ctaLabel,
  onCta,
}: ActivityFeedItemProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const styles = TYPE_STYLES[type]
  const messageDef = TYPE_KEY[type]
  const messageVars: Record<string, string> =
    type === 'mentioned' ? { context: contextTitle } : { title: contextTitle }

  return (
    <article
      className={cm.cn(
        cm.flex({ align: 'start', gap: 4 }),
        cm.sp('p', 4),
        'rounded-xl transition-colors hover:bg-surface-container-lowest',
        unread
          ? 'border-l-2 border-primary bg-primary-container/10'
          : 'border-l-2 border-transparent',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'w-10 h-10 rounded-xl shrink-0',
          styles.bg,
          styles.fg,
        )}
      >
        <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>{styles.icon}</span>
      </div>
      <div className={cm.cn(cm.flex1, cm.stack(2))}>
        <div className={cm.flex({ align: 'center', gap: 3 })}>
          {actorAvatarUrl ? (
            <img src={actorAvatarUrl} alt="" className={'w-6 h-6 rounded-full object-cover'} />
          ) : (
            <div
              className={
                'w-6 h-6 rounded-full bg-primary-container flex items-center justify-center text-[10px] font-bold text-on-primary-container'
              }
            >
              {actorName.charAt(0)}
            </div>
          )}
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
            <span className={cm.cn(cm.fontWeight('semibold'))}>{actorName}</span>{' '}
            <span className="text-on-surface-variant">
              {t(messageDef.key, messageVars, { defaultValue: messageDef.defaultValue })}
            </span>
          </p>
        </div>
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant/80')}>
          {timestampLabel}
        </span>
      </div>
      {ctaLabel && onCta && (
        <button
          type="button"
          onClick={onCta}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            cm.roundedFull,
            'bg-surface-container hover:bg-primary-container hover:text-on-primary-container text-on-surface transition-colors shrink-0',
          )}
        >
          {ctaLabel}
        </button>
      )}
    </article>
  )
}
