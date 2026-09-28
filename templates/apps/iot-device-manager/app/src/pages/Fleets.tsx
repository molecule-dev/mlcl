import { useCallback, useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Fleet {
  id: string
  name: string
  description?: string | null
  device_count: number
  online: number
  warning: number
  critical: number
  member_ids: string[]
}

interface FleetRow {
  id: string
  name: string
  description?: string | null
  tags?: unknown
}

interface IotDevice {
  id: string
  name: string
  status?: string
  device_type?: string
}

export function Fleets() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [fleets, setFleets] = useState<Fleet[]>([])
  const [allDevices, setAllDevices] = useState<IotDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [manageFleetId, setManageFleetId] = useState<string | null>(null)
  const [manageBusy, setManageBusy] = useState(false)
  // Inline two-step delete confirmation — the button reads "Confirm delete?"
  // after the first click, so a stray click cannot destroy a fleet.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Escape closes the create/manage modals (keyboard equivalent of the
  // pointer-only backdrop click).
  useEffect(() => {
    if (!showCreate && !manageFleetId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (showCreate && !createBusy) setShowCreate(false)
      if (manageFleetId && !manageBusy) {
        setManageFleetId(null)
        setConfirmDeleteId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showCreate, createBusy, manageFleetId, manageBusy])

  const loadFleets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [fleetsRes, devicesRes] = await Promise.all([
        http.get('/api/fleets'),
        http.get('/api/devices?limit=500'),
      ])
      const rows = unwrapList<FleetRow>(fleetsRes)
      const devicesAll = unwrapList<Record<string, unknown>>(devicesRes).map(
        (d) =>
          ({
            id: String(d.id),
            name: String(d.name ?? d.id),
            status: d.status ? String(d.status) : 'offline',
            device_type: d.device_type ? String(d.device_type) : 'sensor',
          }) satisfies IotDevice,
      )
      setAllDevices(devicesAll)
      // For each fleet, fetch members.
      const enriched = await Promise.all(
        rows.map(async (f) => {
          try {
            const r = await http.get(`/api/fleets/${f.id}/devices`)
            const devices = unwrapList<IotDevice>(r)
            const online = devices.filter(
              (d) => d.status === 'online' || d.status === 'provisioning',
            ).length
            const warning = devices.filter((d) => d.status === 'warning').length
            const critical = devices.filter((d) => d.status === 'critical').length
            return {
              id: f.id,
              name: f.name,
              description: f.description ?? null,
              device_count: devices.length,
              online,
              warning,
              critical,
              member_ids: devices.map((d) => d.id),
            } satisfies Fleet
          } catch (_error) {
            // Per-fleet member enrichment failed; fall back to empty counts
            return {
              id: f.id,
              name: f.name,
              description: f.description ?? null,
              device_count: 0,
              online: 0,
              warning: 0,
              critical: 0,
              member_ids: [],
            } satisfies Fleet
          }
        }),
      )
      setFleets(enriched)
    } catch (error) {
      logError('fleets.load', error)
      setError(t('fleets.loadError', {}, { defaultValue: 'Failed to load fleets.' }))
      setFleets([])
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    loadFleets()
  }, [loadFleets])

  const toggleMembership = useCallback(
    async (fleetId: string, deviceId: string, member: boolean) => {
      setManageBusy(true)
      setFeedback(null)
      try {
        if (member) {
          await http.delete(`/api/fleets/${fleetId}/devices/${deviceId}`)
        } else {
          await http.post(`/api/fleets/${fleetId}/devices`, { device_id: deviceId })
        }
        await loadFleets()
      } catch (err) {
        setFeedback({
          kind: 'error',
          text:
            err instanceof Error
              ? err.message
              : t('common.failed', {}, { defaultValue: 'Failed.' }),
        })
      } finally {
        setManageBusy(false)
      }
    },
    [http, loadFleets, t],
  )

  const deleteFleet = useCallback(
    async (id: string) => {
      if (manageBusy) return
      setManageBusy(true)
      setFeedback(null)
      setConfirmDeleteId(null)
      try {
        await http.delete(`/api/fleets/${id}`)
        void track({ name: 'fleet.deleted', properties: { fleet_id: id } })
        setManageFleetId(null)
        await loadFleets()
        setFeedback({
          kind: 'success',
          text: t('fleets.deleted', {}, { defaultValue: 'Fleet deleted.' }),
        })
      } catch (err) {
        setFeedback({
          kind: 'error',
          text:
            err instanceof Error
              ? err.message
              : t('common.failed', {}, { defaultValue: 'Failed.' }),
        })
      } finally {
        setManageBusy(false)
      }
    },
    [http, loadFleets, manageBusy, t],
  )

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!createName.trim() || createBusy) return
      setCreateBusy(true)
      setCreateError(null)
      try {
        const res = await http.post('/api/fleets', {
          name: createName.trim(),
          description: createDescription.trim() || undefined,
        })
        const created = unwrapSingle<Record<string, unknown>>(res)
        if (!created || !created.id) {
          throw new Error(t('fleets.createError', {}, { defaultValue: 'Failed to create fleet.' }))
        }
        setShowCreate(false)
        setCreateName('')
        setCreateDescription('')
        void track({
          name: 'fleet.created',
          properties: { fleet_id: String(created.id) },
        })
        await loadFleets()
      } catch (err) {
        setCreateError(
          err instanceof Error
            ? err.message
            : t('fleets.createError', {}, { defaultValue: 'Failed to create fleet.' }),
        )
      } finally {
        setCreateBusy(false)
      }
    },
    [createName, createDescription, createBusy, http, loadFleets, t],
  )

  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
            {t('fleets.heading', {}, { defaultValue: 'Fleets' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'fleets.subheading',
              { count: fleets.length },
              { defaultValue: '{{count}} logical groups · bulk operations + per-region cohorts' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'font-semibold rounded-full text-white hover:opacity-90 transition-opacity',
          )}
          style={{
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
          }}
        >
          + {t('fleets.addLabel', {}, { defaultValue: 'New fleet' })}
        </button>
      </header>

      {feedback && (
        <div
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-lg text-sm font-medium border',
            feedback.kind === 'success'
              ? 'bg-success-container text-on-success-container border-success'
              : 'bg-error-container text-on-error-container border-error',
          )}
        >
          {feedback.text}
        </div>
      )}

      {error && <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p>}

      {fleets.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          <p className={cm.cn(cm.textSize('sm'))}>
            {t(
              'fleets.empty',
              {},
              {
                defaultValue:
                  'No fleets yet. Group devices into fleets for bulk firmware rollouts and regional cohorts.',
              },
            )}
          </p>
        </div>
      ) : (
        <section
          className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}
        >
          {fleets.map((f) => {
            const safeTotal = Math.max(1, f.device_count)
            const onlinePct = f.device_count === 0 ? 0 : Math.round((f.online / safeTotal) * 100)
            const accent: 'error' | 'warning' | 'success' =
              f.critical > 0 ? 'error' : f.warning > 0 ? 'warning' : 'success'
            return (
              <article
                key={f.id}
                data-mol-id={`fleets-row-${f.id}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all',
                  cm.accentCard({ tone: accent }),
                )}
              >
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <h2 className={cm.cn('text-lg font-bold')}>{f.name}</h2>
                </div>
                <p className={cm.cn('mt-1', cm.accentCardLabel({ tone: accent }))}>
                  {t(
                    'fleets.deviceCount',
                    { count: f.device_count },
                    { defaultValue: '{{count}} devices' },
                  )}
                </p>
                {f.description && (
                  <p className={cm.cn('mt-1 text-xs text-on-surface-variant')}>{f.description}</p>
                )}

                <div
                  className={cm.cn(
                    cm.sp('mt', 4),
                    cm.flex({ align: 'baseline', justify: 'between' }),
                  )}
                >
                  <span className={cm.cn('text-3xl font-extrabold tabular-nums font-mono')}>
                    {onlinePct}
                    <span className={cm.cn('text-base text-on-surface-variant')}>%</span>
                  </span>
                  <span
                    className={cm.cn(
                      'text-[10px] uppercase tracking-widest font-bold text-on-surface-variant',
                    )}
                  >
                    {t('settings.online', {}, { defaultValue: 'Online' })}
                  </span>
                </div>
                <div
                  className={cm.cn('mt-3 h-1.5 rounded-full bg-surface-container overflow-hidden')}
                  aria-hidden="true"
                >
                  <div
                    className={cm.cn('h-full rounded-full transition-all')}
                    style={{
                      width: `${onlinePct}%`,
                      background:
                        'linear-gradient(90deg, var(--color-success) 0%, var(--color-accent) 100%)',
                    }}
                  />
                </div>

                <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mt', 4))}>
                  <Stat
                    label={t('fleets.warning', {}, { defaultValue: 'Warn' })}
                    value={f.warning}
                    tone="text-warning"
                  />
                  <Stat
                    label={t('fleets.critical', {}, { defaultValue: 'Crit' })}
                    value={f.critical}
                    tone={f.critical > 0 ? 'text-error' : 'text-on-surface-variant'}
                  />
                  <Stat
                    label={t('status.off', {}, { defaultValue: 'Off' })}
                    value={Math.max(0, f.device_count - f.online - f.warning - f.critical)}
                    tone="text-on-surface-variant"
                  />
                </div>

                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'end', gap: 'sm' }),
                    cm.sp('mt', 4),
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setManageFleetId(f.id)}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      'font-semibold rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors',
                    )}
                    data-mol-id={`fleets-manage-${f.id}`}
                  >
                    {t('fleets.manage', {}, { defaultValue: 'Manage devices' })}
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      )}

      {showCreate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-fleet-heading"
          className={cm.cn('fixed inset-0 z-50 flex items-center justify-center p-4')}
        >
          <div
            aria-hidden="true"
            onClick={() => !createBusy && setShowCreate(false)}
            className={cm.cn('absolute inset-0 bg-on-surface/40 backdrop-blur-sm')}
          />
          <div className={cm.cn('relative w-full max-w-md rounded-2xl bg-surface shadow-2xl p-6')}>
            <h2
              id="new-fleet-heading"
              className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight mb-4')}
            >
              {t('fleets.create.title', {}, { defaultValue: 'Create a new fleet' })}
            </h2>
            <form onSubmit={handleCreate} className={cm.stack(4)}>
              <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
                <span
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('fleets.create.nameLabel', {}, { defaultValue: 'Fleet name' })}
                </span>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder={t(
                    'fleets.create.namePlaceholder',
                    {},
                    { defaultValue: 'EU West Manufacturing' },
                  )}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'bg-surface-container-low rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary/30',
                  )}
                />
              </label>
              <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
                <span
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.descriptionOptional', {}, { defaultValue: 'Description (optional)' })}
                </span>
                <textarea
                  rows={2}
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder={t(
                    'fleets.create.descriptionPlaceholder',
                    {},
                    { defaultValue: 'Compressors and pumps in the Berlin facility…' },
                  )}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'bg-surface-container-low rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary/30',
                  )}
                />
              </label>

              {createError && (
                <p className={cm.cn(cm.textSize('xs'), 'text-error')}>{createError}</p>
              )}

              <div className={cm.flex({ align: 'center', justify: 'end', gap: 'sm' })}>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  disabled={createBusy}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'font-semibold rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50',
                  )}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  disabled={createBusy || !createName.trim()}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'font-semibold rounded-full text-white hover:opacity-90 transition-opacity disabled:opacity-50',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                  }}
                  data-mol-id="fleets-create-submit"
                >
                  {createBusy
                    ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                    : t('common.create', {}, { defaultValue: 'Create' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {manageFleetId &&
        (() => {
          const fleet = fleets.find((f) => f.id === manageFleetId)
          if (!fleet) return null
          return (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="manage-fleet-heading"
              className={cm.cn('fixed inset-0 z-50 flex items-center justify-center p-4')}
            >
              <div
                aria-hidden="true"
                onClick={() => {
                  if (!manageBusy) {
                    setManageFleetId(null)
                    setConfirmDeleteId(null)
                  }
                }}
                className={cm.cn('absolute inset-0 bg-on-surface/40 backdrop-blur-sm')}
              />
              <div
                className={cm.cn('relative w-full max-w-lg rounded-2xl bg-surface shadow-2xl p-6')}
              >
                <h2
                  id="manage-fleet-heading"
                  className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight mb-2')}
                >
                  {t(
                    'fleets.manage.title',
                    { name: fleet.name },
                    { defaultValue: 'Manage {{name}}' },
                  )}
                </h2>
                <p className={cm.cn('text-xs text-on-surface-variant mb-4')}>
                  {t(
                    'fleets.manage.body',
                    {},
                    {
                      defaultValue:
                        'Toggle membership for each device. Members receive bulk firmware rollouts targeted at this fleet.',
                    },
                  )}
                </p>

                {allDevices.length === 0 ? (
                  <p className={cm.cn('text-sm text-on-surface-variant py-4')}>
                    {t(
                      'fleets.manage.noDevices',
                      {},
                      { defaultValue: 'Register a device first to add members.' },
                    )}
                  </p>
                ) : (
                  <ul className={cm.cn('space-y-1 max-h-64 overflow-y-auto')}>
                    {allDevices.map((d) => {
                      const isMember = fleet.member_ids.includes(d.id)
                      return (
                        <li
                          key={d.id}
                          className={cm.cn(
                            'flex items-center justify-between py-1 px-2 rounded-lg hover:bg-surface-container-low',
                          )}
                        >
                          <div className={cm.cn('flex-1 min-w-0')}>
                            <p className={cm.cn('text-sm font-semibold truncate')}>{d.name}</p>
                            <p className={cm.cn('text-[10px] font-mono text-on-surface-variant')}>
                              {d.device_type} · {d.status}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={manageBusy}
                            onClick={() => toggleMembership(fleet.id, d.id, isMember)}
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.sp('py', 1),
                              cm.textSize('xs'),
                              'font-bold uppercase tracking-widest rounded-full border transition-colors disabled:opacity-50',
                              isMember
                                ? 'bg-error/10 text-error border-error/40 hover:bg-error/20'
                                : 'bg-success/10 text-success border-success/40 hover:bg-success/20',
                            )}
                            data-mol-id={`fleets-toggle-${fleet.id}-${d.id}`}
                          >
                            {isMember
                              ? t('common.remove', {}, { defaultValue: 'Remove' })
                              : t('common.add', {}, { defaultValue: 'Add' })}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}

                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    cm.sp('mt', 4),
                  )}
                >
                  <button
                    type="button"
                    disabled={manageBusy}
                    onClick={() => {
                      if (confirmDeleteId === fleet.id) {
                        deleteFleet(fleet.id)
                      } else {
                        setConfirmDeleteId(fleet.id)
                      }
                    }}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.textSize('xs'),
                      'font-bold uppercase tracking-widest hover:underline disabled:opacity-50',
                      confirmDeleteId === fleet.id ? 'text-error underline' : 'text-error',
                    )}
                    data-mol-id={`fleets-delete-${fleet.id}`}
                  >
                    {confirmDeleteId === fleet.id
                      ? t('fleets.deleteConfirm', {}, { defaultValue: 'Confirm delete?' })
                      : t('fleets.delete', {}, { defaultValue: 'Delete fleet' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManageFleetId(null)
                      setConfirmDeleteId(null)
                    }}
                    disabled={manageBusy}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      'font-semibold rounded-full bg-primary text-on-primary disabled:opacity-50',
                    )}
                    data-mol-id={`fleets-manage-close-${fleet.id}`}
                  >
                    {t('common.done', {}, { defaultValue: 'Done' })}
                  </button>
                </div>
              </div>
            </div>
          )
        })()}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ direction: 'col' })}>
      <span className={cm.cn('text-lg font-extrabold tabular-nums font-mono', tone)}>{value}</span>
      <span
        className={cm.cn('text-[9px] font-bold uppercase tracking-widest text-on-surface-variant')}
      >
        {label}
      </span>
    </div>
  )
}
