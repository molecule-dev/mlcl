import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface AuditEntry {
  id: string
  timestamp: string
  actor: string
  action: string
  resource: string
  resource_id: string | null
  details: Record<string, unknown> | null
}

const FILTERS = ['all', 'employee', 'pay_run', 'deduction'] as const
type Filter = (typeof FILTERS)[number]

const RESOURCE_STYLES: Record<string, { bg: string; fg: string; icon: string }> = {
  employee: { bg: 'var(--mol-color-info-light)', fg: 'var(--mol-color-info)', icon: 'badge' },
  pay_run: {
    bg: 'var(--mol-color-success-light)',
    fg: 'var(--mol-color-success)',
    icon: 'event_available',
  },
  deduction: {
    bg: 'var(--mol-color-warning-light)',
    fg: 'var(--mol-color-warning)',
    icon: 'receipt_long',
  },
  default: {
    bg: 'var(--mol-color-secondary-light)',
    fg: 'var(--mol-color-secondary)',
    icon: 'history',
  },
}

export function AuditLog() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [entries, setEntries] = useState<AuditEntry[]>([])

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/audit-log')
      .then((res) => {
        if (!cancelled) setEntries(unwrapList<AuditEntry>(res))
      })
      .catch(() => {
        if (!cancelled) setEntries([])
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filter !== 'all' && e.resource !== filter) return false
      if (search) {
        const term = search.toLowerCase()
        if (
          !e.actor.toLowerCase().includes(term) &&
          !e.action.toLowerCase().includes(term) &&
          !e.resource.toLowerCase().includes(term)
        )
          return false
      }
      return true
    })
  }, [entries, filter, search])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('auditLog.eyebrow', {}, { defaultValue: 'Compliance' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('nav.auditLog', {}, { defaultValue: 'Audit log' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'auditLog.subheading',
            {},
            {
              defaultValue:
                'Every approval, edit, and tax filing — with the actor, timestamp, and changed fields.',
            },
          )}
        </p>
      </header>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
          cm.sp('p', 4),
          'bg-surface-container-lowest rounded-2xl shadow-sm',
        )}
      >
        <div className={cm.cn('relative min-w-0', cm.flex1)}>
          <span
            className={cm.cn(
              `material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base`,
            )}
            aria-hidden="true"
          >
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              'auditLog.searchPlaceholder',
              {},
              { defaultValue: 'Search by actor, action, or description' },
            )}
            aria-label={t('auditLog.searchAria', {}, { defaultValue: 'Search audit log' })}
            className={cm.cn(
              cm.w('full'),
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.roundedFull,
              'bg-surface-container-low border-none focus:ring-2 ring-primary/30 placeholder:text-on-surface-variant',
            )}
          />
        </div>
        <div className={cm.flex({ align: 'center', gap: 'xs' })}>
          {FILTERS.map((f) => {
            const isActive = filter === f
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'uppercase tracking-widest transition-colors',
                  isActive
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {t(
                  `auditLog.filter.${f}`,
                  {},
                  { defaultValue: f === 'all' ? 'All' : f.replace('_', ' ') },
                )}
              </button>
            )
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'auditLog.empty',
            {},
            {
              defaultValue:
                'No audit events match your filters yet. Edit an employee or process a pay run and they\u2019ll show up here.',
            },
          )}
        </p>
      ) : (
        <ul className={cm.stack(2)}>
          {filtered.map((entry) => {
            const style = RESOURCE_STYLES[entry.resource] ?? RESOURCE_STYLES.default
            return (
              <li
                key={entry.id}
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 'md' }),
                  cm.sp('p', 5),
                  'rounded-xl bg-surface-container-lowest shadow-sm hover:bg-surface-container-low transition-colors',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    'shrink-0',
                  )}
                  style={{ backgroundColor: style.bg, color: style.fg }}
                  aria-hidden="true"
                >
                  <span className={cm.cn(`material-symbols-outlined text-xl`)}>{style.icon}</span>
                </span>
                <div className={cm.flex1}>
                  <div
                    className={cm.flex({
                      align: 'center',
                      justify: 'between',
                      wrap: 'wrap',
                      gap: 'sm',
                    })}
                  >
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                      <span className="font-bold">{entry.actor}</span>
                    </p>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant tabular-nums font-mono',
                      )}
                    >
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface')}>
                    <code
                      className={cm.cn(
                        `text-xs font-mono bg-surface-container px-2 py-0.5 rounded text-on-surface-variant`,
                      )}
                    >
                      {entry.resource}.{entry.action}
                    </code>
                    {entry.resource_id ? (
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant ml-2 font-mono',
                        )}
                      >
                        {entry.resource_id.slice(0, 8)}…
                      </span>
                    ) : null}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
