import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DatabaseAdminLayout } from '../components/DatabaseAdminLayout.js'
import { apiDelete, apiGet, apiPost } from '../lib/api.js'

interface Connection {
  id: string
  name: string
  host: string
  port: number
  database_name: string
  username: string
  ssl: boolean
  color: string
  driver: string
}

export function Connections() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [items, setItems] = useState<Connection[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [probeStatus, setProbeStatus] = useState<Record<string, 'ok' | 'fail' | 'pending'>>({})

  const refetch = useCallback(async () => {
    try {
      const res = await apiGet<Connection[]>(http, '/api/connections')
      setItems(Array.isArray(res) ? res : [])
      setError(null)
    } catch (e) {
      setError((e as Error).message ?? 'load failed')
      setItems([])
    }
  }, [http])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const onTest = useCallback(
    async (id: string) => {
      setProbeStatus((s) => ({ ...s, [id]: 'pending' }))
      try {
        const res = await apiPost<{ success: boolean }>(http, `/api/connections/${id}/test`, {})
        const ok = res?.success ?? false
        setProbeStatus((s) => ({ ...s, [id]: ok ? 'ok' : 'fail' }))
        track({
          name: 'connection.tested',
          properties: { connection_id: id, status: ok ? 'ok' : 'fail' },
        })
      } catch (_error) {
        // probe failure is already reflected via setProbeStatus('fail') above
        setProbeStatus((s) => ({ ...s, [id]: 'fail' }))
        track({ name: 'connection.tested', properties: { connection_id: id, status: 'fail' } })
      }
    },
    [http],
  )

  const onDelete = useCallback(
    async (id: string) => {
      if (
        !window.confirm(
          t('connections.confirmDelete', {}, { defaultValue: 'Delete this connection?' }),
        )
      )
        return
      try {
        await apiDelete(http, `/api/connections/${id}`)
        track({ name: 'connection.deleted', properties: { connection_id: id } })
      } catch (_error) {
        /* ignore — refetch will reflect actual state */
      }
      await refetch()
    },
    [http, refetch, t],
  )

  return (
    <DatabaseAdminLayout
      topAction={
        <button
          type="button"
          onClick={() => navigate('/connections/new')}
          data-mol-id="connections-new"
          className={cm.cn(
            'inline-flex h-7 items-center gap-1 rounded bg-primary px-3 py-1 font-headline font-bold text-on-primary',
            'transition-colors hover:bg-primary/90',
          )}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
            add
          </span>
          {t('connections.new', {}, { defaultValue: 'New connection' })}
        </button>
      }
    >
      <div
        data-mol-id="connections-page"
        className={cm.cn('flex-1 overflow-y-auto p-6 space-y-6')}
        aria-label={t('nav.connections', {}, { defaultValue: 'Connections' })}
      >
        <header className={cm.cn('flex items-center justify-between')}>
          <div>
            <h1 className={cm.cn('text-2xl font-bold')}>
              {t('nav.connections', {}, { defaultValue: 'Connections' })}
            </h1>
            <p className={cm.cn('text-sm text-muted')}>
              {t('connections.subtitle', {}, { defaultValue: 'Manage your database connections.' })}
            </p>
          </div>
        </header>

        {items === null ? (
          <div className={cm.cn('text-sm text-muted')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </div>
        ) : items.length === 0 ? (
          <div
            data-mol-id="connections-empty"
            className={cm.cn(
              'rounded border border-border bg-surface p-6 text-center text-sm text-muted',
            )}
          >
            {error ??
              t(
                'connections.empty',
                {},
                {
                  defaultValue: 'No connections yet. Create one to get started.',
                },
              )}
          </div>
        ) : (
          <ul className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4')}>
            {items.map((c) => (
              <li
                key={c.id}
                data-mol-id={`connection-card-${c.id}`}
                data-conn-name={c.name}
                className={cm.cn('rounded border border-border bg-surface p-4 space-y-2')}
              >
                <div className={cm.cn('flex items-center justify-between')}>
                  <h3 className={cm.cn('text-base font-semibold')}>{c.name}</h3>
                  <span className={cm.cn('text-xs text-muted')}>{c.driver}</span>
                </div>
                <div className={cm.cn('font-mono text-xs text-muted')}>
                  {c.host}:{c.port}/{c.database_name}
                </div>
                <div className={cm.cn('flex flex-wrap gap-2 pt-2')}>
                  <button
                    type="button"
                    data-mol-id={`connection-test-${c.id}`}
                    onClick={() => onTest(c.id)}
                    className={cm.cn('rounded border border-border px-3 py-1.5 text-xs')}
                  >
                    {t('connections.test', {}, { defaultValue: 'Test' })}
                  </button>
                  <Link
                    to={`/query/${c.id}`}
                    data-mol-id={`connection-open-${c.id}`}
                    className={cm.cn('rounded border border-border px-3 py-1.5 text-xs')}
                  >
                    {t('common.open', {}, { defaultValue: 'Open' })}
                  </Link>
                  <Link
                    to={`/schema/${c.id}`}
                    data-mol-id={`connection-schema-${c.id}`}
                    className={cm.cn('rounded border border-border px-3 py-1.5 text-xs')}
                  >
                    {t('connections.schema', {}, { defaultValue: 'Schema' })}
                  </Link>
                  <Link
                    to={`/connections/${c.id}/edit`}
                    data-mol-id={`connection-edit-${c.id}`}
                    className={cm.cn('rounded border border-border px-3 py-1.5 text-xs')}
                  >
                    {t('common.edit', {}, { defaultValue: 'Edit' })}
                  </Link>
                  <button
                    type="button"
                    data-mol-id={`connection-delete-${c.id}`}
                    onClick={() => onDelete(c.id)}
                    className={cm.cn(
                      'rounded border border-error/40 px-3 py-1.5 text-xs text-error',
                    )}
                  >
                    {t('common.delete', {}, { defaultValue: 'Delete' })}
                  </button>
                </div>
                {probeStatus[c.id] === 'ok' && (
                  <div data-mol-id="probe-ok" className={cm.cn('text-xs text-primary')}>
                    {t('connections.probeOk', {}, { defaultValue: 'Connected.' })}
                  </div>
                )}
                {probeStatus[c.id] === 'fail' && (
                  <div data-mol-id="probe-fail" className={cm.cn('text-xs text-error')}>
                    {t('connections.probeFail', {}, { defaultValue: 'Connection failed.' })}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </DatabaseAdminLayout>
  )
}

export default Connections
