import { useCallback, useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { unwrapList } from '../lib/unwrap.js'

type AuditKind =
  | 'sign_in'
  | 'sign_out'
  | 'password_change'
  | 'transfer'
  | 'account_link'
  | 'device_added'
  | 'permission_change'

interface AuditEvent {
  id: string
  kind: AuditKind
  description: string
  ip_address: string
  user_agent_brief: string
  occurred_at: string
  status: 'success' | 'failed'
}

const KIND_ICON: Record<AuditKind, string> = {
  sign_in: 'login',
  sign_out: 'logout',
  password_change: 'lock_reset',
  transfer: 'swap_horiz',
  account_link: 'link',
  device_added: 'phone_iphone',
  permission_change: 'shield',
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function AuditLog() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Extracted so the shared LoadErrorBanner's Retry can re-run the same
  // fetch the mount effect uses (the banner owns the retry pending state).
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get('/api/audit_events')
      setEvents(unwrapList<AuditEvent>(res.data))
    } catch (_error) {
      setError(t('audit.loadError', {}, { defaultValue: 'Failed to load audit log.' }))
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void load()
  }, [load])

  const successCount = events.filter((e) => e.status === 'success').length
  const failedCount = events.filter((e) => e.status === 'failed').length

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('audit.eyebrow', {}, { defaultValue: 'Security & access' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.auditLog', {}, { defaultValue: 'Audit log' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mt', 1))}>
          {t(
            'audit.subheading',
            {},
            {
              defaultValue: 'Every sign-in, transfer, and account change. Available for 24 months.',
            },
          )}
        </p>

        {/* Summary chips — §6.3 status pills */}
        {!loading && !error && events.length > 0 ? (
          <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 4))}>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-success-light text-success uppercase tracking-wider',
              )}
            >
              {t(
                'audit.successCount',
                { count: successCount },
                { defaultValue: '{{count}} successful' },
              )}
            </span>
            {failedCount > 0 ? (
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'bg-error-light text-error uppercase tracking-wider',
                )}
              >
                {t(
                  'audit.failedCount',
                  { count: failedCount },
                  { defaultValue: '{{count}} failed' },
                )}
              </span>
            ) : null}
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-surface-container text-on-surface-variant uppercase tracking-wider',
              )}
            >
              {t('audit.totalCount', { count: events.length }, { defaultValue: '{{count}} total' })}
            </span>
          </div>
        ) : null}
      </header>

      {error ? (
        <LoadErrorBanner message={error} onRetry={load} />
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : events.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('audit.empty', {}, { defaultValue: 'No events yet.' })}
        </p>
      ) : (
        <ul className={cm.cn(cm.card(), 'divide-y divide-outline-variant')}>
          {events.map((e) => (
            <li
              key={e.id}
              className={cm.cn(cm.sp('p', 4), cm.flex({ align: 'center', gap: 'md' }))}
            >
              <div
                className={cm.cn(
                  cm.shrink0,
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  'h-9 w-9',
                  e.status === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error',
                )}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {KIND_ICON[e.kind]}
                </span>
              </div>
              <div className={cm.flex1}>
                <p className={cm.fontWeight('medium')}>{e.description}</p>
                <p className={cm.cn(cm.textSize('xs'), cm.textMuted, 'font-mono')}>
                  {e.ip_address} · {e.user_agent_brief} · {fmtDateTime(e.occurred_at)}
                </p>
              </div>
              {e.status === 'failed' ? (
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.textSize('xs'),
                    cm.fontWeight('medium'),
                    cm.roundedFull,
                    'bg-error/10 text-error font-mono uppercase',
                  )}
                >
                  {t('status.failed', {}, { defaultValue: 'Failed' })}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
