import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import ThreadIndicator from './ThreadIndicator.js'

const DEMO_THREAD_MESSAGE_ID = 'demo-thread-codeblock'

interface CodeBlockMessageProps {
  channelId?: string
}

export default function CodeBlockMessage({ channelId = 'general' }: CodeBlockMessageProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div
      className={cm.cn(
        cm.flex({ gap: 4 }),
        cm.sp('p', 3),
        'group rounded-lg message-hover transition-colors',
      )}
    >
      <button
        type="button"
        onClick={() => navigate('/profile/alex-chen')}
        className={cm.cn(
          cm.w(10),
          cm.h(10),
          cm.shrink0,
          cm.cursorPointer,
          'rounded-lg overflow-hidden',
        )}
      >
        <img
          className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
          alt={t('codeBlockMessage.authorName', {}, { defaultValue: 'Alex Chen' })}
          data-alt="Alex Chen portrait, stylish tech professional with a friendly expression"
          src="https://picsum.photos/seed/CodeBlockMessage-1/1200/800"
        />
      </button>
      <div className={cm.flex1}>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 2 }), cm.sp('mb', 1))}>
          <button
            type="button"
            onClick={() => navigate('/profile/alex-chen')}
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.cursorPointer,
              'text-foreground hover:underline',
            )}
          >
            {t('codeBlockMessage.authorName', {}, { defaultValue: 'Alex Chen' })}
          </button>
          <span className={cm.cn('text-[11px] text-on-surface-variant')}>
            {t('codeBlockMessage.timestamp', { time: '11:02 AM' }, { defaultValue: '{{time}}' })}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 3), 'leading-relaxed text-on-surface')}>
          {t('codeBlockMessage.body', {
            defaultValue: "Here's the updated API schema for the new endpoints.",
          })}
        </p>
        {/* Code Snippet */}
        <div
          className={cm.cn(
            cm.sp('p', 4),
            'bg-foreground rounded-lg font-mono text-[13px] text-foreground-tertiary overflow-x-auto shadow-inner',
          )}
        >
          <div className={cm.flex({ gap: 4 })}>
            <span className={cm.cn('text-foreground-secondary select-none')}>1</span>
            <span>
              <span className={cm.cn('text-sky-400')}>interface</span>
              <span className={cm.cn('text-yellow-200')}>UserPayload</span>
              {'{'}
            </span>
          </div>
          <div className={cm.flex({ gap: 4 })}>
            <span className={cm.cn('text-foreground-secondary select-none')}>2</span>
            <span className={cm.sp('pl', 4)}>
              id:
              <span className={cm.cn('text-orange-300')}>string</span>;
            </span>
          </div>
          <div className={cm.flex({ gap: 4 })}>
            <span className={cm.cn('text-foreground-secondary select-none')}>3</span>
            <span className={cm.sp('pl', 4)}>
              roles:
              <span className={cm.cn('text-orange-300')}>string[]</span>;
            </span>
          </div>
          <div className={cm.flex({ gap: 4 })}>
            <span className={cm.cn('text-foreground-secondary select-none')}>4</span>
            <span>{'}'}</span>
          </div>
        </div>
        <ThreadIndicator
          channelId={channelId}
          threadRootMessageId={DEMO_THREAD_MESSAGE_ID}
          replyCount={3}
          lastReplyTime={t(
            'threadIndicator.lastReplyTime',
            { minutes: 12 },
            { defaultValue: 'Last reply {{minutes}} minutes ago' },
          )}
          participants={[
            {
              avatar: 'https://picsum.photos/seed/CodeBlockMessage-2/1200/800',
              avatarAlt: t('threadIndicator.participantAvatarAlt', {
                defaultValue: 'small participant avatar',
              }),
            },
            {
              avatar: 'https://picsum.photos/seed/CodeBlockMessage-3/1200/800',
              avatarAlt: t('threadIndicator.participantAvatarAlt', {
                defaultValue: 'small participant avatar',
              }),
            },
          ]}
          additionalParticipants={1}
        />
      </div>
    </div>
  )
}
export { CodeBlockMessage }
