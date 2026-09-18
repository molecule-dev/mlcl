import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DatabaseAdminLayout } from '../components/DatabaseAdminLayout.js'
import { apiGet, apiPost } from '../lib/api.js'

interface TableRow {
  schema: string
  name: string
  type: 'table' | 'view'
}

interface ExecuteResult {
  rows: Array<Record<string, unknown>>
  row_count: number
  columns?: Array<{ name: string; dataType?: string }>
  duration_ms?: number
}

export function QueryEditor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { connectionId } = useParams<{ connectionId: string }>()
  const [tables, setTables] = useState<TableRow[]>([])
  const [tablesError, setTablesError] = useState<string | null>(null)
  const [sql, setSql] = useState('select 1 as ping')
  const [result, setResult] = useState<ExecuteResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveOk, setSaveOk] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!connectionId) return
    setTablesError(null)
    void apiGet<TableRow[]>(http, `/api/schema/tables?connection_id=${connectionId}`)
      .then((rows) => setTables(Array.isArray(rows) ? rows : []))
      .catch((e: Error) => setTablesError(e.message ?? 'load failed'))
  }, [connectionId, http])

  const runQuery = useCallback(async () => {
    if (!connectionId) return
    setRunning(true)
    setErrorMsg(null)
    setResult(null)
    try {
      const res = await apiPost<ExecuteResult>(http, '/api/queries/execute', {
        connection_id: connectionId,
        sql,
      })
      setResult(res)
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      setErrorMsg(err?.response?.data?.error ?? err?.message ?? 'execution failed')
    } finally {
      setRunning(false)
    }
  }, [connectionId, http, sql])

  const saveSnippet = useCallback(async () => {
    if (!connectionId || !saveName.trim()) return
    setSaveOk(false)
    setSaving(true)
    try {
      await apiPost(http, '/api/queries/saved', {
        connection_id: connectionId,
        name: saveName.trim(),
        sql,
      })
      setSaveOk(true)
    } catch (e) {
      setErrorMsg((e as Error).message ?? 'save failed')
    } finally {
      setSaving(false)
    }
  }, [connectionId, http, saveName, sql])

  return (
    <DatabaseAdminLayout>
      <div
        data-mol-id="qe-page"
        className={cm.cn('flex-1 overflow-y-auto p-6')}
        aria-label={t('queryEditor.title', {}, { defaultValue: 'Query editor' })}
      >
        <header className={cm.cn('flex items-center justify-between mb-4')}>
          <h1 className={cm.cn('text-2xl font-bold')}>
            {t('queryEditor.title', {}, { defaultValue: 'Query editor' })}
          </h1>
          {connectionId && (
            <Link to={`/schema/${connectionId}`} className={cm.cn('text-xs underline')}>
              {t('queryEditor.openSchema', {}, { defaultValue: 'Schema' })}
            </Link>
          )}
        </header>

        <div className={cm.cn('grid grid-cols-12 gap-4')}>
          <aside className={cm.cn('col-span-3 rounded border border-border bg-surface p-3')}>
            <h2 className={cm.cn('text-xs uppercase text-muted mb-2')}>
              {t('queryEditor.tables', {}, { defaultValue: 'Tables' })}
            </h2>
            {tablesError ? (
              <div className={cm.cn('text-xs text-error')}>{tablesError}</div>
            ) : tables.length === 0 ? (
              <div className={cm.cn('text-xs text-muted')}>
                {t('queryEditor.noTables', {}, { defaultValue: 'No tables' })}
              </div>
            ) : (
              <ul className={cm.cn('space-y-1 font-mono text-xs')}>
                {tables.map((tbl) => (
                  <li key={`${tbl.schema}.${tbl.name}`}>
                    <button
                      type="button"
                      data-mol-id={`qe-table-${tbl.name}`}
                      onClick={() =>
                        setSql(
                          (s) => `${s.trim() ? s + '\n' : ''}select * from ${tbl.name} limit 100`,
                        )
                      }
                      className={cm.cn('w-full rounded px-2 py-1 text-left hover:bg-bg')}
                    >
                      {tbl.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <section className={cm.cn('col-span-9 space-y-3')}>
            <textarea
              data-mol-id="qe-textarea"
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              className={cm.cn(
                'h-48 w-full rounded border border-border bg-bg p-3 font-mono text-sm text-text focus:border-primary focus:outline-none',
              )}
              placeholder="select 1"
            />

            <div className={cm.cn('flex flex-wrap items-center gap-3')}>
              <button
                type="button"
                data-mol-id="qe-run"
                onClick={runQuery}
                disabled={running}
                className={cm.cn('rounded bg-primary px-3 py-2 text-sm font-bold text-on-primary')}
              >
                {running
                  ? t('common.runningEllipsis', {}, { defaultValue: 'Running…' })
                  : t('common.run', {}, { defaultValue: 'Run' })}
              </button>
              <input
                type="text"
                data-mol-id="qe-save-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={t('queryEditor.savePlaceholder', {}, { defaultValue: 'Snippet name' })}
                className={cm.cn(
                  'h-9 w-64 rounded border border-border bg-bg px-3 font-mono text-sm text-text focus:border-primary focus:outline-none',
                )}
              />
              <button
                type="button"
                data-mol-id="qe-save-button"
                onClick={saveSnippet}
                disabled={saving || !saveName.trim()}
                className={cm.cn('rounded border border-border px-3 py-2 text-sm')}
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('queryEditor.saveSnippet', {}, { defaultValue: 'Save snippet' })}
              </button>
              {saveOk && (
                <span data-mol-id="qe-save-ok" className={cm.cn('text-xs text-primary')}>
                  {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
                </span>
              )}
            </div>

            {errorMsg && (
              <div
                role="alert"
                data-mol-id="qe-error"
                className={cm.cn(
                  'rounded border border-error/30 bg-error/10 p-3 font-mono text-xs text-error',
                )}
              >
                {errorMsg}
              </div>
            )}

            {result && (
              <div className={cm.cn('rounded border border-border bg-surface p-3')}>
                <div data-mol-id="qe-result-meta" className={cm.cn('text-xs text-muted mb-2')}>
                  {t(
                    'queryEditor.resultMeta',
                    { rows: result.row_count, ms: result.duration_ms ?? 0 },
                    { defaultValue: `${result.row_count} rows · ${result.duration_ms ?? 0} ms` },
                  )}
                </div>
                <div className={cm.cn('overflow-x-auto')}>
                  <table
                    data-mol-id="qe-result-table"
                    className={cm.cn('w-full text-xs font-mono')}
                  >
                    <thead>
                      <tr>
                        {(result.columns ?? []).map((f) => (
                          <th
                            key={f.name}
                            className={cm.cn(
                              'border-b border-border px-2 py-1 text-left text-muted',
                            )}
                          >
                            {f.name}
                          </th>
                        ))}
                        {(!result.columns || result.columns.length === 0) && result.rows[0]
                          ? Object.keys(result.rows[0]).map((k) => (
                              <th
                                key={k}
                                className={cm.cn(
                                  'border-b border-border px-2 py-1 text-left text-muted',
                                )}
                              >
                                {k}
                              </th>
                            ))
                          : null}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((v, j) => (
                            <td key={j} className={cm.cn('border-b border-border/50 px-2 py-1')}>
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
          </section>
        </div>
      </div>
    </DatabaseAdminLayout>
  )
}

function formatCell(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export default QueryEditor
