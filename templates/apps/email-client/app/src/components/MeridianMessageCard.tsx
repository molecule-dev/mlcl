import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface MessageAttachment {
  name: string
  sizeLabel: string
  /** Optional download URL. When unset, the chip is purely decorative. */
  url?: string
  /** Material Symbols glyph (e.g. picture_as_pdf, description, table). */
  icon?: string
  /** Tailwind tone for the icon chip. */
  tone?: 'pdf' | 'doc' | 'sheet' | 'image' | 'generic'
}

export interface MessageCardData {
  sender: string
  senderEmail: string
  initials?: string
  recipients?: string
  timestamp: string
  body: string[]
  attachments?: MessageAttachment[]
}

interface MeridianMessageCardProps {
  message: MessageCardData
  /** Optional eyebrow line (e.g. "Yesterday · 4:23 PM (18 hours ago)"). */
  contextLine?: string
}

const ATTACHMENT_TONES: Record<NonNullable<MessageAttachment['tone']>, string> = {
  pdf: 'bg-error-light text-error',
  doc: 'bg-primary/10 text-primary-dark',
  sheet: 'bg-success-light text-success',
  image: 'bg-secondary/10 text-secondary',
  generic: 'bg-surface-container text-on-surface-variant',
}

/**
 * Reading-pane message card — sender header band with avatar chip + email
 * + timestamp, body paragraphs, and an attachment strip with branded icon
 * chips.
 *
 * Translated from personal-finance's AccountRecentTransactions card +
 * blog's ArticleListItem reading layout.
 */
export function MeridianMessageCard({ message, contextLine }: MeridianMessageCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const initials = message.initials || message.sender.slice(0, 2).toUpperCase()

  return (
    <article
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'rounded-2xl bg-surface border border-outline-variant/50 shadow-sm overflow-hidden',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          'border-b border-outline-variant/40 bg-surface-container-lowest',
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'bg-gradient-to-br from-primary to-secondary text-white',
            )}
            aria-hidden="true"
          >
            {initials}
          </span>
          <div>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
              {message.sender}{' '}
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('normal'),
                  'text-on-surface-variant',
                )}
              >
                &lt;{message.senderEmail}&gt;
              </span>
            </p>
            {message.recipients && (
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'meridian.message.toLine',
                  { recipients: message.recipients },
                  { defaultValue: 'to {{recipients}}' },
                )}
              </p>
            )}
          </div>
        </div>
        <div className={cm.cn(cm.flex({ direction: 'col', align: 'end', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-on-surface-variant tabular-nums',
            )}
          >
            {message.timestamp}
          </span>
          {contextLine && (
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {contextLine}
            </span>
          )}
        </div>
      </header>

      <div
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'md' }),
          cm.sp('px', 8),
          cm.sp('py', 6),
          cm.textSize('sm'),
          'text-on-surface leading-relaxed',
        )}
      >
        {message.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {message.attachments && message.attachments.length > 0 && (
        <footer
          className={cm.cn(
            cm.flex({ wrap: 'wrap', gap: 'sm' }),
            cm.sp('px', 6),
            cm.sp('py', 4),
            'border-t border-outline-variant/40 bg-surface-container-lowest',
          )}
        >
          {message.attachments.map((a) => (
            <span
              key={a.name}
              data-mol-id={`attachment-${a.name}`}
              role="note"
              aria-label={t(
                'meridian.message.attachmentLabel',
                { name: a.name, size: a.sizeLabel },
                { defaultValue: 'Attachment {{name}} ({{size}})' },
              )}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'min-w-[200px] rounded-xl bg-surface border border-outline-variant/40 text-left',
              )}
            >
              <span
                className={cm.cn(
                  cm.w(10),
                  cm.h(10),
                  cm.flex({ align: 'center', justify: 'center' }),
                  'rounded-lg shrink-0',
                  ATTACHMENT_TONES[a.tone ?? 'generic'],
                )}
                aria-hidden="true"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {a.icon || 'description'}
                </span>
              </span>
              <span className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0 gap-0')}>
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'truncate text-on-surface',
                  )}
                >
                  {a.name}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
                  {a.sizeLabel}
                </span>
              </span>
            </span>
          ))}
        </footer>
      )}
    </article>
  )
}
