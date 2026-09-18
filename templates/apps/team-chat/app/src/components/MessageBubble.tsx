import { getClassMap } from '@molecule/app-ui'

interface MessageBubbleProps {
  author: string
  avatar: string
  avatarAlt: string
  timestamp: string
  children: React.ReactNode
  onAuthorClick?: () => void
}

export default function MessageBubble({
  author,
  avatar,
  avatarAlt,
  timestamp,
  children,
  onAuthorClick,
}: MessageBubbleProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ gap: 4 }),
        cm.sp('p', 3),
        'group rounded-lg message-hover transition-colors',
      )}
    >
      <img
        className={cm.cn(cm.w(10), cm.h(10), cm.shrink0, 'rounded-lg object-cover')}
        alt=""
        data-alt={avatarAlt}
        src={avatar}
      />
      <div className={cm.flex1}>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 2 }), cm.sp('mb', 1))}>
          <button
            type="button"
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.cursorPointer,
              'text-foreground hover:underline',
            )}
            onClick={onAuthorClick}
          >
            {author}
          </button>
          <span className={cm.cn('text-[11px] text-on-surface-variant')}>{timestamp}</span>
        </div>
        {children}
      </div>
    </div>
  )
}
export { MessageBubble }
