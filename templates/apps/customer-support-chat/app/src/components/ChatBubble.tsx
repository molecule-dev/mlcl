/**
 * Asymmetric-radius chat bubble — agent / customer / bot / note variants
 * per DESIGN.md "Chat Bubble" specs. The asymmetric corner
 * (4px on the speaker side, 16px elsewhere) is the brand's signature
 * micro-detail.
 *
 * Translated from ai-customer-service-bot ChatBubble, retuned for the
 * Liaison violet palette + the additional "note" (internal) variant.
 */
import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type BubbleSpeaker = 'agent' | 'customer' | 'bot' | 'note'

interface ChatBubbleProps {
  speaker: BubbleSpeaker
  /** Display name above the bubble (e.g. "Sarah J. — Senior Agent"). */
  name?: string
  /** Localized timestamp label (e.g. "2 minutes ago"). */
  timestamp?: string
  /** Initials shown in the avatar circle (defaults to first two letters of name). */
  initials?: string
  children: ReactNode
}

const BUBBLE_BG: Record<BubbleSpeaker, string> = {
  agent: 'bg-surface-hover text-text',
  customer: 'bg-[var(--color-border-secondary)] text-text',
  bot: 'bg-[var(--color-bot-bubble-bg)] text-[var(--color-bot-bubble-text)]',
  note: 'bg-[var(--color-note-bg)] text-[var(--color-note-text)] border border-dashed border-[var(--color-note-border)] italic',
}

const BUBBLE_RADIUS: Record<BubbleSpeaker, string> = {
  agent: 'rounded-[4px_16px_16px_16px]',
  customer: 'rounded-[16px_4px_16px_16px]',
  bot: 'rounded-[4px_16px_16px_16px]',
  note: 'rounded-md',
}

const AVATAR_BG: Record<BubbleSpeaker, string> = {
  agent: 'bg-primary text-white',
  customer: 'bg-[var(--color-border-secondary)] text-text',
  bot: 'bg-[var(--color-bot-accent)] text-white',
  note: 'bg-[var(--color-note-avatar-bg)] text-[var(--color-note-text)]',
}

function ChatBubble({ speaker, name, timestamp, initials, children }: ChatBubbleProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isCustomer = speaker === 'customer'
  const isNote = speaker === 'note'
  const initialsFallback =
    initials ??
    name
      ?.split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ??
    (speaker === 'bot' ? 'AI' : '?')

  if (isNote) {
    return (
      <div
        className={cm.cn(
          cm.flex({ align: 'start', gap: 2 }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.maxW('xl'),
          cm.mxAuto,
          cm.textSize('xs'),
          BUBBLE_BG.note,
          BUBBLE_RADIUS.note,
        )}
      >
        <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: 14 }}>
          lock
        </span>
        <span className={cm.cn(cm.fontWeight('medium'))}>
          {t('chatBubble.internalNoteLabel', {}, { defaultValue: 'Internal note' })}: {children}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ gap: 3 }),
        cm.maxW('[75%]'),
        isCustomer ? 'self-end flex-row-reverse' : 'self-start',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(8),
          cm.h(8),
          cm.roundedFull,
          cm.fontWeight('bold'),
          cm.textSize('xs'),
          'shrink-0',
          AVATAR_BG[speaker],
        )}
      >
        {initialsFallback}
      </div>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 1 }), 'min-w-0')}>
        {(name || timestamp) && (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.textSize('xs'),
              'text-on-surface-variant',
              isCustomer ? 'justify-end' : 'justify-start',
            )}
          >
            {name && (
              <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>{name}</span>
            )}
            {timestamp && <span>· {timestamp}</span>}
          </div>
        )}
        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'leading-relaxed',
            BUBBLE_BG[speaker],
            BUBBLE_RADIUS[speaker],
          )}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export default ChatBubble
export { ChatBubble }
