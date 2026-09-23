import { useCallback, useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type TableStatus, TableTile, type TableTileData } from '../components/TableTile.js'
import { unwrapList } from '../lib/unwrap.js'

const LEGEND: ReadonlyArray<{ status: TableStatus; defaultLabel: string; dot: string }> = [
  { status: 'available', defaultLabel: 'Available', dot: 'bg-success' },
  { status: 'occupied', defaultLabel: 'Occupied', dot: 'bg-primary' },
  { status: 'reserved', defaultLabel: 'Reserved', dot: 'bg-tertiary' },
  { status: 'cleaning', defaultLabel: 'Cleaning', dot: 'bg-warning' },
]

interface ApiTable {
  id: string
  table_number: number
  seats: number
  section?: string
  status: string
}

const STATUS_FALLBACK: Record<string, TableStatus> = {
  dirty: 'cleaning',
}

const normalizeStatus = (raw: string | undefined): TableStatus => {
  const value = (raw ?? 'available').toLowerCase()
  if (
    value === 'available' ||
    value === 'occupied' ||
    value === 'reserved' ||
    value === 'cleaning'
  ) {
    return value
  }
  return STATUS_FALLBACK[value] ?? 'available'
}

const toTableTile = (row: ApiTable): TableTileData => ({
  id: row.id,
  label: String(row.table_number ?? ''),
  seats: Number(row.seats ?? 0),
  guests: 0,
  status: normalizeStatus(row.status),
})

export function Tables() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tables, setTables] = useState<ReadonlyArray<TableTileData>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get('/api/tables')
      setTables(unwrapList<ApiTable>(res).map(toTableTile))
    } catch (error) {
      logError('tables.load', error)
      setError(t('tables.loadError', {}, { defaultValue: 'Could not load tables.' }))
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void reload()
  }, [reload])

  const handleAddTable = useCallback(async () => {
    setCreating(true)
    setError(null)
    try {
      const next = (tables.reduce((max, t) => Math.max(max, Number(t.label) || 0), 0) || 0) + 1
      await http.post('/api/tables', { table_number: next, seats: 2, section: 'main' })
      void track({ name: 'table.created', properties: { tableNumber: next } })
      await reload()
    } catch (error) {
      logError('tables.add', error)
      setError(
        t(
          'tables.addError',
          {},
          { defaultValue: 'Could not add table. You may have hit your tier limit.' },
        ),
      )
    } finally {
      setCreating(false)
    }
  }, [http, reload, t, tables])

  const counts = useMemo(() => {
    const c: Record<TableStatus, number> = { available: 0, occupied: 0, reserved: 0, cleaning: 0 }
    tables.forEach((tt) => {
      c[tt.status]++
    })
    return c
  }, [tables])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('tables.eyebrow', {}, { defaultValue: 'Floor plan' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight font-display')}>
            {t('tables.heading', {}, { defaultValue: 'Front of house' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'tables.subheading',
              {},
              { defaultValue: 'Tap a table to mark it cleaning, available, or change its status.' },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          {LEGEND.map((l) => (
            <span
              key={l.status}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'uppercase tracking-widest bg-surface-container-low text-on-surface',
              )}
            >
              <span className={cm.cn('w-2 h-2 rounded-full', l.dot)} aria-hidden="true" />
              {t(`tables.legend.${l.status}`, {}, { defaultValue: l.defaultLabel })}
              <span className={cm.cn('tabular-nums text-on-surface-variant')}>
                · {counts[l.status]}
              </span>
            </span>
          ))}
          <button
            type="button"
            onClick={handleAddTable}
            disabled={creating}
            data-testid="tables-add"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              add
            </span>
            {creating
              ? t('tables.adding', {}, { defaultValue: 'Adding…' })
              : t('tables.addTable', {}, { defaultValue: 'Add table' })}
          </button>
        </div>
      </header>

      {error ? (
        <p
          data-testid="tables-error"
          className={cm.cn(cm.sp('py', 4), cm.textCenter, 'text-error')}
        >
          {error}
        </p>
      ) : null}

      {loading && tables.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('tables.loading', {}, { defaultValue: 'Loading floor…' })}
        </p>
      ) : tables.length === 0 ? (
        <div
          data-testid="tables-empty"
          className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.stack(3))}
        >
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('tables.empty', {}, { defaultValue: 'No tables yet.' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'tables.emptyHint',
              {},
              { defaultValue: 'Tap "Add table" to create your first table.' },
            )}
          </p>
        </div>
      ) : (
        <section
          className={cm.cn(
            cm.grid({ gap: 'md' }),
            'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
          )}
        >
          {tables.map((table) => (
            <TableTile key={table.id} table={table} />
          ))}
        </section>
      )}
    </div>
  )
}
