import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EnvBadge, type EnvTone } from './EnvBadge.js'
import { StatusDot, type StatusTone } from './StatusDot.js'

/**
 * Database connection card — IDE-card aesthetic with a coloured `border-l`
 * stripe keyed to the engine, a status row in the footer, and a 3-up
 * metric grid (size / tables / latency) above the action footer.
 *
 * Translated from the design baseline `design-database-admin-connections.html`
 * (3 cards: PG-Connected / Redis-Disconnected / MySQL-Slow) into a single
 * data-driven component reused on Connections, Schema sidebar, and the
 * Monitoring overview.
 */

export type DatabaseEngine = 'postgres' | 'mysql' | 'redis' | 'mongo' | 'sqlite'

const ENGINE_META: Record<DatabaseEngine, { color: string; icon: string; label: string }> = {
  postgres: { color: 'var(--color-db-postgres)', icon: 'database', label: 'PostgreSQL' },
  mysql: { color: 'var(--color-db-mysql)', icon: 'dns', label: 'MySQL' },
  redis: { color: 'var(--color-db-redis)', icon: 'memory', label: 'Redis' },
  mongo: { color: 'var(--color-db-mongo)', icon: 'circles', label: 'MongoDB' },
  sqlite: { color: 'var(--color-db-sqlite)', icon: 'storage', label: 'SQLite' },
}

export interface ConnectionCardData {
  id: string
  name: string
  engine: DatabaseEngine
  /** Human-readable version (e.g. "15.4"). */
  version?: string
  /** Hostname:port (rendered as inline mono). */
  host: string
  environment: EnvTone
  status: 'connected' | 'disconnected' | 'slow'
  /** Optional KPI grid values. */
  size?: string
  tables?: number | string
  latencyMs?: number
  /** Optional last-event message ("Connected 2m ago", "Failed 5m ago"). */
  lastEvent?: string
}

interface ConnectionCardProps {
  connection: ConnectionCardData
  /** Slot for an action button (`Open` / `Reconnect` / etc.). */
  action?: React.ReactNode
}

export function ConnectionCard({ connection, action }: ConnectionCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const meta = ENGINE_META[connection.engine]
  const statusTone: StatusTone =
    connection.status === 'connected'
      ? 'connected'
      : connection.status === 'disconnected'
        ? 'disconnected'
        : 'slow'

  return (
    <article
      data-mol-id={`connection-card-${connection.id}`}
      className={cm.cn(
        'group relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface',
        'transition-colors hover:border-primary/50',
      )}
    >
      <span
        aria-hidden="true"
        className={cm.cn('absolute left-0 top-0 bottom-0 w-1 opacity-80')}
        style={{ backgroundColor: meta.color }}
      />

      <div className={cm.cn('flex-1 p-4 pl-5 flex flex-col gap-3')}>
        <header className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'sm' }))}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <span
              className={cm.cn('inline-flex items-center justify-center rounded-md p-1.5')}
              style={{
                backgroundColor: `color-mix(in srgb, ${meta.color} 10%, transparent)`,
                color: meta.color,
              }}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-[20px]">{meta.icon}</span>
            </span>
            <div className={cm.cn(cm.flex({ direction: 'col' }))}>
              <h3 className={cm.cn('font-headline font-semibold text-text leading-tight')}>
                {connection.name}
              </h3>
              <span
                className={cm.cn(
                  'mt-0.5 inline-block self-start rounded border border-border bg-surface2 px-1.5 py-0.5 font-mono text-[10px] text-muted',
                )}
              >
                {meta.label}
                {connection.version ? ` ${connection.version}` : ''}
              </span>
            </div>
          </div>
          <EnvBadge tone={connection.environment} />
        </header>

        <p
          className={cm.cn(
            'truncate rounded border border-border/50 bg-background p-1.5 font-mono text-[11px] text-muted',
          )}
          title={connection.host}
        >
          {connection.host}
        </p>

        {connection.status === 'disconnected' ? (
          <div
            className={cm.cn(
              'flex items-center justify-center gap-2 rounded border border-dashed p-2 text-xs font-mono',
            )}
            style={{
              borderColor: 'color-mix(in srgb, var(--color-disconnected) 30%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--color-disconnected) 5%, transparent)',
              color: 'var(--color-disconnected)',
            }}
          >
            <StatusDot tone="disconnected" />
            {t('connectionCard.connectionRefused', {}, { defaultValue: 'Connection refused' })}
          </div>
        ) : (
          <dl className={cm.cn('mt-auto grid grid-cols-3 gap-2 text-xs')}>
            <div>
              <dt className={cm.cn('text-[10px] uppercase tracking-wider text-muted')}>
                {t('form.size', {}, { defaultValue: 'Size' })}
              </dt>
              <dd className={cm.cn('font-mono text-text')}>{connection.size ?? '—'}</dd>
            </div>
            <div>
              <dt className={cm.cn('text-[10px] uppercase tracking-wider text-muted')}>
                {t('connectionCard.tables', {}, { defaultValue: 'Tables' })}
              </dt>
              <dd className={cm.cn('font-mono text-text')}>{connection.tables ?? '—'}</dd>
            </div>
            <div className={cm.cn('text-right')}>
              <dt className={cm.cn('text-[10px] uppercase tracking-wider text-muted')}>
                {t('connectionCard.latency', {}, { defaultValue: 'Latency' })}
              </dt>
              <dd
                className={cm.cn('flex items-center justify-end gap-1 font-mono')}
                style={{
                  color:
                    connection.status === 'slow' ? 'var(--color-warn)' : 'var(--color-sql-column)',
                }}
              >
                <StatusDot tone={statusTone} size={5} flat />
                {connection.latencyMs != null ? `${connection.latencyMs}ms` : '—'}
              </dd>
            </div>
          </dl>
        )}
      </div>

      <footer
        className={cm.cn(
          'flex h-10 items-center justify-between border-t border-border bg-surface2/50 px-4',
        )}
      >
        <span className={cm.cn('font-mono text-[10px] text-muted')}>
          {connection.lastEvent ?? ''}
        </span>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
          {action ?? (
            <Link
              to={`/query/${connection.id}`}
              className={cm.cn(
                'rounded border border-primary/20 bg-primary/10 px-3 py-1 font-headline text-[11px] font-semibold text-primary',
                'transition-colors hover:border-primary hover:bg-primary hover:text-on-primary',
              )}
            >
              {t('common.open', {}, { defaultValue: 'Open' })}
            </Link>
          )}
        </div>
      </footer>
    </article>
  )
}
