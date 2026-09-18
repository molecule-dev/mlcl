import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import ReactionButton from './ReactionButton.js'

export interface ParentMessageProps {
  message?: Record<string, unknown> | null
  author?: {
    name: string
    avatar: string
    avatarAlt: string
  }
  timestamp?: string
  content?: string
  reactions?: Array<{
    emoji: string
    count: number
    variant?: 'secondary' | 'tertiary' | 'default'
  }>
}

export default function ParentMessage(props: ParentMessageProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const message = props.message ?? null
  const fallbackAuthorName =
    (message?.author_name as string | undefined) ??
    (message?.user_name as string | undefined) ??
    undefined
  const fallbackAvatar =
    (message?.avatar as string | undefined) ??
    (message?.user_avatar as string | undefined) ??
    undefined
  const author =
    props.author ??
    (fallbackAuthorName
      ? {
          name: fallbackAuthorName,
          avatar:
            fallbackAvatar ??
            `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackAuthorName)}&background=4a154b&color=fff`,
          avatarAlt: fallbackAuthorName,
        }
      : undefined)
  const timestamp =
    props.timestamp ??
    (message?.created_at
      ? new Date(String(message.created_at)).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      : undefined)
  const content =
    props.content ??
    (message ? String(message.content ?? message.text ?? message.body ?? '') : undefined)
  const reactions = props.reactions ?? (message?.reactions as ParentMessageProps['reactions']) ?? []
  const [displayReactions, setDisplayReactions] = useState(reactions ?? [])
  const [activeReactionIndices, setActiveReactionIndices] = useState<Set<number>>(new Set())
  return (
    <section className={cm.cn('group relative')}>
      <div className={cm.cn(cm.flex({ gap: 4 }))}>
        <div className={cm.cn(cm.shrink0)}>
          <img
            className={cm.cn(cm.w(12), cm.h(12), 'rounded-xl object-cover shadow-sm')}
            data-alt="portrait of a male developer Alex Chen, warm indoor lighting, slightly blurry tech background"
            src={author?.avatar ?? 'https://picsum.photos/seed/ParentMessage-1/1200/800'}
            alt={
              author?.avatarAlt ??
              t('parentMessage.avatarAlt', {}, { defaultValue: 'Author avatar' })
            }
          />
        </div>
        <div className={cm.cn(cm.flex1, 'min-w-0')}>
          <div className={cm.cn(cm.flex({ align: 'baseline', gap: 2 }), cm.sp('mb', 1))}>
            <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
              {author?.name ??
                t('parentMessage.sampleAuthorName', {}, { defaultValue: 'Alex Chen' })}
            </span>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {timestamp ?? t('parentMessage.sampleTimestamp', {}, { defaultValue: '10:23 AM' })}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.sp('p', 4),
              'bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm',
            )}
          >
            <p className={cm.cn('text-on-surface body-md leading-relaxed')}>
              {content ??
                t(
                  'parentMessage.sampleContent',
                  {},
                  {
                    defaultValue:
                      'Anyone know why the staging deploy failed? The pipeline log shows a timeout on the DB migration step.',
                  },
                )}
            </p>
          </div>
          <div className={cm.cn(cm.flex({ gap: 2 }), cm.sp('mt', 3))}>
            {displayReactions.map((r, i) => (
              <ReactionButton
                key={i}
                emoji={r.emoji}
                count={r.count}
                onClick={() => {
                  const isActive = activeReactionIndices.has(i)
                  setActiveReactionIndices((prev) => {
                    const next = new Set(prev)
                    if (isActive) next.delete(i)
                    else next.add(i)
                    return next
                  })
                  setDisplayReactions((prev) =>
                    prev.map((item, idx) =>
                      idx === i ? { ...item, count: item.count + (isActive ? -1 : 1) } : item,
                    ),
                  )
                }}
              />
            ))}
          </div>
        </div>
      </div>
      {/* Thread Connector Line */}
      <div
        className={cm.cn(
          'absolute left-6 top-16 bottom-[-40px] w-0.5 bg-gradient-to-b from-surface-container-high to-transparent',
        )}
      ></div>
    </section>
  )
}
export { ParentMessage }
