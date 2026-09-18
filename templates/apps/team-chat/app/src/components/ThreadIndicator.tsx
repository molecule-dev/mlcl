import React from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Participant {
  avatar: string
  avatarAlt: string
}

interface ThreadIndicatorProps {
  participants: Participant[]
  additionalParticipants: number
  replyCount: number
  lastReplyTime: string
  channelId: string
  threadRootMessageId: string
}

export function ThreadIndicator({
  participants,
  additionalParticipants,
  replyCount,
  lastReplyTime,
  channelId,
  threadRootMessageId,
}: ThreadIndicatorProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const navigate = useNavigate()

  const goToThread = () => {
    navigate(
      `/channels/${encodeURIComponent(channelId)}/threads/${encodeURIComponent(threadRootMessageId)}`,
    )
  }

  return (
    <button
      type="button"
      onClick={goToThread}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 2 }),
        cm.sp('mt', 3),
        cm.sp('p', 1),
        cm.sp('px', 2),
        cm.cursorPointer,
        'group/thread rounded border border-transparent transition-all hover:border-border hover:bg-surface dark:hover:border-slate-700',
      )}
    >
      <div className={cm.cn(cm.flex(), '-space-x-1.5')}>
        {participants.map((participant, index) => (
          <img
            key={index}
            className={cm.cn(
              cm.w(5),
              cm.h(5),
              cm.roundedFull,
              'border-2 border-surface object-cover',
            )}
            data-alt={participant.avatarAlt}
            src={participant.avatar}
            alt=""
          />
        ))}
        {additionalParticipants > 0 && (
          <div
            className={cm.cn(
              cm.w(5),
              cm.h(5),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              cm.fontWeight('bold'),
              'border-2 border-surface bg-border text-[8px] text-foreground-secondary',
            )}
          >
            {t(
              'threadIndicator.moreParticipants',
              { count: additionalParticipants },
              { defaultValue: '+{{count}}' },
            )}
          </div>
        )}
      </div>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.textPrimary,
          'text-[12px] group-hover/thread:underline',
        )}
      >
        {t('threadIndicator.replies', { count: replyCount }, { defaultValue: '{{count}} replies' })}
      </span>
      <span className={cm.cn('text-[11px] text-on-surface-variant')}>{lastReplyTime}</span>
    </button>
  )
}

export default ThreadIndicator
