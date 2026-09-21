import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DatabaseAdminLayout } from '../components/DatabaseAdminLayout.js'
import { apiGet } from '../lib/api.js'

interface RecentRow {
  id: string
  sql: string
  status: string
  row_count: number
  duration_ms: number
  error_message: string | null
  created_at: string
}

interface SavedRow {
  id: string
  name: string
  sql: string
  description: string
  updated_at: string
}

type Tab = 'recent' | 'saved'

export function QueryHistory() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tab, setTab] = useState<Tab>('recent')
  const [recent, setRecent] = useState<RecentRow[] | null>(null)
  const [saved, setSaved] = useState<SavedRow[] | null>(null)

  useEffect(() => {
    void apiGet<RecentRow[]>(http, '/api/queries/history')
      .then((rows) => setRecent(Array.isArray(rows) ? rows : []))
      .catch(() => setRecent([]))
    void apiGet<SavedRow[]>(http, '/api/queries/saved')
      .then((rows) => setSaved(Array.isArray(rows) ? rows : []))
      .catch(() => setSaved([]))
  }, [http])

  return (
    <DatabaseAdminLayout>
      <div
        data-mol-id="qh-page"
        className={cm.cn('flex-1 overflow-y-auto p-6 space-y-4')}
        aria-label={t('queryHistory.title', {}, { defaultValue: 'Query history' })}
      >
        <header className={cm.cn('flex items-center justify-between')}>
          <h1 className={cm.cn('text-2xl font-bold')}>
            {t('queryHistory.title', {}, { defaultValue: 'Query history' })}
          </h1>
        </header>

        <div className={cm.cn('flex flex-wrap items-center gap-2')}>
          <button
            type="button"
            data-mol-id="qh-tab-recent"
            onClick={() => setTab('recent')}
            className={cm.cn(
              'rounded border px-3 py-1.5 text-xs',
              tab === 'recent' ? 'border-primary text-primary' : 'border-border',
            )}
          >
            {t('status.recent', {}, { defaultValue: 'Recent' })}
          </button>
          <button
            type="button"
            data-mol-id="qh-tab-saved"
            onClick={() => setTab('saved')}
            className={cm.cn(
              'rounded border px-3 py-1.5 text-xs',
              tab === 'saved' ? 'border-primary text-primary' : 'border-border',
            )}
          >
            {t('common.saved', {}, { defaultValue: 'Saved' })}
          </button>
        </div>

        {tab === 'recent' &&
          (recent === null ? (
            <div className={cm.cn('text-sm text-muted')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </div>
          ) : recent.length === 0 ? (
            <div
              data-mol-id="qh-recent-empty"
              className={cm.cn(
                'rounded border border-border bg-surface p-6 text-center text-sm text-muted',
              )}
            >
              {t('queryHistory.recentEmpty', {}, { defaultValue: 'No queries run yet.' })}
            </div>
          ) : (
            <ul data-mol-id="qh-recent-list" className={cm.cn('space-y-2')}>
              {recent.map((row) => (
                <li
                  key={row.id}
                  data-mol-id={`qh-recent-${row.id}`}
                  className={cm.cn('rounded border border-border bg-surface p-3 font-mono text-xs')}
                >
                  <div
                    className={cm.cn(
                      'flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-muted',
                    )}
                  >
                    <span>{new Date(row.created_at).toLocaleString()}</span>
                    <span>
                      {row.status} · {row.row_count} rows · {row.duration_ms}ms
                    </span>
                  </div>
                  <pre className={cm.cn('whitespace-pre-wrap mt-1 text-text')}>{row.sql}</pre>
                  {row.error_message && (
                    <div className={cm.cn('mt-1 text-error')}>{row.error_message}</div>
                  )}
                </li>
              ))}
            </ul>
          ))}

        {tab === 'saved' &&
          (saved === null ? (
            <div className={cm.cn('text-sm text-muted')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </div>
          ) : saved.length === 0 ? (
            <div
              data-mol-id="qh-saved-empty"
              className={cm.cn(
                'rounded border border-border bg-surface p-6 text-center text-sm text-muted',
              )}
            >
              {t('queryHistory.savedEmpty', {}, { defaultValue: 'No saved snippets yet.' })}
            </div>
          ) : (
            <ul className={cm.cn('space-y-2')}>
              {saved.map((row) => (
                <li key={row.id} className={cm.cn('rounded border border-border bg-surface p-3')}>
                  <Link
                    to={`/history/saved/${row.id}`}
                    data-mol-id={`qh-saved-link-${row.id}`}
                    className={cm.cn('text-sm font-bold underline')}
                  >
                    {row.name}
                  </Link>
                  <pre className={cm.cn('whitespace-pre-wrap mt-1 font-mono text-xs text-muted')}>
                    {row.sql}
                  </pre>
                </li>
              ))}
            </ul>
          ))}
      </div>
    </DatabaseAdminLayout>
  )
}

export default QueryHistory
