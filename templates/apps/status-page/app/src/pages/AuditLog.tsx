import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList } from '../lib/unwrap.js'

interface AuditEvent {
  id: string
  actor: string
  actor_initial: string
  action: string
  target: string
  summary: string
  scope:
    'incidents' | 'maintenance' | 'components' | 'subscribers' | 'settings' | 'billing' | 'team'
  created_at: string
}

const SCOPE_TINT: Record<AuditEvent['scope'], { bg: string; text: string; icon: string }> = {
  incidents: { bg: 'rgba(239, 68, 68, 0.18)', text: '#fca5a5', icon: 'warning' },
  maintenance: { bg: 'rgba(99, 102, 241, 0.18)', text: '#a5b4fc', icon: 'build_circle' },
  components: { bg: 'rgba(16, 185, 129, 0.18)', text: '#6ee7b7', icon: 'lan' },
  subscribers: { bg: 'rgba(245, 158, 11, 0.18)', text: '#fcd34d', icon: 'mail' },
  settings: { bg: 'rgba(148, 163, 184, 0.18)', text: '#cbd5e1', icon: 'settings' },
  billing: { bg: 'rgba(99, 102, 241, 0.18)', text: '#a5b4fc', icon: 'credit_card' },
  team: { bg: 'rgba(16, 185, 129, 0.18)', text: '#6ee7b7', icon: 'group' },
}

const SCOPE_LABEL: Record<AuditEvent['scope'], string> = {
  incidents: 'Incidents',
  maintenance: 'Maintenance',
  components: 'Components',
  subscribers: 'Subscribers',
  settings: 'Settings',
  billing: 'Billing',
  team: 'Team',
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })} ${d.getUTCDate()} · ${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')} UTC`
}

export function AuditLog() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [filter, setFilter] = useState<'all' | AuditEvent['scope']>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/audit')
      .then((res) => {
        if (!cancelled) setEvents(unwrapList<AuditEvent>(res))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const visible = useMemo(
    () => (filter === 'all' ? events : events.filter((e) => e.scope === filter)),
    [filter, events],
  )

  const filters: { key: 'all' | AuditEvent['scope']; label: string }[] = [
    { key: 'all', label: t('status.all', {}, { defaultValue: 'All' }) },
    { key: 'incidents', label: t('auditLog.filter.incidents', {}, { defaultValue: 'Incidents' }) },
    {
      key: 'maintenance',
      label: t('auditLog.filter.maintenance', {}, { defaultValue: 'Maintenance' }),
    },
    {
      key: 'components',
      label: t('auditLog.filter.components', {}, { defaultValue: 'Components' }),
    },
    { key: 'subscribers', label: t('nav.subscribers', {}, { defaultValue: 'Subscribers' }) },
    { key: 'settings', label: t('nav.settings', {}, { defaultValue: 'Settings' }) },
  ]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))} data-mol-id="page-audit-log">
      <header className={cm.cn('mb-8')}>
        <p
          className={cm.cn(
            'font-mono text-xs font-bold uppercase tracking-widest text-primary mb-2',
          )}
        >
          {t('auditLog.eyebrow', { app: APP_NAME }, { defaultValue: '$ {{app}} audit --tail' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.auditLog', {}, { defaultValue: 'Audit log' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'auditLog.subheading',
            {},
            {
              defaultValue:
                'Every state-changing action — by humans and machines — captured for postmortems and compliance.',
            },
          )}
        </p>
      </header>

      <div className={cm.cn('flex flex-wrap items-center gap-2 mb-4')}>
        {filters.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cm.cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-xs font-bold uppercase tracking-widest transition-colors',
              )}
              style={{
                backgroundColor: active ? 'rgba(16, 185, 129, 0.20)' : 'rgba(30, 41, 59, 0.6)',
                color: active ? 'var(--color-link-hover)' : 'var(--color-chip-text)',
                border: `1px solid ${active ? 'rgba(16, 185, 129, 0.40)' : 'var(--color-border-card)'}`,
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <ol
          className={cm.cn('rounded-2xl overflow-hidden')}
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--color-border-card)',
          }}
        >
          {visible.map((e) => {
            const tint = SCOPE_TINT[e.scope] ?? SCOPE_TINT.settings
            return (
              <li
                key={e.id}
                className={cm.cn('px-5 py-4 border-b last:border-b-0')}
                style={{ borderColor: 'var(--color-border-card)' }}
              >
                <div className={cm.cn('flex items-start gap-4')}>
                  <span
                    className={cm.cn(
                      'inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold shrink-0',
                    )}
                    style={{
                      backgroundColor: 'rgba(99, 102, 241, 0.25)',
                      color: '#c7d2fe',
                      border: '2px solid rgba(15, 23, 42, 0.6)',
                    }}
                    aria-hidden="true"
                  >
                    {e.actor_initial}
                  </span>
                  <div className={cm.cn('flex-1 min-w-0')}>
                    <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
                      <span
                        className={cm.cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-extrabold uppercase tracking-widest',
                        )}
                        style={{ backgroundColor: tint.bg, color: tint.text }}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-[11px]')}
                          aria-hidden="true"
                        >
                          {tint.icon}
                        </span>
                        {t(
                          `auditLog.scope.${e.scope}`,
                          {},
                          { defaultValue: SCOPE_LABEL[e.scope] ?? e.scope },
                        )}
                      </span>
                      <span
                        className={cm.cn(
                          'font-mono text-[11px] font-extrabold text-on-surface truncate',
                        )}
                      >
                        {e.action}
                      </span>
                      <span
                        className={cm.cn('font-mono text-[11px] text-on-surface-variant ml-auto')}
                      >
                        {fmtTimestamp(e.created_at)}
                      </span>
                    </div>
                    <p className={cm.cn('mt-1 text-sm text-on-surface')}>{e.summary}</p>
                    <p className={cm.cn('mt-0.5 font-mono text-[11px] text-on-surface-variant')}>
                      <span className={cm.cn('opacity-70')}>{e.actor}</span>
                      <span className={cm.cn('mx-1.5 opacity-50')}>→</span>
                      <span>{e.target}</span>
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
          {visible.length === 0 ? (
            <li className={cm.cn('px-5 py-12 text-center text-on-surface-variant text-sm')}>
              {t('auditLog.empty', {}, { defaultValue: 'No audit events for this scope yet.' })}
            </li>
          ) : null}
        </ol>
      )}
    </div>
  )
}
