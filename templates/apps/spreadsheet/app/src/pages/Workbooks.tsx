import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CalciteKpiTile } from '../components/CalciteKpiTile.js'
import { WorkbenchLayout } from '../components/WorkbenchLayout.js'
import { WorkbookHeroCard } from '../components/WorkbookHeroCard.js'
import type { WorkbookSummary } from '../components/WorkbookListItem.js'
import { WorkbookListItem } from '../components/WorkbookListItem.js'

interface SpreadsheetApiRow {
  id: string
  owner_id: string
  title: string
  description: string | null
  is_public: boolean
  is_starred: boolean
  trashed_at: string | null
  created_at: string
  updated_at: string
}

function initialsFromOwner(name?: string | null, email?: string | null, fallback = 'ME'): string {
  const src = (name ?? email ?? '').trim()
  if (!src) return fallback
  const parts = src.split(/\s+|[._@-]/).filter(Boolean)
  if (parts.length === 0) return fallback
  const a = parts[0]?.[0] ?? ''
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? ''
  return (a + b).toUpperCase().slice(0, 2) || fallback
}

function toSummary(row: SpreadsheetApiRow, ownerName: string, ownerEmail: string): WorkbookSummary {
  return {
    id: row.id,
    name: row.title,
    description: row.description ?? '',
    ownerInitials: initialsFromOwner(ownerName, ownerEmail),
    ownerName: ownerName || ownerEmail || 'Owner',
    rowCount: 0,
    sheetCount: 0,
    updatedAt: row.updated_at,
    starred: row.is_starred,
    category: undefined,
  }
}

