import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { EmailStatus } from './StatusPill.js'
import { StatusPill } from './StatusPill.js'

export interface RecentEmail {
  id: string
  subject: string
  recipient: string
  snippet: string
  /** ISO timestamp. */
  sent_at: string
  status: EmailStatus
  ai_generated?: boolean
}

interface RecentSentListProps {
  emails: ReadonlyArray<RecentEmail>
}

function relativeTime(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.round(diff / 60_000)
  if (min < 1) return 'now'
  if (min < 60) return `${min}m`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h`
  const days = Math.round(hr / 24)
  if (days < 7) return `${days}d`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const STATUS_LABELS: Record<EmailStatus, string> = {
  sent: 'Sent',
  draft: 'Draft',
  scheduled: 'Scheduled',
  bounced: 'Bounced',
  opened: 'Opened',
  replied: 'Replied',
  delivered: 'Delivered',
  'ai-generated': 'AI Drafted',
}

/**
 * Editorial activity feed for Signet's dashboard — each row shows the
 * subject (bold), one-line snippet, relative timestamp, status pill, and
 * an optional "AI Drafted" mark when the email was composed via the
 * copilot. Hover lift + soft shadow on each row.
 *
 * Translated from crm/ActivityFeed and personal-finance/ActivityRow
 * patterns, tuned for email metadata shapes.
 */
export function RecentSentList({ emails }: RecentSentListProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (emails.length === 0) {
    return (
      <div
        className={cm.cn(
          cm.sp('p', 8),
          cm.textCenter,
          'bg-surface-container-low rounded-2xl text-on-surface-variant',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-3xl block mb-2')} aria-hidden="true">
          outbox
        </span>
        <p className={cm.textSize('sm')}>
          {t(
            'recentSentList.empty',
            {},
            { defaultValue: 'No outgoing email yet — your first send will appear here.' },
          )}
        </p>
      </div>
    )
  }

  return (
    <ul className={cm.cn(cm.flex({ direction: 'col' }), 'gap-3')}>
      {emails.map((email) => (
        <li
          key={email.id}
          className={cm.cn(
            cm.sp('p', 4),
            'group bg-surface-container-lowest rounded-2xl border border-outline-variant/40',
            'hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer',
          )}
        >
          <div className={cm.flex({ justify: 'between', align: 'start' })}>
            <div className={cm.cn('min-w-0 flex-1')}>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
                <p
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('bold'),
                    'text-on-surface truncate',
                  )}
                >
                  {email.subject}
                </p>
                {email.ai_generated && (
                  <span
                    className={cm.cn(
                      'shrink-0 text-[9px] font-black uppercase tracking-widest',
                      cm.sp('px', 2),
                      cm.roundedFull,
                      'bg-primary/10 text-primary',
                    )}
                  >
                    {t('recentSentList.aiBadge', {}, { defaultValue: 'AI' })}
                  </span>
                )}
              </div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mt', 1),
                  'text-on-surface-variant font-medium',
                )}
              >
                {t(
                  'recentSentList.toLine',
                  { recipient: email.recipient },
                  { defaultValue: 'To {{recipient}}' },
                )}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mt', 2),
                  'text-on-surface-variant line-clamp-1 leading-relaxed',
                )}
              >
                {email.snippet}
              </p>
            </div>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'end', gap: 'sm' }),
                cm.sp('ml', 4),
                'shrink-0',
              )}
            >
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant whitespace-nowrap tabular-nums',
                )}
              >
                {relativeTime(email.sent_at)}
              </span>
              <StatusPill
                status={email.status}
                label={t(
                  `recentSentList.status.${email.status}`,
                  {},
                  { defaultValue: STATUS_LABELS[email.status] },
                )}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
