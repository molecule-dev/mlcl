import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type Speaker = 'user' | 'assistant'

interface ChatBubbleProps {
  speaker: Speaker
  children: ReactNode
  /** Optional source pill, e.g. "Voice" or "Text". */
  source?: 'voice' | 'text'
  /** Optional duration string (mm:ss) shown beneath the bubble. */
  duration?: string
}

/**
 * ChatBubble — Vox user/assistant message bubble.
 *
 * Renders the brand-specific corner-radius pattern (top-rounded with one
 * mirrored 4px corner indicating the speaker) and the optional "Voice" /
 * "Text" source pill. ClassMap-driven; raw Tailwind only for the gradient,
 * frosted backing, and asymmetric radii that ClassMap can't express.
 */
export function ChatBubble({ speaker, children, source, duration }: ChatBubbleProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isUser = speaker === 'user'
  const align = isUser ? cm.cn('self-end ml-auto') : cm.cn('self-start mr-auto')
  const bubble = isUser
    ? cm.cn(
        cm.sp('px', 4),
        cm.sp('py', 3),
        'bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/30 rounded-[20px] rounded-br-[4px] max-w-[75%]',
      )
    : cm.cn(
        cm.sp('px', 4),
        cm.sp('py', 3),
        'bg-surface-secondary text-foreground border border-border rounded-[20px] rounded-bl-[4px] max-w-[85%]',
      )
  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), align, 'w-full')}>
      <div className={bubble}>
        <div className={cm.cn(cm.textSize('base'), 'leading-relaxed')}>{children}</div>
        {source ? (
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.roundedFull,
              cm.sp('mt', 2),
              isUser ? 'bg-surface/90 text-foreground' : 'bg-primary/15 text-primary',
              'inline-block px-2 py-0.5 text-[10px] uppercase tracking-widest',
            )}
          >
            {source === 'voice'
              ? t('chatBubble.source.voice', {}, { defaultValue: 'voice' })
              : t('chatBubble.source.text', {}, { defaultValue: 'text' })}
          </span>
        ) : null}
      </div>
      {duration ? (
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.textMuted,
            'tabular-nums',
            isUser ? cm.cn('text-right') : cm.cn(cm.textCenter, 'text-left'),
          )}
        >
          {duration}
        </span>
      ) : null}
    </div>
  )
}
