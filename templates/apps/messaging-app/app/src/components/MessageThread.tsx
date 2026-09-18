import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Message {
  id: string
  sender_name: string
  body: string
  sent_at: string
  delivered: boolean
  read: boolean
  self: boolean
  reactions: { emoji: string; count: number }[]
}

interface MessageThreadProps {
  messages: Message[]
  /** Header label for the thread; e.g. contact name or sample-card label. */
  headerLabel?: string
  /** Show E2EE banner over the thread. */
  showEncryptionBanner?: boolean
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/**
 * Editorial message thread preview — sender-grouped bubbles with rounded
 * asymmetric corners (sent: 18-18-4-18, received: 18-18-18-4), reaction pills,
 * read-receipt double-checks, encryption banner. Used as the right-pane
 * preview on Inbox and as the auth'd-style sample on Landing.
 */
export function MessageThread({
  messages,
  headerLabel,
  showEncryptionBanner = true,
}: MessageThreadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (messages.length === 0) {
    return (
      <div className={cm.cn('rounded-2xl bg-surface-container-low p-12 text-center')}>
        <span
          className="material-symbols-outlined text-5xl text-on-surface-variant/40"
          aria-hidden="true"
        >
          forum
        </span>
        <p className={'text-sm text-on-surface-variant mt-3'}>
          {t('messageThread.empty', {}, { defaultValue: 'Pick a conversation to start reading.' })}
        </p>
      </div>
    )
  }

  return (
    <div className={'rounded-2xl bg-surface-container-lowest shadow-sm overflow-hidden'}>
      {headerLabel && (
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            'px-5 py-3 border-b border-outline-variant/40',
          )}
        >
          <p className={'text-sm font-bold text-on-surface'}>{headerLabel}</p>
          {showEncryptionBanner && (
            <span
              className={
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-success text-[10px] font-bold'
              }
            >
              <span className={'material-symbols-outlined text-xs'} aria-hidden="true">
                lock
              </span>
              {t('common.endToEndEncrypted', {}, { defaultValue: 'End-to-end encrypted' })}
            </span>
          )}
        </div>
      )}

      <div
        className={cm.cn('px-5 py-5 space-y-3')}
        style={{ background: 'var(--color-bg-sidebar)' }}
      >
        {messages.map((m) => (
          <div key={m.id} className={cm.cn('flex', m.self ? 'justify-end' : 'justify-start')}>
            <div className="max-w-[78%]">
              {!m.self && (
                <p className={'text-[11px] font-semibold text-primary px-1 mb-0.5'}>
                  {m.sender_name}
                </p>
              )}
              <div
                className={cm.cn(
                  'px-4 py-2.5 text-sm leading-relaxed shadow-sm',
                  m.self
                    ? 'bg-primary text-white rounded-[18px] rounded-br-[4px]'
                    : 'bg-surface text-on-surface rounded-[18px] rounded-bl-[4px]',
                )}
              >
                {m.body}
              </div>
              <div
                className={cm.cn(
                  'flex items-center gap-1.5 mt-1 px-1',
                  m.self ? 'justify-end' : 'justify-start',
                )}
              >
                <span className="text-[10px] text-on-surface-variant tabular-nums">
                  {fmtTime(m.sent_at)}
                </span>
                {m.self && (
                  <span
                    className={cm.cn(
                      'material-symbols-outlined text-[14px]',
                      m.read ? 'text-primary' : 'text-foreground-tertiary',
                    )}
                    aria-label={
                      m.read
                        ? t('messageThread.readAria', {}, { defaultValue: 'Read' })
                        : t('messageThread.deliveredAria', {}, { defaultValue: 'Delivered' })
                    }
                  >
                    {m.read ? 'done_all' : m.delivered ? 'done_all' : 'done'}
                  </span>
                )}
                {m.reactions.length > 0 && (
                  <span
                    className={
                      'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-surface border border-outline-variant text-[11px]'
                    }
                  >
                    {m.reactions.map((r) => (
                      <span key={r.emoji} className={'inline-flex items-center gap-0.5'}>
                        <span aria-hidden="true">{r.emoji}</span>
                        <span className="font-medium text-on-surface-variant">{r.count}</span>
                      </span>
                    ))}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
