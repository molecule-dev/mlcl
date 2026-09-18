import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ConversationListItemProps {
  to: string
  title: string
  preview?: string
  duration?: string
  timestamp?: string
  messages?: number
  active?: boolean
  voice?: boolean
}

/**
 * ConversationListItem — single row inside the History list / sidebar.
 *
 * Active state uses a 3px primary left border with a faint primary tinted
 * background (per DESIGN.md). Hover slides slightly right to telegraph
 * interactivity. Times render in `tabular-nums` so the column aligns.
 */
export function ConversationListItem({
  to,
  title,
  preview,
  duration,
  timestamp,
  messages,
  active = false,
  voice = false,
}: ConversationListItemProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Link
      to={to}
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        'rounded-xl transition-all duration-150 hover:translate-x-0.5',
        active
          ? 'bg-primary/15 border-l-[3px] border-primary text-foreground'
          : 'border-l-[3px] border-transparent text-foreground hover:bg-surface-secondary',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}>
        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate flex-1')}>
          {title}
        </span>
        {voice ? (
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-[14px] text-secondary')}
          >
            graphic_eq
          </span>
        ) : null}
      </div>
      {preview ? (
        <span className={cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('mt', 1), 'truncate')}>
          {preview}
        </span>
      ) : null}
      {timestamp || duration || messages != null ? (
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('mt', 2),
            cm.textSize('xs'),
            cm.textSubtle,
            'tabular-nums',
          )}
        >
          {timestamp ? <span>{timestamp}</span> : null}
          {duration ? <span>· {duration}</span> : null}
          {messages != null ? (
            <span>
              ·{' '}
              {t(
                'conversationListItem.messageCount',
                { count: messages },
                { defaultValue: '{{count}} msg' },
              )}
            </span>
          ) : null}
        </div>
      ) : null}
    </Link>
  )
}
