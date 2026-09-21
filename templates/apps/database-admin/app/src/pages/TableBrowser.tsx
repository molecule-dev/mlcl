import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DatabaseAdminLayout } from '../components/DatabaseAdminLayout.js'
import { apiGet } from '../lib/api.js'

interface DataResponse {
  rows: Array<Record<string, unknown>>
  columns?: Array<{ name: string; dataType?: string }>
  row_count: number
  limit: number
  offset: number
}

export function TableBrowser() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { connectionId, table } = useParams<{ connectionId: string; table: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<DataResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const limit = Number(searchParams.get('limit') ?? 50)
  const offset = Number(searchParams.get('offset') ?? 0)

  useEffect(() => {
    if (!connectionId || !table) return
    setError(null)
    setData(null)
    let viewed = false
    void apiGet<DataResponse>(
      http,
      `/api/schema/tables/${table}/data?connection_id=${connectionId}&limit=${limit}&offset=${offset}`,
    )
      .then((res) => {
        setData(res)
        // Fire once per loaded page of rows, never on unmount races.
        if (!viewed) {
          viewed = true
          track({
            name: 'table.viewed',
            properties: {
              connection_id: connectionId,
              table,
              row_count: res?.row_count ?? 0,
              offset,
            },
          })
        }
      })
      .catch((e: Error) => setError(e.message ?? 'load failed'))
  }, [connectionId, http, limit, offset, table])

  return (
    <DatabaseAdminLayout>
      <div
        data-mol-id="tb-page"
        className={cm.cn('flex-1 overflow-y-auto p-6')}
        aria-label={t(
          'tableBrowser.title',
          { table: table ?? '' },
          { defaultValue: `Table: ${table ?? ''}` },
        )}
      >
        <header className={cm.cn('flex items-center justify-between mb-4')}>
          <div>
            <h1 className={cm.cn('text-2xl font-bold')} data-mol-id="tb-name">
              {table}
            </h1>
            <p className={cm.cn('text-sm text-muted')}>
              {t(
                'tableBrowser.subtitle',
                {},
                { defaultValue: 'Browsing rows from your remote database.' },
              )}
            </p>
          </div>
          <div className={cm.cn('flex items-center gap-3')}>
            {connectionId && (
              <Link
                to={`/schema/${connectionId}`}
                className={cm.cn('rounded px-2 py-2 text-xs underline')}
              >
                {t('nav.schema', {}, { defaultValue: 'Schema' })}
              </Link>
            )}
            {connectionId && (
              <Link
                to={`/query/${connectionId}`}
                className={cm.cn('rounded px-2 py-2 text-xs underline')}
              >
                {t('queries.editorTitle', {}, { defaultValue: 'Query editor' })}
              </Link>
            )}
          </div>
        </header>

        {error && (
          <div
            data-mol-id="tb-error"
            role="alert"
            className={cm.cn(
              'rounded border border-error/30 bg-error/10 px-3 py-2 text-xs text-error mb-3',
            )}
          >
            {error}
          </div>
        )}

        {!error && !data && (
          <div
            data-mol-id="tb-loading"
            className={cm.cn('rounded border border-border bg-surface p-6 text-sm text-muted')}
          >
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </div>
        )}

        {data && data.rows.length === 0 && (
          <div
            data-mol-id="tb-empty"
            className={cm.cn(
              'rounded border border-border bg-surface p-6 text-center text-sm text-muted',
            )}
          >
            {t('tableBrowser.noRows', {}, { defaultValue: 'This table has no rows yet.' })}
          </div>
        )}

        {data && data.rows.length > 0 && (
          <>
            <div className={cm.cn('flex items-center justify-between mb-2')}>
              <div data-mol-id="tb-total" className={cm.cn('text-xs text-muted')}>
                {t(
                  'tableBrowser.meta',
                  { total: data.row_count, showing: data.rows.length, offset: data.offset },
                  {
                    defaultValue: `${data.row_count} rows · showing ${data.rows.length} (offset ${data.offset})`,
                  },
                )}
              </div>
              <div className={cm.cn('flex items-center gap-2')}>
                <button
                  type="button"
                  data-mol-id="tb-prev"
                  disabled={offset <= 0}
                  onClick={() =>
                    setSearchParams({
                      limit: String(limit),
                      offset: String(Math.max(0, offset - limit)),
                    })
                  }
                  className={cm.cn(
                    'rounded border border-border px-3 py-1.5 text-xs disabled:opacity-50',
                  )}
                >
                  {t('pagination.prev', {}, { defaultValue: 'Prev' })}
                </button>
                <button
                  type="button"
                  data-mol-id="tb-next"
                  disabled={data.rows.length < limit}
                  onClick={() =>
                    setSearchParams({ limit: String(limit), offset: String(offset + limit) })
                  }
                  className={cm.cn(
                    'rounded border border-border px-3 py-1.5 text-xs disabled:opacity-50',
                  )}
                >
                  {t('pagination.next', {}, { defaultValue: 'Next' })}
                </button>
              </div>
            </div>

            <div className={cm.cn('overflow-x-auto rounded border border-border bg-surface p-3')}>
              <table data-mol-id="tb-table" className={cm.cn('w-full text-xs font-mono')}>
                <thead>
                  <tr>
                    {(data.columns && data.columns.length > 0
                      ? data.columns.map((f) => f.name)
                      : data.rows[0]
                        ? Object.keys(data.rows[0])
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
                  {data.rows.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((v, j) => (
                        <td key={j} className={cm.cn('px-2 py-1 border-b border-border/50')}>
                          {formatCell(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
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

export default TableBrowser
