import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WorkbenchLayout } from '../components/WorkbenchLayout.js'

interface VersionRow {
  id: string
  spreadsheet_id: string
  owner_id: string
  created_by: string
  snapshot: {
    sheets?: Array<{ id: string; name: string }>
    columns?: Array<{ id: string }>
    rows?: Array<{ id: string }>
  }
  change_summary: string | null
  created_at: string
}

interface SpreadsheetDetail {
  id: string
  title: string
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(iso).toLocaleDateString()
}

export function History() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id: routeId } = useParams<{ id: string }>()

  const [workbook, setWorkbook] = useState<SpreadsheetDetail | null>(null)
  const [versions, setVersions] = useState<VersionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [snapshotting, setSnapshotting] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const spreadsheetId = routeId ?? null

  useEffect(() => {
    let cancelled = false
    async function fetchAll() {
      setLoading(true)
      setError(null)
      try {
        if (spreadsheetId) {
          const [wbRes, verRes] = await Promise.all([
            http.get<SpreadsheetDetail>(`/spreadsheets/${spreadsheetId}`).catch(() => null),
            http.get<VersionRow[]>(`/spreadsheet-versions?spreadsheet_id=${spreadsheetId}`),
          ])
          if (cancelled) return
          if (wbRes?.data) setWorkbook(wbRes.data)
          setVersions(Array.isArray(verRes.data) ? verRes.data : [])
        } else {
          const verRes = await http.get<VersionRow[]>(`/spreadsheet-versions`)
          if (cancelled) return
          setVersions(Array.isArray(verRes.data) ? verRes.data : [])
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchAll()
    return () => {
      cancelled = true
    }
  }, [http, spreadsheetId])

  async function takeSnapshot(): Promise<void> {
    if (!spreadsheetId) return
    setSnapshotting(true)
    setError(null)
    try {
      const summary = window.prompt(
        t('history.snapshotPrompt', {}, { defaultValue: 'Describe this snapshot (optional)' }),
        '',
      )
      const res = await http.post<VersionRow>('/spreadsheet-versions', {
        spreadsheet_id: spreadsheetId,
        change_summary: summary?.trim() ? summary.trim() : null,
      })
      if (res.data) setVersions((prev) => [res.data!, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSnapshotting(false)
    }
  }

  async function restore(version: VersionRow): Promise<void> {
    if (
      !window.confirm(
        t(
          'history.confirmRestore',
          {},
          { defaultValue: 'Restore this version? Live cells will be replaced.' },
        ),
      )
    )
      return
    setRestoringId(version.id)
    setError(null)
    try {
      await http.post(`/spreadsheet-versions/${version.id}/restore`, {})
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <WorkbenchLayout>
      <div
        className={cm.cn(cm.flex({ justify: 'between', align: 'end', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <p
            className={cm.cn(
              'text-[10px] uppercase tracking-[0.25em] font-bold text-on-surface-variant',
            )}
          >
            {workbook
              ? t(
                  'history.eyebrow',
                  { id: workbook.id.slice(0, 8) },
                  { defaultValue: 'Workbook · {{id}}' },
                )
              : t('history.allWorkbooks', {}, { defaultValue: 'All workbooks' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface mt-1',
            )}
          >
            {t('history.headline', {}, { defaultValue: 'Version history' })}
          </h1>
          <p
            className={cm.cn(
              cm.sp('mt', 1),
              cm.textSize('lg'),
              'text-on-surface-variant max-w-2xl',
            )}
          >
            {t(
              'history.subhead',
              {},
              { defaultValue: 'Snapshot now or restore any past state with one click.' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
          {spreadsheetId && (
            <button
              type="button"
              onClick={takeSnapshot}
              disabled={snapshotting}
              data-testid="snapshot-button"
              className={
                'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-on-primary rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform disabled:opacity-50'
              }
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                photo_camera
              </span>
              {snapshotting
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('history.takeSnapshot', {}, { defaultValue: 'Snapshot now' })}
            </button>
          )}
          {spreadsheetId && (
            <Link
              to={`/workbooks/${spreadsheetId}`}
              className={
                'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-on-surface-variant rounded-full border border-outline-variant hover:border-primary hover:text-primary transition-colors'
              }
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                grid_on
              </span>
              {t('history.backToGrid', {}, { defaultValue: 'Back to grid' })}
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className={cm.cn(cm.sp('p', 4), 'text-sm text-error bg-error-container/40 rounded-2xl')}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : versions.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.stack(2))}>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('history.empty.headline', {}, { defaultValue: 'No snapshots yet' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'history.empty.subhead',
              {},
              { defaultValue: 'Snapshot a workbook to see its versions here.' },
            )}
          </p>
        </div>
      ) : (
        <ol className={cm.cn(cm.stack(4), 'relative')} data-testid="versions-list">
          {versions.map((v) => {
            const sheets = v.snapshot?.sheets?.length ?? 0
            const cols = v.snapshot?.columns?.length ?? 0
            const rows = v.snapshot?.rows?.length ?? 0
            return (
              <li
                key={v.id}
                data-testid={`version-${v.id}`}
                className={cm.cn(cm.flex({ gap: 'md' }))}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(12),
                    cm.h(12),
                    'rounded-full bg-primary text-on-primary text-[11px] font-extrabold shrink-0',
                  )}
                  aria-hidden="true"
                >
                  v
                </span>
                <article
                  className={cm.cn(
                    cm.flex1,
                    cm.sp('p', 5),
                    'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40 min-w-0',
                  )}
                >
                  <header
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
                    )}
                  >
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                      <span className="font-bold text-on-surface">
                        {v.change_summary ||
                          t('history.untitled', {}, { defaultValue: 'Snapshot' })}
                      </span>
                    </div>
                    <span
                      className={
                        'text-xs font-bold uppercase tracking-widest text-on-surface-variant'
                      }
                    >
                      {relativeTime(v.created_at)}
                    </span>
                  </header>
                  <p className={cm.cn(cm.sp('mt', 2), 'text-sm text-on-surface-variant font-mono')}>
                    {t(
                      'history.composition',
                      { sheets, cols, rows },
                      { defaultValue: '{{sheets}} sheets · {{cols}} columns · {{rows}} rows' },
                    )}
                  </p>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.sp('mt', 4))}>
                    <button
                      onClick={() => restore(v)}
                      disabled={restoringId === v.id}
                      type="button"
                      data-testid={`restore-${v.id}`}
                      className={
                        'text-[11px] font-bold uppercase tracking-widest text-primary hover:underline disabled:opacity-50'
                      }
                    >
                      {restoringId === v.id
                        ? t('history.restoring', {}, { defaultValue: 'Restoring…' })
                        : t('history.restore', {}, { defaultValue: 'Restore' })}
                    </button>
                  </div>
                </article>
              </li>
            )
          })}
        </ol>
      )}
    </WorkbenchLayout>
  )
}

export default History
