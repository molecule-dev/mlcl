import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DatabaseAdminLayout } from '../components/DatabaseAdminLayout.js'
import { apiDelete, apiGet, apiPost, apiPut } from '../lib/api.js'

interface SavedRow {
  id: string
  connection_id: string | null
  name: string
  sql: string
  description: string
  updated_at: string
}

interface ExecuteResult {
  rows: Array<Record<string, unknown>>
  row_count: number
  fields?: Array<{ name: string }>
  duration_ms?: number
}

export function SavedQueryDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { queryId } = useParams<{ queryId: string }>()
  const [row, setRow] = useState<SavedRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [sql, setSql] = useState('')
  const [savedOk, setSavedOk] = useState(false)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ExecuteResult | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  useEffect(() => {
    if (!queryId) return
    setError(null)
    void apiGet<SavedRow>(http, `/api/queries/saved/${queryId}`)
      .then((res) => {
        setRow(res)
        setName(res.name)
        setSql(res.sql)
      })
      .catch((e: Error) => setError(e.message ?? 'load failed'))
  }, [http, queryId])

  const onSave = useCallback(async () => {
    if (!queryId) return
    setSavedOk(false)
    setError(null)
    try {
      await apiPut(http, `/api/queries/saved/${queryId}`, { name, sql })
      setSavedOk(true)
    } catch (e) {
      setError((e as Error).message ?? 'save failed')
    }
  }, [http, queryId, name, sql])

  const onRun = useCallback(async () => {
    if (!row?.connection_id) {
      setRunError(
        t('savedQuery.noConnection', {}, { defaultValue: 'No connection bound to this snippet.' }),
      )
      return
    }
    setRunning(true)
    setRunError(null)
    setResult(null)
    try {
      const res = await apiPost<ExecuteResult>(http, '/api/queries/execute', {
        connection_id: row.connection_id,
        sql,
      })
      setResult(res)
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      setRunError(err?.response?.data?.error ?? err?.message ?? 'execution failed')
    } finally {
      setRunning(false)
    }
  }, [http, row, sql, t])

  const onDelete = useCallback(async () => {
    if (!queryId) return
    if (
      !window.confirm(t('savedQuery.confirmDelete', {}, { defaultValue: 'Delete this snippet?' }))
    )
      return
    try {
      await apiDelete(http, `/api/queries/saved/${queryId}`)
      navigate('/history')
    } catch (e) {
      setError((e as Error).message ?? 'delete failed')
    }
  }, [http, navigate, queryId, t])

  if (!row) {
    return (
      <DatabaseAdminLayout>
        <div data-mol-id="sqd-page" className={cm.cn('flex-1 overflow-y-auto p-6')}>
          {error ?? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      </DatabaseAdminLayout>
    )
  }

  return (
    <DatabaseAdminLayout>
      <div
        data-mol-id="sqd-page"
        className={cm.cn('flex-1 overflow-y-auto p-6 space-y-4')}
        aria-label={t('savedQuery.title', {}, { defaultValue: 'Saved query' })}
      >
        <header className={cm.cn('flex items-center justify-between')}>
          <h1 className={cm.cn('text-2xl font-bold')}>
            {t('savedQuery.title', {}, { defaultValue: 'Saved query' })}
          </h1>
          <Link to="/history" className={cm.cn('text-xs underline')}>
            {t('common.back', {}, { defaultValue: 'Back to history' })}
          </Link>
        </header>

        <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
          <div className={cm.cn('space-y-1')}>
            <label className={cm.cn('block text-xs uppercase text-muted')} htmlFor="sqd-name">
              {t('form.name', {}, { defaultValue: 'Name' })}
            </label>
            <input
              id="sqd-name"
              data-mol-id="sqd-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cm.cn(
                'h-10 w-full rounded border border-border bg-bg px-3 font-mono text-sm text-text focus:border-primary focus:outline-none',
              )}
            />
          </div>
          <div className={cm.cn('space-y-1')}>
            <span className={cm.cn('block text-xs uppercase text-muted')}>
              {t('savedQuery.connection', {}, { defaultValue: 'Connection' })}
            </span>
            <div
              className={cm.cn(
                'h-10 w-full rounded border border-border bg-bg px-3 font-mono text-sm text-muted flex items-center',
              )}
            >
              {row.connection_id ?? t('savedQuery.notBound', {}, { defaultValue: 'Not bound' })}
            </div>
          </div>
        </div>

        <textarea
          data-mol-id="sqd-sql"
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          className={cm.cn(
            'h-48 w-full rounded border border-border bg-bg p-3 font-mono text-sm text-text focus:border-primary focus:outline-none',
          )}
        />

        <div className={cm.cn('flex flex-wrap items-center gap-3')}>
          <button
            type="button"
            data-mol-id="sqd-save"
            onClick={onSave}
            className={cm.cn('rounded bg-primary px-3 py-2 text-sm font-bold text-on-primary')}
          >
            {t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
          </button>
          <button
            type="button"
            data-mol-id="sqd-run"
            onClick={onRun}
            disabled={running}
            className={cm.cn('rounded border border-border px-3 py-2 text-sm')}
          >
            {running
              ? t('common.runningEllipsis', {}, { defaultValue: 'Running…' })
              : t('common.run', {}, { defaultValue: 'Run' })}
          </button>
          <button
            type="button"
            data-mol-id="sqd-delete"
            onClick={onDelete}
            className={cm.cn('rounded border border-error/40 px-3 py-2 text-sm text-error')}
          >
            {t('common.delete', {}, { defaultValue: 'Delete' })}
          </button>
          {savedOk && (
            <span data-mol-id="sqd-saved-ok" className={cm.cn('text-xs text-primary')}>
              {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
            </span>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className={cm.cn(
              'rounded border border-error/30 bg-error/10 px-3 py-2 text-xs text-error',
            )}
          >
            {error}
          </div>
        )}
        {runError && (
          <div
            role="alert"
            data-mol-id="sqd-run-error"
            className={cm.cn(
              'rounded border border-error/30 bg-error/10 px-3 py-2 text-xs text-error',
            )}
          >
            {runError}
          </div>
        )}
        {result && (
          <div
            data-mol-id="sqd-result"
            className={cm.cn('rounded border border-border bg-surface p-3')}
          >
            <div className={cm.cn('text-xs text-muted mb-2')}>
              {t(
                'queryEditor.resultMeta',
                { rows: result.row_count, ms: result.duration_ms ?? 0 },
                { defaultValue: `${result.row_count} rows · ${result.duration_ms ?? 0} ms` },
              )}
            </div>
            <div className={cm.cn('overflow-x-auto')}>
              <table className={cm.cn('w-full text-xs font-mono')}>
                <thead>
                  <tr>
                    {(result.fields && result.fields.length > 0
                      ? result.fields.map((f) => f.name)
                      : result.rows[0]
                        ? Object.keys(result.rows[0])
                        : []
                    ).map((col) => (
                      <th
                        key={col}
                        className={cm.cn('text-left text-muted px-2 py-1 border-b border-border')}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r, i) => (
                    <tr key={i}>
                      {Object.values(r).map((v, j) => (
                        <td key={j} className={cm.cn('px-2 py-1 border-b border-border/50')}>
                          {formatCell(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DatabaseAdminLayout>
  )
}

function formatCell(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export default SavedQueryDetail
