/**
 * Asymmetric-radius chat bubble — bot/user/agent variants per
 * DESIGN.md Components > Chat Bubble. The asymmetric corners
 * (4px on the speaker side, 16px elsewhere) are this app's signature
 * micro-detail and the hardest thing to get right by accident, so it
 * lives in a single component.
 *
 * Pattern source: team-chat ChatBody bubble shape, with the asymmetric
 * radius DESIGN.md spec for ai-customer-service-bot.
 */
import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type BubbleSpeaker = 'bot' | 'user' | 'agent'

interface ChatBubbleProps {
  speaker: BubbleSpeaker
  /** Display name above the bubble (e.g. "Sarah J. — Senior Agent"). */
  name?: string
  /** Avatar URL (or initials fallback if absent). */
  avatarUrl?: string
  /** Initials shown in the avatar circle when avatarUrl is missing. */
  initials?: string
  /** Localized timestamp label (e.g. "2 minutes ago"). */
  timestamp?: string
  children: ReactNode
}

const SPEAKER_BG: Record<BubbleSpeaker, string> = {
  bot: 'bg-surface-container text-on-surface',
  user: 'bg-primary text-on-primary',
  agent: 'bg-surface-container text-primary-hover border-l-[3px] border-info',
}

const SPEAKER_RADIUS: Record<BubbleSpeaker, string> = {
  bot: 'rounded-[4px_16px_16px_16px]',
  user: 'rounded-[16px_4px_16px_16px]',
  agent: 'rounded-[4px_16px_16px_16px]',
}

function ChatBubble({ speaker, name, avatarUrl, initials, timestamp, children }: ChatBubbleProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isUser = speaker === 'user'

  return (
    <div
      className={cm.cn(
        cm.flex({ gap: 3 }),
        cm.maxW('[75%]'),
        isUser ? 'self-end flex-row-reverse' : 'self-start',
      )}
    >
      {avatarUrl ? (
        <img
          alt={t('chatBubble.avatarAlt', { speaker }, { defaultValue: '{{speaker}} avatar' })}
          src={avatarUrl}
          className={cm.cn(cm.w(8), cm.h(8), cm.roundedFull, 'object-cover shrink-0')}
        />
      ) : (
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(8),
            cm.h(8),
            cm.roundedFull,
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'shrink-0',
            isUser
              ? 'bg-primary-container text-on-primary-container'
              : 'bg-surface-container-high text-on-surface-variant',
          )}
        >
          {initials ?? (speaker === 'bot' ? 'AI' : '?')}
        </div>
      )}
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 1 }), 'min-w-0')}>
        {(name || timestamp) && (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.textSize('xs'),
              'text-on-surface-variant',
              isUser ? 'justify-end' : 'justify-start',
            )}
          >
            {name && (
              <span
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  speaker === 'agent' ? 'text-primary-hover' : 'text-on-surface',
                )}
              >
                {name}
              </span>
            )}
            {timestamp && <span className="text-[var(--color-text-muted)]">· {timestamp}</span>}
          </div>
        )}
        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'leading-relaxed',
            SPEAKER_BG[speaker],
            SPEAKER_RADIUS[speaker],
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
