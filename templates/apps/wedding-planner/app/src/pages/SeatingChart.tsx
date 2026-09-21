import { useCallback, useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SeatedGuest {
  id: string
  name: string
  rsvp_status: string
  group_name: string | null
  side: string
}

interface WeddingTable {
  id: string
  name: string
  capacity: number
  guests: SeatedGuest[]
  seated_count: number
  over_capacity: boolean
}

interface SeatingResponse {
  tables: WeddingTable[]
  unassigned: SeatedGuest[]
}

export function SeatingChart() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [data, setData] = useState<SeatingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tableName, setTableName] = useState('')
  const [tableCapacity, setTableCapacity] = useState('8')
  const [saving, setSaving] = useState(false)
  const [seating, setSeating] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get('/api/seating')
      setData(res.data as SeatingResponse)
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load the seating chart')
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    load()
  }, [load])

  async function addTable(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await http.post('/api/seating/tables', {
        name: tableName.trim(),
        capacity: Math.max(1, Math.min(30, Number(tableCapacity) || 8)),
      })
      void track({
        name: 'seating.table_created',
        properties: { capacity: Number(tableCapacity) || 8 },
      })
      setTableName('')
      setTableCapacity('8')
      await load()
    } catch (e) {
      setError((e as Error).message ?? 'Could not add the table')
    } finally {
      setSaving(false)
    }
  }

  async function removeTable(id: string, name: string) {
    if (
      !window.confirm(
        t(
          'seating.deleteTableConfirm',
          { name },
          { defaultValue: `Remove ${name}? Its guests return to the pool.` },
        ),
      )
    ) {
      return
    }
    try {
      await http.delete(`/api/seating/tables/${id}`)
      void track({ name: 'seating.table_removed', properties: { table_id: id } })
      await load()
    } catch (e) {
      setError((e as Error).message ?? 'Could not remove the table')
    }
  }

  async function assign(guestId: string, tableId: string) {
    setSeating(guestId)
    setError(null)
    try {
      await http.post('/api/seating/assign', { guest_id: guestId, table_id: tableId })
      void track({
        name: 'seating.guest_seated',
        properties: { guest_id: guestId, table_id: tableId },
      })
      await load()
    } catch (e) {
      setError((e as Error).message ?? 'Could not seat the guest')
      await load()
    } finally {
      setSeating(null)
    }
  }

  async function unassign(guestId: string) {
    setSeating(guestId)
    setError(null)
    try {
      await http.delete(`/api/seating/unassign/${guestId}`)
      void track({ name: 'seating.guest_unseated', properties: { guest_id: guestId } })
      await load()
    } catch (e) {
      setError((e as Error).message ?? 'Could not unseat the guest')
      await load()
    } finally {
      setSeating(null)
    }
  }

  const inputCls = cm.cn(
    'w-full rounded-xl border border-outline-variant/60 bg-input-background px-3 py-2',
    'focus:outline-none focus:ring-2 focus:ring-primary/40',
  )

  const tables = data?.tables ?? []
  const pool = data?.unassigned ?? []
  const seatedCount = tables.reduce((sum, table) => sum + table.seated_count, 0)
  const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0)

  return (
    <div
      className={cm.cn(cm.sp('p', 6), cm.sp('px', 8), 'max-w-6xl w-full mx-auto')}
      data-mol-id="page-seating"
    >
      <header>
        <p
          className={cm.cn('text-xs font-black uppercase tracking-widest')}
          style={{ color: 'var(--color-accent)' }}
        >
          {t('seating.eyebrow', {}, { defaultValue: 'Reception' })}
        </p>
        <h1 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
          {t('seating.title', {}, { defaultValue: 'Seating chart' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'mt-2 text-on-surface-variant max-w-xl')}>
          {t(
            'seating.subtitle',
            { seated: seatedCount, capacity: totalCapacity, pool: pool.length },
            {
              defaultValue:
                '{{seated}} seated of {{capacity}} seats · {{pool}} guests waiting in the pool',
            },
          )}
        </p>
      </header>

      {error ? (
        <p
          className={cm.cn(
            cm.sp('p', 3),
            'mt-4 rounded-xl bg-error-light text-error font-bold text-sm',
          )}
          data-mol-id="seating-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className={cm.cn('mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]')}>
        {/* Tables */}
        <div>
          <form
            onSubmit={addTable}
            data-mol-id="seating-add-table-form"
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
              cm.flex({ align: 'end', gap: 'sm', wrap: 'wrap' }),
            )}
          >
            <label className={cm.cn(cm.stack(1), 'flex-1 min-w-[10rem]')}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('seating.form.name', {}, { defaultValue: 'Table name' })}
              </span>
              <input
                type="text"
                required
                maxLength={120}
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                data-mol-id="seating-form-name"
                className={inputCls}
              />
            </label>
            <label className={cm.cn(cm.stack(1), 'max-w-[7rem]')}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('seating.form.capacity', {}, { defaultValue: 'Seats' })}
              </span>
              <input
                type="number"
                min={1}
                max={30}
                value={tableCapacity}
                onChange={(e) => setTableCapacity(e.target.value)}
                data-mol-id="seating-form-capacity"
                className={inputCls}
              />
            </label>
            <button
              type="submit"
              disabled={saving || !tableName.trim()}
              data-mol-id="seating-form-submit"
              className={cm.cn('px-4 py-2.5 rounded-xl font-bold text-white disabled:opacity-50')}
              style={{ background: 'var(--color-primary)' }}
            >
              {saving
                ? t('seating.form.saving', {}, { defaultValue: 'Adding…' })
                : t('seating.form.submit', {}, { defaultValue: 'Add table' })}
            </button>
          </form>

          {loading ? (
            <p className={cm.cn(cm.sp('p', 6), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.loading', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : tables.length === 0 ? (
            <p className={cm.cn(cm.sp('p', 6), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'seating.emptyTables',
                {},
                { defaultValue: 'No tables yet — add your first table to start the chart.' },
              )}
            </p>
          ) : (
            <div className={cm.cn('mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3')}>
              {tables.map((table) => {
                const full = table.seated_count >= table.capacity
                return (
                  <section
                    key={table.id}
                    data-mol-id={`seating-table-${table.id}`}
                    className={cm.cn(cm.sp('p', 4), 'rounded-2xl bg-surface border-2 shadow-sm')}
                    style={{
                      borderColor: table.over_capacity
                        ? 'var(--color-error)'
                        : full
                          ? 'var(--color-tertiary)'
                          : 'var(--color-outline-variant)',
                    }}
                  >
                    <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                      <h2 className={cm.cn('font-bold')}>{table.name}</h2>
                      <span
                        className={cm.cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest tabular-nums',
                        )}
                        style={{
                          background: table.over_capacity
                            ? 'var(--color-budget-over-bg)'
                            : 'var(--color-status-neutral-bg)',
                          color: table.over_capacity
                            ? 'var(--color-budget-over)'
                            : 'var(--color-status-neutral)',
                        }}
                      >
                        {table.seated_count}/{table.capacity}
                      </span>
                    </div>
                    <ul className={cm.cn(cm.stack(1), 'mt-3')}>
                      {table.guests.length === 0 ? (
                        <li className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {t('seating.emptyTable', {}, { defaultValue: 'No one seated yet' })}
                        </li>
                      ) : (
                        table.guests.map((guest) => (
                          <li
                            key={guest.id}
                            data-mol-id={`seating-seat-${guest.id}`}
                            className={cm.cn(
                              cm.flex({ align: 'center', justify: 'between', gap: 'xs' }),
                              'px-2.5 py-1.5 rounded-lg bg-surface-container',
                            )}
                          >
                            <span className={cm.cn(cm.textSize('xs'), 'font-bold truncate')}>
                              {guest.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => unassign(guest.id)}
                              disabled={seating === guest.id}
                              aria-label={t(
                                'seating.unseatAria',
                                { name: guest.name },
                                { defaultValue: 'Return {{name}} to the pool' },
                              )}
                              data-mol-id={`seating-unseat-${guest.id}`}
                              className={cm.cn(
                                'material-symbols-outlined inline-flex h-9 w-9 items-center justify-center rounded-full text-[20px] text-on-surface-variant hover:text-error hover:bg-error-light disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-error',
                              )}
                            >
                              close
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                    {/* Seat from pool */}
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'mt-3')}>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const guestId = e.target.value
                          if (guestId) {
                            assign(guestId, table.id)
                            e.target.value = ''
                          }
                        }}
                        aria-label={t(
                          'seating.seatAria',
                          { name: table.name },
                          { defaultValue: 'Seat a guest at {{name}}' },
                        )}
                        data-mol-id={`seating-seat-select-${table.id}`}
                        className={cm.cn(inputCls, cm.textSize('xs'))}
                      >
                        <option value="">
                          {t('seating.seatFromPool', {}, { defaultValue: '+ Seat from pool…' })}
                        </option>
                        {pool.map((guest) => (
                          <option key={guest.id} value={guest.id}>
                            {guest.name}
                            {guest.group_name ? ` (${guest.group_name})` : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeTable(table.id, table.name)}
                        aria-label={t(
                          'seating.removeTableAria',
                          { name: table.name },
                          { defaultValue: 'Remove {{name}}' },
                        )}
                        data-mol-id={`seating-remove-table-${table.id}`}
                        className={cm.cn(
                          'material-symbols-outlined inline-flex h-9 w-9 items-center justify-center rounded-full text-[20px] text-on-surface-variant hover:text-error hover:bg-error-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-error',
                        )}
                      >
                        delete
                      </button>
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>

        {/* Unseated pool */}
        <aside
          className={cm.cn(
            cm.sp('p', 5),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm self-start',
          )}
          data-mol-id="seating-pool"
        >
          <h2 className={cm.cn('text-lg font-bold')}>
            {t('seating.poolTitle', {}, { defaultValue: 'Unseated guests' })}
            <span className={cm.cn('ml-2 text-sm font-bold text-on-surface-variant tabular-nums')}>
              {pool.length}
            </span>
          </h2>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-1 mb-4')}>
            {t(
              'seating.poolHelp',
              {},
              { defaultValue: 'Attending guests not yet seated. Declined guests never appear.' },
            )}
          </p>
          <ul className={cm.cn(cm.stack(1))}>
            {pool.length === 0 ? (
              <li className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t('seating.poolEmpty', {}, { defaultValue: 'Everyone has a seat. 🥂' })}
              </li>
            ) : (
              pool.map((guest) => (
                <li
                  key={guest.id}
                  data-mol-id={`seating-pool-${guest.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'xs' }),
                    'px-2.5 py-1.5 rounded-lg bg-surface-container',
                  )}
                >
                  <span className={cm.cn(cm.textSize('xs'), 'font-bold truncate')}>
                    {guest.name}
                  </span>
                  <span
                    className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
                    style={{ color: 'var(--color-status-neutral)' }}
                  >
                    {guest.rsvp_status}
                  </span>
                </li>
              ))
            )}
          </ul>
        </aside>
      </div>
    </div>
  )
}

export default SeatingChart
