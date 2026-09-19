import { useCallback, useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { type Severity, SeverityPill } from '../components/SeverityPill.js'
import { unwrapList } from '../lib/unwrap.js'

interface NotificationRow {
  id: string
  kind: 'page' | 'ack' | 'resolve' | 'escalate' | 'note' | 'assignment' | 'status' | 'system'
  severity: Severity
  title: string
  detail: string
  href?: string | null
  read: boolean
  created_at: string
}

const KIND_ICON: Record<NotificationRow['kind'], string> = {
  page: 'notifications_active',
  ack: 'how_to_reg',
  resolve: 'check_circle',
  escalate: 'moving',
  note: 'sticky_note_2',
  assignment: 'assignment_ind',
  status: 'swap_horiz',
  system: 'info',
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    setLoading(true)
    return http
      .get('/api/notifications')
      .then((res) => {
        setItems(unwrapList<NotificationRow>(res))
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load notifications.'),
      )
      .finally(() => setLoading(false))
  }, [http])

  useEffect(() => {
    refetch()
  }, [refetch])

  const unread = items.filter((i) => !i.read).length

  const onMarkAllRead = async () => {
    setMarking(true)
    try {
      await http.post('/api/notifications/read-all', {})
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notifications read.')
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-8')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t(
              'notifications.eyebrow',
              { app: APP_NAME.toLowerCase() },
              { defaultValue: '$ {{app}} inbox' },
            )}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('notifications.subheading', { unread }, { defaultValue: '{{unread}} unread' })}
          </p>
        </div>
        <button
          onClick={() => {
            if (!marking && unread > 0) onMarkAllRead()
          }}
          type="button"
          disabled={marking || unread === 0}
          className={cm.cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border transition-colors hover:bg-surface/5 disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          data-mol-id="notifications-mark-all-read"
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            done_all
          </span>
          {marking
            ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
            : t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
        </button>
      </header>

      {error ? (
        <p
          className={cm.cn(cm.sp('py', 4), cm.sp('px', 4), 'rounded-md text-xs mb-4')}
          style={{
            color: 'var(--color-severity-warning)',
            backgroundColor: 'var(--color-severity-warning-light)',
            border: '1px solid var(--color-severity-warning)',
          }}
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <p
          className={cm.cn(cm.sp('py', 16), cm.textCenter)}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : items.length === 0 ? (
        <div
          className={cm.cn(cm.sp('py', 16), cm.textCenter)}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl opacity-40 mb-3 inline-block')}
            aria-hidden="true"
          >
            inbox
          </span>
          <p className={cm.cn('text-sm')}>
            {t('notifications.empty', {}, { defaultValue: 'Nothing in your inbox.' })}
          </p>
        </div>
      ) : (
        <ul className={cm.cn('space-y-3')}>
          {items.map((item) => (
            <li
              key={item.id}
              className={cm.cn(
                'rounded-xl p-4 flex items-start gap-3 transition-all hover:-translate-y-0.5',
              )}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                opacity: item.read ? 0.78 : 1,
              }}
              data-mol-id={`activity-${item.id}`}
            >
              <span
                className={cm.cn('material-symbols-outlined text-base shrink-0 mt-0.5')}
                style={{ color: BRAND_COLOR }}
                aria-hidden="true"
              >
                {KIND_ICON[item.kind] ?? 'notifications'}
              </span>
              <div className={cm.cn('flex-1 min-w-0')}>
                <div className={cm.cn('flex items-center gap-2 flex-wrap')}>
                  <SeverityPill severity={item.severity} />
                  <p className={cm.cn('font-bold text-sm')} style={{ color: 'var(--color-text)' }}>
                    {item.title}
                  </p>
                  {!item.read ? (
                    <span
                      className={cm.cn('ml-1 h-1.5 w-1.5 rounded-full')}
                      style={{ backgroundColor: BRAND_COLOR }}
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
                <p
                  className={cm.cn('mt-1 font-mono text-xs')}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {item.detail}
                </p>
              </div>
              <span
                className={cm.cn('font-mono text-xs whitespace-nowrap mt-0.5')}
                style={{ color: 'var(--color-severity-muted)' }}
              >
                {fmtRelative(item.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
