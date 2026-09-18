import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Editorial activity feed — tinted icon disc, action verb in semibold + subject,
 * relative time, optional amount in tabular-nums. Used on Dashboard right rail
 * and ClientDetail timeline panel.
 *
 * Translated from crm/ActivityFeed.tsx + personal-finance/ActivityRow.tsx —
 * the icon-vocab is keyed to invoice-domain events (sent, paid, viewed, ...).
 */

export type ActivityKind = 'sent' | 'paid' | 'viewed' | 'overdue' | 'created' | 'recurring'

const ACTIVITY_THEME: Record<ActivityKind, { icon: string; bg: string; fg: string }> = {
  sent: { icon: 'send', bg: 'var(--color-sent-light)', fg: 'var(--color-sent)' },
  paid: { icon: 'paid', bg: 'var(--color-paid-light)', fg: 'var(--color-paid)' },
  viewed: { icon: 'visibility', bg: 'var(--color-viewed-light)', fg: 'var(--color-viewed)' },
  overdue: { icon: 'schedule', bg: 'var(--color-overdue-light)', fg: 'var(--color-overdue)' },
  created: {
    icon: 'edit_note',
    bg: 'var(--mol-color-primary-light)',
    fg: 'var(--mol-color-primary-dark)',
  },
  recurring: {
    icon: 'autorenew',
    bg: 'var(--color-recurring-light)',
    fg: 'var(--color-recurring)',
  },
}

export interface ActivityItem {
  id: string
  kind: ActivityKind
  invoice_number?: string
  client_name: string
  message: string
  amount_cents?: number
  occurred_at: string
}

interface ActivityFeedProps {
  items: ActivityItem[]
  title?: string
}

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

const relativeShort = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ActivityFeed({ items, title }: ActivityFeedProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      data-mol-id="activity-feed"
      className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}
      style={{ border: '1px solid var(--mol-color-border)' }}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
        <h3
          className={cm.cn(cm.fontWeight('bold'))}
          style={{ fontSize: '16px', color: 'var(--mol-color-text)', letterSpacing: '-0.01em' }}
        >
          {title ?? t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
        </h3>
        <span
          style={{
            fontSize: '11px',
            color: 'var(--mol-color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontWeight: 700,
          }}
        >
          {t('status.live', {}, { defaultValue: 'Live' })}
        </span>
      </div>

      {items.length === 0 ? (
        <div
          style={{
            padding: '32px 8px',
            textAlign: 'center',
            color: 'var(--mol-color-text-tertiary)',
            fontSize: '14px',
          }}
        >
          {t(
            'activityFeed.empty',
            {},
            { defaultValue: 'No activity yet — send your first invoice.' },
          )}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map((it, idx) => {
            const theme = ACTIVITY_THEME[it.kind] ?? ACTIVITY_THEME.created
            return (
              <li
                key={it.id}
                className={cm.cn(cm.flex({ align: 'start', gap: 'md' }))}
                style={{
                  padding: '12px 0',
                  borderTop: idx === 0 ? 'none' : '1px solid var(--color-draft-light)',
                }}
              >
                <span
                  className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: theme.bg,
                    color: theme.fg,
                    flexShrink: 0,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {theme.icon}
                  </span>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className={cm.cn(cm.fontWeight('semibold'))}
                    style={{ fontSize: '13px', color: 'var(--mol-color-text)' }}
                  >
                    {it.message}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--mol-color-text-secondary)',
                      marginTop: '2px',
                    }}
                    className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
                  >
                    {it.invoice_number ? (
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          color: 'var(--color-primary-dark)',
                          fontWeight: 600,
                        }}
                      >
                        {it.invoice_number}
                      </span>
                    ) : null}
                    {it.invoice_number ? <span>·</span> : null}
                    <span>{it.client_name}</span>
                    <span>·</span>
                    <span>{relativeShort(it.occurred_at)}</span>
                  </div>
                </div>
                {typeof it.amount_cents === 'number' ? (
                  <span
                    className={cm.cn(cm.fontWeight('bold'))}
                    style={{
                      fontSize: '14px',
                      color: it.kind === 'paid' ? 'var(--color-paid)' : 'var(--mol-color-text)',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatCurrency(it.amount_cents)}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default ActivityFeed
