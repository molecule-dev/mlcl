import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import { PromptDialog } from '../components/PromptDialog.js'
import { SpreadsheetShell } from '../components/SpreadsheetShell.js'
import { getRealtimeConnection } from '../lib/realtime.js'

interface SheetRow {
  id: string
  spreadsheet_id: string
  name: string
  position: number
  color?: string | null
}

interface SpreadsheetDetail {
  id: string
  title: string
  description: string | null
  is_public: boolean
  is_starred: boolean
  updated_at: string
  sheets: SheetRow[]
}

interface ColumnRow {
  id: string
  sheet_id: string
  name: string
  type: string
  position: number
  width_px: number
}

interface RowRecord {
  id: string
  sheet_id: string
  cells: Record<string, unknown>
  position: number
}

export function Editor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()

  const [workbook, setWorkbook] = useState<SpreadsheetDetail | null>(null)
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null)
  const [columns, setColumns] = useState<ColumnRow[]>([])
  const [rows, setRows] = useState<RowRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [titleDraft, setTitleDraft] = useState('')
  const [renamingTitle, setRenamingTitle] = useState(false)
  /** Which in-page name dialog is open (replaces blocking window.prompt). */
  const [nameDialog, setNameDialog] = useState<'sheet' | 'column' | null>(null)

  // Mirror the actively-edited cell into a ref so the realtime merge can skip a
  // remote cell:updated for the cell the local user is typing WITHOUT the sheet
  // subscription re-running on every cell focus.
  const editingCellRef = useRef<{ rowId: string; columnId: string } | null>(null)
  useEffect(() => {
    editingCellRef.current = editingCell
  }, [editingCell])
  // Monotonic token so a superseded grid reload (rapid sheet switch or a burst
  // of realtime refetches) never clobbers newer state with its stale response.
  const gridReqRef = useRef(0)

  // Load workbook + sheets
  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function fetchWorkbook() {
      setLoading(true)
      setError(null)
      try {
        const res = await http.get<SpreadsheetDetail>(`/spreadsheets/${id}`)
        if (cancelled) return
        const data = res.data
        if (data) {
          setWorkbook(data)
          setTitleDraft(data.title)
          if (data.sheets?.length) setActiveSheetId(data.sheets[0]!.id)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchWorkbook()
    return () => {
      cancelled = true
    }
  }, [id, http])

  // Re-fetch the active sheet's columns + rows. Shared by the initial load and
  // the realtime silent-refetch path (batch/reorder events carry no mergeable
  // row data, so they refetch instead of merging). The epoch token drops a
  // stale response; it never touches editingCell/editingValue (separate state),
  // so a refetch can't clobber an in-progress cell edit.
  const reloadGrid = useCallback(async () => {
    if (!activeSheetId) {
      setColumns([])
      setRows([])
      return
    }
    const token = ++gridReqRef.current
    try {
      const [colRes, rowRes] = await Promise.all([
        http.get<ColumnRow[]>(`/columns?sheet_id=${activeSheetId}`),
        http.get<RowRecord[]>(`/rows?sheet_id=${activeSheetId}`),
      ])
      if (gridReqRef.current !== token) return
      setColumns(Array.isArray(colRes.data) ? colRes.data : [])
      setRows(Array.isArray(rowRes.data) ? rowRes.data : [])
    } catch (err) {
      if (gridReqRef.current === token) setError(err instanceof Error ? err.message : String(err))
    }
  }, [activeSheetId, http])

  // Silent-refetch the workbook (sheet tabs). Used by the realtime path when a
  // peer adds/renames/deletes/reorders a sheet — unlike the initial load it does
  // NOT touch loading / titleDraft (an in-progress title rename is safe), and it
  // reconciles the active sheet if the current one was removed by a peer.
  const reloadWorkbook = useCallback(async () => {
    if (!id) return
    try {
      const res = await http.get<SpreadsheetDetail>(`/spreadsheets/${id}`)
      const data = res.data
      if (!data) return
      setWorkbook(data)
      setActiveSheetId((prev) =>
        prev && data.sheets?.some((s) => s.id === prev) ? prev : (data.sheets?.[0]?.id ?? null),
      )
    } catch (_error) {
      // Best-effort refresh; the current view stays until the next event/load.
    }
  }, [id, http])

  // Load columns + rows when the active sheet changes (delegates to reloadGrid).
  useEffect(() => {
    void reloadGrid()
  }, [reloadGrid])

  // Live collaboration — sheet-lifecycle room. A peer adding/renaming/deleting/
  // reordering a sheet, or restoring a version, refetches the workbook (small
  // sheet list); a restore also refetches the grid (its rows/columns changed).
  useEffect(() => {
    if (!id) return
    const room = `spreadsheet:${id}`
    let active = true
    let connection: RealtimeConnection | null = null

    const onSheetChange = () => {
      void reloadWorkbook()
    }
    const onRestored = () => {
      void reloadWorkbook()
      void reloadGrid()
    }

    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        conn.on('sheet:created', onSheetChange)
        conn.on('sheet:updated', onSheetChange)
        conn.on('sheet:deleted', onSheetChange)
        conn.on('sheets:reordered', onSheetChange)
        conn.on('spreadsheet:restored', onRestored)
        return conn.joinRoom(room)
      })
      .catch(() => {
        // Realtime is best-effort; the initial fetch already populated state.
      })

    return () => {
      active = false
      if (connection) {
        connection.off('sheet:created', onSheetChange)
        connection.off('sheet:updated', onSheetChange)
        connection.off('sheet:deleted', onSheetChange)
        connection.off('sheets:reordered', onSheetChange)
        connection.off('spreadsheet:restored', onRestored)
        connection.leaveRoom(room).catch(() => {})
      }
    }
  }, [id, reloadWorkbook, reloadGrid])

  // Live collaboration — grid room for the ACTIVE sheet. Merges the hot path
  // (cell:updated) and by-id row/column ops directly into local state (mirroring
  // this page's own optimistic setRows/setColumns, so the client's own echo is an
  // idempotent no-op); the events that carry no mergeable data (rows:batch-created
  // is count-only) or are positional (rows:reordered, columns:reordered) trigger a
  // silent reloadGrid. A remote cell:updated for the cell under active local edit
  // is skipped (its live value lives in editingValue, saved on commit).
  useEffect(() => {
    if (!activeSheetId) return
    const room = `sheet:${activeSheetId}`
    let active = true
    let connection: RealtimeConnection | null = null

    const asRecord = (data: unknown): Record<string, unknown> | null =>
      typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null
    const strId = (data: unknown): string | null => {
      const rec = asRecord(data)
      return rec && typeof rec.id === 'string' ? rec.id : null
    }

    const onCellUpdated = (data: unknown) => {
      const rec = asRecord(data)
      if (!rec || typeof rec.row_id !== 'string' || typeof rec.column_id !== 'string') return
      const rowId = rec.row_id
      const columnId = rec.column_id
      const editing = editingCellRef.current
      if (editing && editing.rowId === rowId && editing.columnId === columnId) return
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId ? { ...r, cells: { ...r.cells, [columnId]: rec.value } } : r,
        ),
      )
    }
    const onRowUpsert = (data: unknown) => {
      const rec = asRecord(data)
      if (!rec || typeof rec.id !== 'string') return
      const row = data as RowRecord
      setRows((prev) =>
        prev.some((r) => r.id === row.id)
          ? prev.map((r) => (r.id === row.id ? row : r))
          : [...prev, row],
      )
    }
    const onRowDeleted = (data: unknown) => {
      const rowId = strId(data)
      if (!rowId) return
      setRows((prev) => prev.filter((r) => r.id !== rowId))
    }
    const onRowsBatchDeleted = (data: unknown) => {
      const rec = asRecord(data)
      const ids = rec && Array.isArray(rec.row_ids) ? new Set(rec.row_ids as unknown[]) : null
      if (!ids) return
      setRows((prev) => prev.filter((r) => !ids.has(r.id)))
    }
    const onColumnUpsert = (data: unknown) => {
      const rec = asRecord(data)
      if (!rec || typeof rec.id !== 'string') return
      const col = data as ColumnRow
      setColumns((prev) =>
        prev.some((c) => c.id === col.id)
          ? prev.map((c) => (c.id === col.id ? col : c))
          : [...prev, col],
      )
    }
    const onColumnDeleted = (data: unknown) => {
      const colId = strId(data)
      if (!colId) return
      setColumns((prev) => prev.filter((c) => c.id !== colId))
    }
    // Count-only or positional payloads → refetch (can't merge from the payload).
    const onGridRefetch = () => {
      void reloadGrid()
    }

    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        conn.on('cell:updated', onCellUpdated)
        conn.on('row:created', onRowUpsert)
        conn.on('row:updated', onRowUpsert)
        conn.on('row:deleted', onRowDeleted)
        conn.on('rows:batch-deleted', onRowsBatchDeleted)
        conn.on('rows:batch-created', onGridRefetch)
        conn.on('rows:reordered', onGridRefetch)
        conn.on('column:created', onColumnUpsert)
        conn.on('column:updated', onColumnUpsert)
        conn.on('column:deleted', onColumnDeleted)
        conn.on('columns:reordered', onGridRefetch)
        return conn.joinRoom(room)
      })
      .catch(() => {
        // Realtime is best-effort; the initial fetch already populated the grid.
      })

    return () => {
      active = false
      if (connection) {
        connection.off('cell:updated', onCellUpdated)
        connection.off('row:created', onRowUpsert)
        connection.off('row:updated', onRowUpsert)
        connection.off('row:deleted', onRowDeleted)
        connection.off('rows:batch-deleted', onRowsBatchDeleted)
        connection.off('rows:batch-created', onGridRefetch)
        connection.off('rows:reordered', onGridRefetch)
        connection.off('column:created', onColumnUpsert)
        connection.off('column:updated', onColumnUpsert)
        connection.off('column:deleted', onColumnDeleted)
        connection.off('columns:reordered', onGridRefetch)
        connection.leaveRoom(room).catch(() => {})
      }
    }
  }, [activeSheetId, reloadGrid])

  async function persistTitle() {
    if (!workbook || !titleDraft.trim() || titleDraft === workbook.title) {
      setRenamingTitle(false)
      return
    }
    try {
      await http.patch<SpreadsheetDetail>(`/spreadsheets/${workbook.id}`, {
        title: titleDraft.trim(),
      })
      setWorkbook({ ...workbook, title: titleDraft.trim() })
      track({ name: 'workbook.renamed', properties: { workbook_id: workbook.id } })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRenamingTitle(false)
    }
  }

  function addSheet() {
    if (!workbook) return
    setNameDialog('sheet')
  }

  function addColumn() {
    if (!activeSheetId) return
    setNameDialog('column')
  }

  /** Commits the open name dialog — creates the sheet or column it names. */
  async function confirmNameDialog(value: string) {
    const kind = nameDialog
    setNameDialog(null)
    if (!kind || !workbook) return
    try {
      if (kind === 'sheet') {
        const res = await http.post<SheetRow>('/sheets', {
          spreadsheet_id: workbook.id,
          name: value,
          position: workbook.sheets.length,
        })
        if (res.data) {
          const newSheet = res.data
          setWorkbook({ ...workbook, sheets: [...workbook.sheets, newSheet] })
          setActiveSheetId(newSheet.id)
          track({
            name: 'sheet.created',
            properties: { sheet_id: newSheet.id, workbook_id: workbook.id },
          })
        }
        return
      }
      if (!activeSheetId) return
      const res = await http.post<ColumnRow>('/columns', {
        sheet_id: activeSheetId,
        name: value,
        type: 'text',
        position: columns.length,
      })
      if (res.data) {
        setColumns([...columns, res.data])
        track({
          name: 'column.created',
          properties: { column_id: res.data.id, sheet_id: activeSheetId },
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function addRow() {
    if (!activeSheetId) return
    try {
      const res = await http.post<RowRecord>('/rows', {
        sheet_id: activeSheetId,
        cells: {},
        position: rows.length,
      })
      if (res.data) {
        setRows([...rows, res.data])
        track({ name: 'row.created', properties: { row_id: res.data.id, sheet_id: activeSheetId } })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function startEdit(rowId: string, columnId: string, current: unknown) {
    editingCellRef.current = { rowId, columnId }
    setEditingCell({ rowId, columnId })
    setEditingValue(typeof current === 'string' ? current : current == null ? '' : String(current))
  }

  // One commit per edit session: Enter triggers commitEdit, then the unmount
  // blur re-runs it from a stale closure (double PATCH). Reading the cell from
  // editingCellRef (nulled in the finally, updated by the effect below) makes
  // the second call a no-op; committingRef serializes concurrent Enter+blur.
  const committingRef = useRef(false)

  async function commitEdit() {
    const cell = editingCellRef.current
    if (!cell || committingRef.current) return
    committingRef.current = true
    const { rowId, columnId } = cell
    const targetRow = rows.find((r) => r.id === rowId)
    if (!targetRow) {
      setEditingCell(null)
      return
    }
    try {
      await http.patch(`/rows/${rowId}/cells/${columnId}`, { value: editingValue })
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId ? { ...r, cells: { ...r.cells, [columnId]: editingValue } } : r,
        ),
      )
      track({
        name: 'cell.edited',
        properties: { row_id: rowId, column_id: columnId, sheet_id: activeSheetId ?? undefined },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      editingCellRef.current = null
      setEditingCell(null)
      setEditingValue('')
      committingRef.current = false
    }
  }

  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.position - b.position),
    [columns],
  )
  const sortedRows = useMemo(() => [...rows].sort((a, b) => a.position - b.position), [rows])

  if (loading) {
    return (
      <SpreadsheetShell>
        <div className={cm.cn(cm.sp('p', 6), 'md:p-12')}>
          <p>{t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}</p>
        </div>
      </SpreadsheetShell>
    )
  }

  if (error || !workbook) {
    return (
      <SpreadsheetShell>
        <div className={cm.cn(cm.sp('p', 6), 'md:p-12')}>
          <p className="text-error" role="alert">
            {error ?? t('editor.notFound', {}, { defaultValue: 'Workbook not found' })}
          </p>
          <Link to="/workbooks" className="text-primary underline mt-4 inline-block">
            {t('editor.back', {}, { defaultValue: 'Back to workbooks' })}
          </Link>
        </div>
      </SpreadsheetShell>
    )
  }

  return (
    <SpreadsheetShell>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
          cm.sp('px', 4),
          'md:px-8 py-4',
          'border-b border-outline-variant/40 bg-surface-container-lowest',
        )}
      >
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <p
            className={cm.cn(
              'text-[10px] uppercase tracking-[0.25em] font-bold text-on-surface-variant',
            )}
          >
            {t(
              'editor.eyebrow',
              { id: workbook.id.slice(0, 8) },
              { defaultValue: 'Workbook · {{id}}' },
            )}
          </p>
          {renamingTitle ? (
            <input
              aria-label={t('editor.workbookTitle', {}, { defaultValue: 'Workbook title' })}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={persistTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') persistTitle()
                if (e.key === 'Escape') {
                  setTitleDraft(workbook.title)
                  setRenamingTitle(false)
                }
              }}
              className={cm.cn(
                cm.textSize('2xl'),
                'font-extrabold tracking-tight text-on-surface bg-transparent border-b border-primary outline-none',
              )}
            />
          ) : (
            <button
              type="button"
              onClick={() => setRenamingTitle(true)}
              className={cm.cn(
                cm.textSize('2xl'),
                'font-extrabold tracking-tight text-on-surface text-left hover:opacity-80 transition-opacity',
              )}
            >
              {workbook.title}
            </button>
          )}
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <Link
            to={`/workbooks/${workbook.id}/history`}
            className={
              'inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-on-surface-variant rounded-full hover:bg-surface-container transition-colors'
            }
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              history
            </span>
            {t('nav.history', {}, { defaultValue: 'History' })}
          </Link>
          <Link
            to={`/workbooks/${workbook.id}/charts`}
            className={
              'inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-primary rounded-full bg-primary-fixed hover:opacity-90 transition-opacity'
            }
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              insights
            </span>
            {t('editor.charts', {}, { defaultValue: 'Charts' })}
          </Link>
        </div>
      </header>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
          cm.sp('px', 6),
          cm.sp('py', 3),
          'border-b border-outline-variant/40 bg-surface-container-low',
        )}
      >
        <button
          type="button"
          onClick={addColumn}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.sp('py', 1),
            'text-xs font-bold rounded-full transition-colors text-on-surface-variant hover:bg-surface-container',
          )}
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            view_column
          </span>
          {t('editor.addColumn', {}, { defaultValue: 'Add column' })}
        </button>
        <button
          type="button"
          onClick={addRow}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.sp('py', 1),
            'text-xs font-bold rounded-full transition-colors text-on-surface-variant hover:bg-surface-container',
          )}
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            table_rows
          </span>
          {t('editor.addRow', {}, { defaultValue: 'Add row' })}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            'text-sm text-error bg-error-container/40',
          )}
        >
          {error}
        </div>
      )}

      <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 6), cm.stack(4))}>
        {sortedColumns.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('p', 12),
              'rounded-2xl border border-dashed border-outline-variant/60 text-center text-on-surface-variant',
            )}
          >
            <p className="font-bold text-on-surface mb-2">
              {t('editor.empty.headline', {}, { defaultValue: 'This sheet has no columns yet' })}
            </p>
            <p className="text-sm mb-4">
              {t(
                'editor.empty.subhead',
                {},
                { defaultValue: 'Add a column to start entering data.' },
              )}
            </p>
            <button
              type="button"
              onClick={addColumn}
              className={cm.cn(
                'inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-on-primary rounded-full bg-primary hover:opacity-90 transition-opacity',
              )}
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                add
              </span>
              {t('editor.addFirstColumn', {}, { defaultValue: 'Add first column' })}
            </button>
          </div>
        ) : (
          <div
            // tabIndex: scrollable-region-focusable (axe serious) — a scroll-only
            // region must be keyboard-reachable
            tabIndex={0}
            className="overflow-x-auto rounded-2xl border border-outline-variant/40 bg-surface-container-lowest"
          >
            <table className="w-full text-sm" data-testid="grid-table">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest font-bold text-on-surface-variant w-12">
                    #
                  </th>
                  {sortedColumns.map((c) => (
                    <th
                      key={c.id}
                      scope="col"
                      className="px-3 py-2 text-left text-[11px] uppercase tracking-widest font-bold text-on-surface-variant"
                      style={{ minWidth: c.width_px }}
                    >
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {sortedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={sortedColumns.length + 1}
                      className="px-3 py-6 text-center text-on-surface-variant"
                    >
                      {t('editor.noRows', {}, { defaultValue: 'No rows yet — click "Add row".' })}
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((r, i) => (
                    <tr key={r.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-3 py-2 text-[11px] font-mono tabular-nums text-on-surface-variant">
                        {i + 1}
                      </td>
                      {sortedColumns.map((c) => {
                        const isEditing =
                          editingCell?.rowId === r.id && editingCell?.columnId === c.id
                        const value = r.cells[c.id]
                        return (
                          <td
                            key={c.id}
                            className={cm.cn('px-3 py-1 align-top', isEditing && 'bg-cell-editing')}
                            data-testid={`cell-${r.id}-${c.id}`}
                            onDoubleClick={() => startEdit(r.id, c.id, value)}
                          >
                            {isEditing ? (
                              <input
                                aria-label={t('editor.editCell', {}, { defaultValue: 'Edit cell' })}
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitEdit()
                                  if (e.key === 'Escape') {
                                    editingCellRef.current = null
                                    setEditingCell(null)
                                    setEditingValue('')
                                  }
                                }}
                                className="w-full bg-transparent border-b-2 border-primary outline-none text-sm"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEdit(r.id, c.id, value)}
                                className={cm.cn(
                                  'text-left w-full block text-sm text-on-surface min-h-9 rounded-sm',
                                  'focus-visible:bg-cell-selected focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary',
                                )}
                              >
                                {value == null || value === '' ? (
                                  <span className="text-on-surface-variant/60">—</span>
                                ) : (
                                  String(value)
                                )}
                              </button>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            'bg-surface-container-low rounded-full',
          )}
        >
          {workbook.sheets.map((sheet) => (
            <button
              key={sheet.id}
              type="button"
              onClick={() => setActiveSheetId(sheet.id)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                'text-xs font-bold rounded-full transition-colors',
                activeSheetId === sheet.id
                  ? 'bg-surface-container-lowest text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant hover:bg-surface-container',
              )}
            >
              {sheet.name}
            </button>
          ))}
          <button
            onClick={addSheet}
            type="button"
            aria-label={t('editor.addSheet', {}, { defaultValue: 'Add sheet' })}
            className={
              'ml-2 inline-flex items-center justify-center w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors'
            }
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              add
            </span>
          </button>
        </div>
      </div>

      <PromptDialog
        open={nameDialog !== null}
        title={
          nameDialog === 'sheet'
            ? t('editor.prompt.sheetName', {}, { defaultValue: 'Sheet name' })
            : t('editor.addDialogTitle', {}, { defaultValue: 'Add column' })
        }
        label={
          nameDialog === 'sheet'
            ? t('editor.prompt.sheetName', {}, { defaultValue: 'Sheet name' })
            : t('editor.prompt.columnName', {}, { defaultValue: 'Column name' })
        }
        initialValue={
          nameDialog === 'sheet'
            ? `Sheet ${workbook.sheets.length + 1}`
            : `Column ${columns.length + 1}`
        }
        confirmLabel={t('common.add', {}, { defaultValue: 'Add' })}
        onConfirm={(value) => void confirmNameDialog(value)}
        onClose={() => setNameDialog(null)}
      />
    </SpreadsheetShell>
  )
}

export default Editor