export function Workbooks() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user } = useAuth<{ id?: string; name?: string; email?: string }>()
  const [workbooks, setWorkbooks] = useState<WorkbookSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'starred' | 'mine'>('all')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchAll() {
      setLoading(true)
      setError(null)
      try {
        const sheetsRes = await http.get<SpreadsheetApiRow[]>('/spreadsheets')
        if (cancelled) return
        const rows = Array.isArray(sheetsRes.data) ? sheetsRes.data : []
        const ownerName = user?.name ?? ''
        const ownerEmail = user?.email ?? ''
        setWorkbooks(rows.map((r) => toSummary(r, ownerName, ownerEmail)))
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setWorkbooks([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchAll()
    return () => {
      cancelled = true
    }
  }, [http, user?.name, user?.email])

  const filtered = useMemo(
    () =>
      workbooks.filter((w) => {
        if (filter === 'starred' && !w.starred) return false
        if (search && !`${w.name} ${w.description}`.toLowerCase().includes(search.toLowerCase()))
          return false
        return true
      }),
    [workbooks, filter, search],
  )

  const totalRows = workbooks.reduce((sum, w) => sum + (w.rowCount ?? 0), 0)
  const totalSheets = workbooks.reduce((sum, w) => sum + (w.sheetCount ?? 0), 0)

  async function createWorkbook() {
    setCreating(true)
    setError(null)
    try {
      const title = t('workbooks.prompt.defaultTitle', {}, { defaultValue: 'Untitled workbook' })
      const res = await http.post<SpreadsheetApiRow>('/spreadsheets', { title })
      const created = res.data
      if (created?.id) {
        navigate(`/workbooks/${created.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setCreating(false)
    }
  }

  async function toggleStar(id: string, nextStarred: boolean): Promise<void> {
    setWorkbooks((prev) => prev.map((wb) => (wb.id === id ? { ...wb, starred: nextStarred } : wb)))
    try {
      await http.patch(`/spreadsheets/${id}`, { is_starred: nextStarred })
    } catch (err) {
      // Roll back optimistic update on failure so the UI reflects truth.
      setWorkbooks((prev) =>
        prev.map((wb) => (wb.id === id ? { ...wb, starred: !nextStarred } : wb)),
      )
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <WorkbenchLayout>
      <div
        className={cm.cn(cm.flex({ justify: 'between', align: 'end', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <h1
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('workbooks.headline', {}, { defaultValue: 'Workbooks' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('lg'), 'text-on-surface-variant')}>
            {t(
              'workbooks.subhead',
              {},
              { defaultValue: 'Every grid in your workspace, sorted by recent activity.' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={createWorkbook}
          disabled={creating}
          className={
            'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-on-primary rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform disabled:opacity-50'
          }
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            add
          </span>
          {creating
            ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
            : t('workbooks.newWorkbook', {}, { defaultValue: 'New workbook' })}
        </button>
      </div>

      <WorkbookHeroCard
        workbookCount={workbooks.length}
        cellsThisWeek={Math.round(totalRows * 12.4)}
        cellsDeltaPct={9.8}
        activeCollaborators={0}
        pendingAutomations={0}
      />

      <div className={cm.cn(cm.grid({ cols: 4, gap: 'lg' }))}>
        <CalciteKpiTile
          icon="grid_on"
          label={t('workbooks.kpi.workbooksLabel', {}, { defaultValue: 'Workbooks' })}
          value={workbooks.length}
          status={t('workbooks.kpi.allHealthy', {}, { defaultValue: 'All healthy' })}
          statusAccent="success"
        />
        <CalciteKpiTile
          icon="table_rows"
          accent="info"
          label={t('workbooks.kpi.rowsLabel', {}, { defaultValue: 'Total rows' })}
          value={totalRows.toLocaleString()}
          hint={t(
            'workbooks.kpi.rowsHint',
            { sheets: totalSheets },
            { defaultValue: 'Across {{sheets}} sheets' },
          )}
        />
        <CalciteKpiTile
          icon="bolt"
          accent="warning"
          label={t('workbooks.kpi.automationsLabel', {}, { defaultValue: 'Active automations' })}
          value={0}
          status={t(
            'workbooks.kpi.automationsStatus',
            { count: 0 },
            { defaultValue: '{{count}} due tonight' },
          )}
          statusAccent="warning"
        />
        <CalciteKpiTile
          icon="group"
          accent="primary"
          label={t('workbooks.kpi.collaboratorsLabel', {}, { defaultValue: 'Collaborators' })}
          value={0}
          status={t(
            'workbooks.kpi.collaboratorsStatus',
            { count: 0 },
            { defaultValue: '{{count}} editing now' },
          )}
          statusAccent="success"
        />
      </div>

      <div
        className={cm.cn(
          'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'center', wrap: 'wrap', gap: 'md' }),
            cm.sp('px', 6),
            cm.sp('py', 4),
            'border-b border-outline-variant/40',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            {(['all', 'starred', 'mine'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setFilter(opt)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'text-xs font-bold uppercase tracking-widest rounded-full transition-colors',
                  filter === opt
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {t(
                  `workbooks.filter.${opt}`,
                  {},
                  { defaultValue: opt[0]!.toUpperCase() + opt.slice(1) },
                )}
              </button>
            ))}
          </div>
          <div className={cm.cn('relative', 'w-full md:w-72')}>
            <span
              className={
                'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base'
              }
              aria-hidden="true"
            >
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('workbooks.search', {}, { defaultValue: 'Search workbooks…' })}
              className={cm.cn(
                cm.w('full'),
                cm.sp('pl', 10),
                cm.sp('pr', 4),
                cm.sp('py', 2),
                'text-sm bg-surface-container-low border-0 rounded-full focus:ring-2 focus:ring-primary/30 outline-none',
              )}
            />
          </div>
        </div>
        {error && (
          <div
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'text-error bg-error-container/40',
            )}
            role="alert"
          >
            {t('workbooks.error', { error }, { defaultValue: 'Could not load: {{error}}' })}
          </div>
        )}
        {loading ? (
          <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
            {t('workbooks.loading', {}, { defaultValue: 'Loading workbooks…' })}
          </p>
        ) : filtered.length === 0 ? (
          <div className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.stack(3))}>
            <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
              {workbooks.length === 0
                ? t(
                    'workbooks.empty.first',
                    {},
                    { defaultValue: 'No workbooks yet — create your first one' },
                  )
                : t(
                    'workbooks.empty.headline',
                    {},
                    { defaultValue: 'No workbooks match your filter' },
                  )}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {workbooks.length === 0
                ? t(
                    'workbooks.empty.firstHint',
                    {},
                    { defaultValue: 'Hit "New workbook" above to start.' },
                  )
                : t(
                    'workbooks.empty.subhead',
                    {},
                    { defaultValue: 'Try clearing the search or switching back to All.' },
                  )}
            </p>
            {workbooks.length === 0 && (
              <Link
                to="/templates"
                className={
                  'inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-primary rounded-full bg-primary-fixed hover:opacity-90 transition-opacity self-center'
                }
              >
                {t('workbooks.empty.browseTemplates', {}, { defaultValue: 'Or browse templates' })}
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant/40">
            {filtered.map((wb) => (
              <WorkbookListItem key={wb.id} workbook={wb} onToggleStar={toggleStar} />
            ))}
          </ul>
        )}
      </div>
    </WorkbenchLayout>
  )
}

export default Workbooks
