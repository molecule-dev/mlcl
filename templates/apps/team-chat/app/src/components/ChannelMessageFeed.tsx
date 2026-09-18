import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import ChannelIntroMessage from './ChannelIntroMessage.js'
import ChannelTechnicalMessages from './ChannelTechnicalMessages.js'
import DateSeparator from './DateSeparator.js'
import MessageItem from './MessageItem.js'

interface ChannelMessageFeedProps {
  messages?: Record<string, unknown>[]
  loading?: boolean
  channelId?: string
}
export default function ChannelMessageFeed({
  messages = [],
  loading = false,
  channelId = 'general',
}: ChannelMessageFeedProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const formatTime = (d: string) => {
    try {
      return new Date(d).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    } catch (_error) {
      // invalid date string — fall back to empty string
      return ''
    }
  }
  return (
    <>
      {/* Message Feed */}
      <div
        className={cm.cn(cm.flex1, 'overflow-y-auto', cm.sp('px', 6), cm.sp('py', 6), cm.stack(1))}
      >
        {loading ? (
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('py', 12))}>
            <div
              className={cm.cn(
                'animate-spin',
                cm.roundedFull,
                cm.h(8),
                cm.w(8),
                'border-b-2 border-primary',
              )}
              aria-label={t('common.loading', {}, { defaultValue: 'Loading' })}
            />
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg, i) => (
            <div
              key={String(msg.id ?? i)}
              className={cm.cn(
                'group',
                cm.flex({ gap: 4 }),
                cm.sp('p', 3),
                'rounded-lg message-hover transition-colors',
              )}
            >
              <div
                className={cm.cn(
                  cm.w(10),
                  cm.h(10),
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.shrink0,
                  'rounded-lg bg-border',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-foreground-secondary')}>
                  person
                </span>
              </div>
              <div className={cm.cn(cm.flex1)}>
                <div className={cm.cn(cm.flex({ gap: 2 }), cm.sp('mb', 1), 'items-baseline')}>
                  <span className={cm.cn(cm.fontWeight('bold'), 'text-foreground')}>
                    {String(
                      msg.author_name ??
                        msg.user_name ??
                        msg.sender ??
                        t('channelMessageFeed.unknownAuthor', {}, { defaultValue: 'User' }),
                    )}
                  </span>
                  <span className={cm.cn('text-[11px] text-on-surface-variant')}>
                    {msg.created_at ? formatTime(String(msg.created_at)) : ''}
                  </span>
                </div>
                <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface')}>
                  {String(msg.content ?? msg.text ?? msg.body ?? '')}
                </p>
              </div>
            </div>
          ))
        ) : (
          <>
            <DateSeparator />
            <MessageItem />
            <ChannelIntroMessage />
            <ChannelTechnicalMessages channelId={channelId} />
          </>
        )}
      </div>
    </>
  )
}
export { ChannelMessageFeed }
