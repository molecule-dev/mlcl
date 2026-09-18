import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DatabaseAdminLayout } from '../components/DatabaseAdminLayout.js'
import { apiGet } from '../lib/api.js'

interface TableInfoRow {
  schema: string
  name: string
  type: 'table' | 'view'
}

interface ColumnSchemaRow {
  name: string
  dataType: string
  nullable: boolean
  primaryKey: boolean
  defaultValue?: string
}

interface IndexSchemaRow {
  name: string
  columns: string[]
  unique: boolean
}

interface ForeignKeyRow {
  name: string
  columns: string[]
  referencedSchema?: string
  referencedTable: string
  referencedColumns: string[]
}

type Tab = 'columns' | 'indexes' | 'fkeys'

export function SchemaExplorer() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { connectionId } = useParams<{ connectionId: string }>()
  const [searchParams] = useSearchParams()
  const initialTable = searchParams.get('t') ?? null
  const [tables, setTables] = useState<TableInfoRow[]>([])
  const [tablesError, setTablesError] = useState<string | null>(null)
  const [active, setActive] = useState<string | null>(initialTable)
  const [tab, setTab] = useState<Tab>('columns')
  const [columns, setColumns] = useState<ColumnSchemaRow[] | null>(null)
  const [indexes, setIndexes] = useState<IndexSchemaRow[] | null>(null)
  const [fkeys, setFkeys] = useState<ForeignKeyRow[] | null>(null)

  useEffect(() => {
    if (!connectionId) return
    setTablesError(null)
    void apiGet<TableInfoRow[]>(http, `/api/schema/tables?connection_id=${connectionId}`)
      .then((rows) => setTables(Array.isArray(rows) ? rows : []))
      .catch((e: Error) => setTablesError(e.message ?? 'load failed'))
  }, [connectionId, http])

  useEffect(() => {
    if (!connectionId || !active) {
      setColumns(null)
      setIndexes(null)
      setFkeys(null)
      return
    }
    setColumns(null)
    setIndexes(null)
    setFkeys(null)
    void apiGet<ColumnSchemaRow[]>(
      http,
      `/api/schema/tables/${active}/columns?connection_id=${connectionId}`,
    )
      .then((rows) => setColumns(Array.isArray(rows) ? rows : []))
      .catch(() => setColumns([]))
    void apiGet<IndexSchemaRow[]>(
      http,
      `/api/schema/tables/${active}/indexes?connection_id=${connectionId}`,
    )
      .then((rows) => setIndexes(Array.isArray(rows) ? rows : []))
      .catch(() => setIndexes([]))
    void apiGet<ForeignKeyRow[]>(
      http,
      `/api/schema/tables/${active}/foreign-keys?connection_id=${connectionId}`,
    )
      .then((rows) => setFkeys(Array.isArray(rows) ? rows : []))
      .catch(() => setFkeys([]))
  }, [active, connectionId, http])

  const groupedTables = useMemo(() => tables.filter((tbl) => tbl.name), [tables])

  const onPick = useCallback((name: string) => {
    setActive(name)
    setTab('columns')
  }, [])

  const onOpenTable = useCallback(() => {
    if (active && connectionId) navigate(`/table/${connectionId}/${active}`)
  }, [active, connectionId, navigate])

  return (
    <DatabaseAdminLayout>
      <div
        data-mol-id="se-page"
        className={cm.cn('flex-1 overflow-y-auto p-6')}
        aria-label={t('schemaExplorer.title', {}, { defaultValue: 'Schema explorer' })}
      >
        <header className={cm.cn('flex items-center justify-between mb-4')}>
          <h1 className={cm.cn('text-2xl font-bold')}>
            {t('schemaExplorer.title', {}, { defaultValue: 'Schema explorer' })}
          </h1>
          {connectionId && (
            <Link to={`/query/${connectionId}`} className={cm.cn('text-xs underline')}>
              {t('queries.editorTitle', {}, { defaultValue: 'Query editor' })}
            </Link>
          )}
        </header>

        <div className={cm.cn('grid grid-cols-12 gap-4')}>
          <aside className={cm.cn('col-span-3 rounded border border-border bg-surface p-3')}>
            <h2 className={cm.cn('text-xs uppercase text-muted mb-2')}>
              {t('schemaExplorer.tables', {}, { defaultValue: 'Tables' })}
            </h2>
            {tablesError ? (
              <div className={cm.cn('text-xs text-error')}>{tablesError}</div>
            ) : groupedTables.length === 0 ? (
              <div className={cm.cn('text-xs text-muted')}>
                {t('schemaExplorer.noTables', {}, { defaultValue: 'No tables' })}
              </div>
            ) : (
              <ul className={cm.cn('space-y-1 font-mono text-xs')}>
                {groupedTables.map((tbl) => {
                  const isActive = active === tbl.name
                  return (
                    <li key={`${tbl.schema}.${tbl.name}`}>
                      <button
                        type="button"
                        data-mol-id={`se-pick-${tbl.name}`}
                        data-table-name={tbl.name}
                        onClick={() => onPick(tbl.name)}
                        className={cm.cn(
                          'w-full rounded px-2 py-1 text-left',
                          isActive ? 'bg-primary/20 text-primary' : 'hover:bg-bg',
                        )}
                      >
                        <span data-mol-id={`se-table-${tbl.name}`}>{tbl.name}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </aside>

          <section className={cm.cn('col-span-9 space-y-3')}>
            {!active ? (
              <div
                className={cm.cn('rounded border border-border bg-surface p-6 text-sm text-muted')}
              >
                {t(
                  'schemaExplorer.pickATable',
                  {},
                  { defaultValue: 'Pick a table from the sidebar.' },
                )}
              </div>
            ) : (
              <>
                <div className={cm.cn('flex items-center justify-between')}>
                  <div className={cm.cn('flex items-center gap-2')}>
                    <button
                      type="button"
                      data-mol-id="se-tab-columns"
                      onClick={() => setTab('columns')}
                      className={cm.cn(
                        'rounded border px-3 py-1 text-xs',
                        tab === 'columns' ? 'border-primary text-primary' : 'border-border',
                      )}
                    >
                      {t('schema.columns', {}, { defaultValue: 'Columns' })}
                    </button>
                    <button
                      type="button"
                      data-mol-id="se-tab-indexes"
                      onClick={() => setTab('indexes')}
                      className={cm.cn(
                        'rounded border px-3 py-1 text-xs',
                        tab === 'indexes' ? 'border-primary text-primary' : 'border-border',
                      )}
                    >
                      {t('schema.indexes', {}, { defaultValue: 'Indexes' })}
                    </button>
                    <button
                      type="button"
                      data-mol-id="se-tab-fkeys"
                      onClick={() => setTab('fkeys')}
                      className={cm.cn(
                        'rounded border px-3 py-1 text-xs',
                        tab === 'fkeys' ? 'border-primary text-primary' : 'border-border',
                      )}
                    >
                      {t('schema.foreignKeys', {}, { defaultValue: 'Foreign keys' })}
                    </button>
                  </div>
                  <button
                    type="button"
                    data-mol-id="se-open-table"
                    onClick={onOpenTable}
                    className={cm.cn(
                      'rounded bg-primary px-3 py-1 text-xs font-bold text-on-primary',
                    )}
                  >
                    {t('schemaExplorer.browseRows', {}, { defaultValue: 'Browse rows' })}
                  </button>
                </div>

                {tab === 'columns' && (
                  <div
                    data-mol-id="se-columns"
                    className={cm.cn('rounded border border-border bg-surface p-3')}
                  >
                    {columns === null ? (
                      <div className={cm.cn('text-xs text-muted')}>
                        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                      </div>
                    ) : columns.length === 0 ? (
                      <div className={cm.cn('text-xs text-muted')}>
                        {t('schemaExplorer.noColumns', {}, { defaultValue: 'No columns.' })}
                      </div>
                    ) : (
                      <table className={cm.cn('w-full text-xs font-mono')}>
                        <thead>
                          <tr>
                            <th
                              className={cm.cn(
                                'text-left text-muted px-2 py-1 border-b border-border',
                              )}
                            >
                              {t('schemaExplorer.colName', {}, { defaultValue: 'name' })}
                            </th>
                            <th
                              className={cm.cn(
                                'text-left text-muted px-2 py-1 border-b border-border',
                              )}
                            >
                              {t('schemaExplorer.colType', {}, { defaultValue: 'type' })}
                            </th>
                            <th
                              className={cm.cn(
                                'text-left text-muted px-2 py-1 border-b border-border',
                              )}
                            >
                              {t('schemaExplorer.colNullable', {}, { defaultValue: 'nullable' })}
                            </th>
                            <th
                              className={cm.cn(
                                'text-left text-muted px-2 py-1 border-b border-border',
                              )}
                            >
                              {t('schemaExplorer.colDefault', {}, { defaultValue: 'default' })}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {columns.map((c) => (
                            <tr key={c.name} data-mol-id={`se-column-${c.name}`}>
                              <td className={cm.cn('px-2 py-1 border-b border-border/50')}>
                                {c.name}
                                {c.primaryKey ? ' 🔑' : ''}
                              </td>
                              <td className={cm.cn('px-2 py-1 border-b border-border/50')}>
                                {c.dataType}
                              </td>
                              <td className={cm.cn('px-2 py-1 border-b border-border/50')}>
                                {c.nullable ? 'YES' : 'NO'}
                              </td>
                              <td className={cm.cn('px-2 py-1 border-b border-border/50')}>
                                {c.defaultValue ?? ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {tab === 'indexes' && (
                  <div
                    data-mol-id="se-indexes"
                    className={cm.cn('rounded border border-border bg-surface p-3')}
                  >
                    {indexes === null ? (
                      <div className={cm.cn('text-xs text-muted')}>
                        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                      </div>
                    ) : indexes.length === 0 ? (
                      <div className={cm.cn('text-xs text-muted')}>
                        {t('schemaExplorer.noIndexes', {}, { defaultValue: 'No indexes.' })}
                      </div>
                    ) : (
                      <ul className={cm.cn('space-y-2 font-mono text-xs')}>
                        {indexes.map((idx) => (
                          <li
                            key={idx.name}
                            data-mol-id={`se-index-${idx.name}`}
                            className={cm.cn('rounded bg-bg p-2')}
                          >
                            <div className={cm.cn('font-bold')}>{idx.name}</div>
                            <div className={cm.cn('text-muted')}>
                              {idx.unique ? 'UNIQUE ' : ''}({idx.columns.join(', ')})
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {tab === 'fkeys' && (
                  <div
                    data-mol-id="se-fkeys"
                    className={cm.cn('rounded border border-border bg-surface p-3')}
                  >
                    {fkeys === null ? (
                      <div className={cm.cn('text-xs text-muted')}>
                        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                      </div>
                    ) : fkeys.length === 0 ? (
                      <div className={cm.cn('text-xs text-muted')}>
                        {t(
                          'schemaExplorer.noForeignKeys',
                          {},
                          { defaultValue: 'No foreign keys.' },
                        )}
                      </div>
                    ) : (
                      <ul className={cm.cn('space-y-2 font-mono text-xs')}>
                        {fkeys.map((fk) => (
                          <li
                            key={fk.name}
                            data-mol-id={`se-fkey-${fk.name}`}
                            className={cm.cn('rounded bg-bg p-2')}
                          >
                            <div className={cm.cn('font-bold')}>{fk.name}</div>
                            <div className={cm.cn('text-muted')}>
                              {fk.columns.join(', ')} → {fk.referencedTable}.
                              {fk.referencedColumns.join(', ')}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </DatabaseAdminLayout>
  )
}

export default SchemaExplorer
