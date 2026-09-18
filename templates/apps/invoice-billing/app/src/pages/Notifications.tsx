import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface NotificationItem {
  id: string
  kind: string
  title: string
  message: string
  invoice_id?: string | null
  invoice_number?: string | null
  amount_cents?: number | null
  occurred_at: string
  read: boolean
}

interface NotificationsResponse {
  data: NotificationItem[]
  unreadCount: number
}

const formatRelative = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

const KIND_THEME: Record<string, { icon: string; color: string }> = {
  invoice_paid: { icon: 'paid', color: 'var(--color-paid)' },
  invoice_sent: { icon: 'send', color: 'var(--mol-color-primary)' },
  invoice_overdue: { icon: 'schedule', color: 'var(--color-overdue)' },
  invoice_created: { icon: 'edit_note', color: 'var(--color-draft)' },
  paid: { icon: 'paid', color: 'var(--color-paid)' },
  sent: { icon: 'send', color: 'var(--mol-color-primary)' },
  overdue: { icon: 'schedule', color: 'var(--color-overdue)' },
  draft: { icon: 'edit_note', color: 'var(--color-draft)' },
  recurring: { icon: 'autorenew', color: 'var(--color-partial)' },
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    try {
      const r = await http.get<NotificationsResponse>('/api/notifications')
      const list = Array.isArray(r.data?.data) ? r.data.data : []
      setItems(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notifications')
    }
  }, [http])

  useEffect(() => {
    void reload()
  }, [reload])

  const markAllRead = async () => {
    setBusy(true)
    try {
      await http.post('/api/notifications/read-all', {})
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark as read')
    } finally {
      setBusy(false)
    }
  }

  const unreadCount = items.filter((i) => !i.read).length

  return (
    <div data-mol-id="page-notifications" className={cm.cn(cm.mxAuto, 'max-w-3xl')}>
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}
        style={{ flexWrap: 'wrap', gap: '12px' }}
      >
        <div>
          <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p className={cm.textMuted} style={{ marginTop: '4px', fontSize: '13px' }}>
            {unreadCount > 0
              ? t(
                  'common.countUnread',
                  { count: unreadCount },
                  { defaultValue: '{{count}} unread' },
                )
              : t('notifications.allRead', {}, { defaultValue: "You're all caught up." })}
          </p>
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={markAllRead}
            disabled={busy}
            data-action="mark-all-read"
            style={{
              padding: '8px 16px',
              borderRadius: '9999px',
              backgroundColor: 'var(--color-primary-dark)',
              color: 'var(--color-sidebar-text-active)',
              fontWeight: 600,
              fontSize: '13px',
              border: 'none',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
          </button>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            backgroundColor: 'var(--color-overdue-light)',
            color: 'var(--color-danger-hover)',
            borderRadius: '12px',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      ) : null}

      <ul
        style={{ listStyle: 'none', padding: 0, margin: '24px 0 0', display: 'grid', gap: '8px' }}
      >
        {items.length === 0 ? (
          <li
            style={{
              padding: '32px',
              borderRadius: '14px',
              border: '1px dashed var(--mol-color-border)',
              backgroundColor: 'var(--mol-color-surface-secondary)',
              textAlign: 'center',
              color: 'var(--mol-color-text-tertiary)',
              fontSize: '14px',
            }}
          >
            {t(
              'notifications.empty',
              {},
              { defaultValue: 'No activity yet — actions will appear here.' },
            )}
          </li>
        ) : (
          items.map((n) => {
            const theme = KIND_THEME[n.kind] ?? {
              icon: 'notifications',
              color: 'var(--mol-color-text-secondary)',
            }
            const link = n.invoice_id ? `/invoices/${n.invoice_id}` : '/invoices'
            return (
              <li
                key={n.id}
                data-testid={`notification-${n.id}`}
                data-read={n.read ? 'true' : 'false'}
                style={{
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: '1px solid var(--mol-color-border)',
                  backgroundColor: n.read
                    ? 'var(--mol-color-surface)'
                    : 'var(--mol-color-primary-light)',
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr auto',
                  gap: '14px',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--mol-color-surface)',
                    color: theme.color,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--mol-color-border)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    {theme.icon}
                  </span>
                </span>
                <Link to={link} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div
                    style={{ fontSize: '14px', fontWeight: 600, color: 'var(--mol-color-text)' }}
                  >
                    {n.title}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--mol-color-text-secondary)',
                      marginTop: '2px',
                    }}
                  >
                    {n.message}
                  </div>
                </Link>
                <div style={{ textAlign: 'right' }}>
                  {n.amount_cents != null ? (
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: theme.color,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatCurrency(n.amount_cents)}
                    </div>
                  ) : null}
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--mol-color-text-tertiary)',
                      marginTop: '2px',
                    }}
                  >
                    {formatRelative(n.occurred_at)}
                  </div>
                </div>
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}

export default Notifications
