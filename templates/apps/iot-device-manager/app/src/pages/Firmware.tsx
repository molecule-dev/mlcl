import { useCallback, useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { FirmwareCampaign } from '../components/FirmwareCampaignCard.js'
import { FirmwareCampaignCard } from '../components/FirmwareCampaignCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const DEVICE_TYPES = ['sensor', 'gateway', 'actuator', 'controller', 'camera', 'other'] as const

interface FirmwareVersion {
  id: string
  version: string
  device_type: string
  status: string
}

interface IotDevice {
  id: string
  name: string
  device_type: string
}

interface Fleet {
  id: string
  name: string
}

export function Firmware() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [campaigns, setCampaigns] = useState<FirmwareCampaign[]>([])
  const [versions, setVersions] = useState<FirmwareVersion[]>([])
  const [devices, setDevices] = useState<IotDevice[]>([])
  const [fleets, setFleets] = useState<Fleet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const [showUpload, setShowUpload] = useState(false)
  const [uploadVersion, setUploadVersion] = useState('')
  const [uploadType, setUploadType] = useState<(typeof DEVICE_TYPES)[number]>('sensor')
  const [uploadNotes, setUploadNotes] = useState('')
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [showRollout, setShowRollout] = useState(false)
  const [rolloutFirmwareId, setRolloutFirmwareId] = useState('')
  const [rolloutFleetId, setRolloutFleetId] = useState('')
  const [rolloutDeviceIds, setRolloutDeviceIds] = useState<string[]>([])
  const [rolloutBusy, setRolloutBusy] = useState(false)

  // Escape closes the upload/rollout modals (keyboard equivalent of the
  // pointer-only backdrop click).
  useEffect(() => {
    if (!showUpload && !showRollout) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (showUpload && !uploadBusy) setShowUpload(false)
      if (showRollout && !rolloutBusy) setShowRollout(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showUpload, uploadBusy, showRollout, rolloutBusy])
  const [rolloutError, setRolloutError] = useState<string | null>(null)

  const loadEverything = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [campaignsRes, versionsRes, devicesRes, fleetsRes] = await Promise.all([
        http.get('/api/firmware/campaigns'),
        http.get('/api/firmware?limit=500'),
        http.get('/api/devices?limit=500'),
        http.get('/api/fleets'),
      ])
      setCampaigns(unwrapList<FirmwareCampaign>(campaignsRes))
      setVersions(unwrapList<FirmwareVersion>(versionsRes))
      setDevices(
        unwrapList<Record<string, unknown>>(devicesRes).map((d) => ({
          id: String(d.id),
          name: String(d.name ?? d.id),
          device_type: String(d.device_type ?? 'sensor'),
        })),
      )
      setFleets(unwrapList<Fleet>(fleetsRes))
    } catch (error) {
      logError('firmware.load', error)
      setError(t('firmware.loadError', {}, { defaultValue: 'Failed to load firmware campaigns.' }))
      setCampaigns([])
      setVersions([])
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    loadEverything()
  }, [loadEverything])

  const handleUpload = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!uploadVersion.trim() || uploadBusy) return
      setUploadBusy(true)
      setUploadError(null)
      try {
        const createRes = await http.post('/api/firmware', {
          version: uploadVersion.trim(),
          device_type: uploadType,
          release_notes: uploadNotes.trim(),
        })
        const fw = unwrapSingle<Record<string, unknown>>(createRes)
        if (!fw || !fw.id) {
          throw new Error(
            t('firmware.uploadError', {}, { defaultValue: 'Failed to upload firmware.' }),
          )
        }
        // Auto-publish so it shows up immediately.
        await http.post(`/api/firmware/${String(fw.id)}/publish`, {})
        setShowUpload(false)
        setUploadVersion('')
        setUploadType('sensor')
        setUploadNotes('')
        void track({
          name: 'firmware.uploaded',
          properties: {
            firmware_id: String(fw.id),
            version: uploadVersion.trim(),
            device_type: uploadType,
          },
        })
        await loadEverything()
      } catch (err) {
        setUploadError(
          err instanceof Error
            ? err.message
            : t('firmware.uploadError', {}, { defaultValue: 'Failed to upload firmware.' }),
        )
      } finally {
        setUploadBusy(false)
      }
    },
    [uploadVersion, uploadType, uploadNotes, uploadBusy, http, loadEverything, t],
  )

  const publishedVersions = versions.filter((v) => v.status === 'published')

  const startRollout = useCallback(() => {
    setShowRollout(true)
    setRolloutError(null)
    setRolloutFleetId('')
    setRolloutDeviceIds([])
    if (!rolloutFirmwareId && publishedVersions.length > 0) {
      setRolloutFirmwareId(publishedVersions[0].id)
    }
  }, [publishedVersions, rolloutFirmwareId])

  const handleRollout = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!rolloutFirmwareId || rolloutBusy) return
      if (!rolloutFleetId && rolloutDeviceIds.length === 0) {
        setRolloutError(
          t(
            'firmware.rollout.needTarget',
            {},
            { defaultValue: 'Pick a fleet or at least one device.' },
          ),
        )
        return
      }
      setRolloutBusy(true)
      setRolloutError(null)
      try {
        const body: Record<string, unknown> = { firmware_id: rolloutFirmwareId }
        if (rolloutFleetId) body.fleet_id = rolloutFleetId
        if (rolloutDeviceIds.length > 0) body.device_ids = rolloutDeviceIds
        const res = await http.post('/api/firmware/rollouts', body)
        const created = unwrapSingle<Record<string, unknown>>(res)
        if (!created || !created.id) {
          throw new Error(
            t('firmware.rollout.error', {}, { defaultValue: 'Rollout could not be created.' }),
          )
        }
        void track({
          name: 'firmware.rollout_started',
          properties: {
            rollout_id: String(created.id),
            firmware_id: rolloutFirmwareId,
            fleet_id: rolloutFleetId || undefined,
            device_count: rolloutDeviceIds.length,
          },
        })
        setShowRollout(false)
        setFeedback({
          kind: 'success',
          text: t(
            'firmware.rollout.queued',
            { count: Number(created.target_count ?? 0) },
            { defaultValue: 'Rollout queued for {{count}} device(s).' },
          ),
        })
        await loadEverything()
      } catch (err) {
        setRolloutError(
          err instanceof Error
            ? err.message
            : t('firmware.rollout.error', {}, { defaultValue: 'Rollout could not be created.' }),
        )
      } finally {
        setRolloutBusy(false)
      }
    },
    [rolloutFirmwareId, rolloutFleetId, rolloutDeviceIds, rolloutBusy, http, loadEverything, t],
  )

  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }

  const inFlight = campaigns.filter((c) => c.status === 'rolling' || c.status === 'pending').length
  const totalDevices = campaigns.reduce((sum, c) => sum + c.total_devices, 0)
  const updatedDevices = campaigns.reduce((sum, c) => sum + c.completed_devices, 0)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
            {t('firmware.heading', {}, { defaultValue: 'Firmware campaigns' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'firmware.subheading',
              {},
              {
                defaultValue:
                  'Versions, channels, rollouts. Phased waves with auto-rollback on failure thresholds.',
              },
            )}
          </p>
        </div>
        <div className={cm.flex({ gap: 'sm', align: 'center' })}>
          <button
            type="button"
            onClick={startRollout}
            disabled={publishedVersions.length === 0}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'font-semibold rounded-full bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50',
            )}
            data-mol-id="firmware-start-rollout"
          >
            {t('firmware.startRollout', {}, { defaultValue: 'Start rollout' })}
          </button>
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'font-semibold rounded-full text-white hover:opacity-90 transition-opacity',
            )}
            style={{
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            }}
            data-mol-id="firmware-upload"
          >
            + {t('firmware.uploadLabel', {}, { defaultValue: 'Upload firmware' })}
          </button>
        </div>
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

      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 lg:grid-cols-3')}>
        <div
          className={cm.cn(
            cm.sp('p', 5),
            'bg-surface-container-lowest rounded-xl border-l-4 border-primary shadow-sm',
          )}
        >
          <p
            className={cm.cn(
              'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('firmware.summary.inFlight', {}, { defaultValue: 'In-flight rollouts' })}
          </p>
          <p className={cm.cn('text-3xl font-extrabold tabular-nums font-mono mt-2')}>{inFlight}</p>
        </div>
        <div
          className={cm.cn(
            cm.sp('p', 5),
            'bg-surface-container-lowest rounded-xl border-l-4 border-success shadow-sm',
          )}
        >
          <p
            className={cm.cn(
              'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('firmware.summary.updated', {}, { defaultValue: 'Devices updated' })}
          </p>
          <p className={cm.cn('text-3xl font-extrabold tabular-nums font-mono mt-2')}>
            {updatedDevices.toLocaleString()}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.sp('p', 5),
            'bg-surface-container-lowest rounded-xl border-l-4 border-secondary shadow-sm',
          )}
        >
          <p
            className={cm.cn(
              'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('firmware.summary.total', {}, { defaultValue: 'Total fleet coverage' })}
          </p>
          <p className={cm.cn('text-3xl font-extrabold tabular-nums font-mono mt-2')}>
            {totalDevices.toLocaleString()}
          </p>
        </div>
      </section>

      {campaigns.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant text-sm')}>
          {t(
            'firmware.empty',
            {},
            {
              defaultValue:
                'No firmware versions yet. Upload your first firmware version to start rolling out updates.',
            },
          )}
        </p>
      ) : (
        <section
          className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}
        >
          {campaigns.map((c) => (
            <FirmwareCampaignCard key={c.id} campaign={c} />
          ))}
        </section>
      )}

      {showUpload && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-firmware-heading"
          className={cm.cn('fixed inset-0 z-50 flex items-center justify-center p-4')}
        >
          <div
            aria-hidden="true"
            onClick={() => !uploadBusy && setShowUpload(false)}
            className={cm.cn('absolute inset-0 bg-on-surface/40 backdrop-blur-sm')}
          />
          <div className={cm.cn('relative w-full max-w-md rounded-2xl bg-surface shadow-2xl p-6')}>
            <h2
              id="upload-firmware-heading"
              className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight mb-4')}
            >
              {t('firmware.upload.title', {}, { defaultValue: 'Upload a firmware version' })}
            </h2>
            <form onSubmit={handleUpload} className={cm.stack(4)}>
              <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
                <span
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('firmware.upload.versionLabel', {}, { defaultValue: 'Version' })}
                </span>
                <input
                  type="text"
                  required
                  value={uploadVersion}
                  onChange={(e) => setUploadVersion(e.target.value)}
                  placeholder="2.4.1"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'bg-surface-container-low rounded-xl border border-outline-variant text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30',
                  )}
                />
              </label>
              <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
                <span
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('firmware.upload.typeLabel', {}, { defaultValue: 'Device type' })}
                </span>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as (typeof DEVICE_TYPES)[number])}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'bg-surface-container-low rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary/30',
                  )}
                >
                  {DEVICE_TYPES.map((dt) => (
                    <option key={dt} value={dt}>
                      {t(`devices.type.${dt}`, {}, { defaultValue: dt })}
                    </option>
                  ))}
                </select>
              </label>
              <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
                <span
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(
                    'firmware.upload.notesLabel',
                    {},
                    { defaultValue: 'Release notes (optional)' },
                  )}
                </span>
                <textarea
                  rows={3}
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder={t(
                    'firmware.upload.notesPlaceholder',
                    {},
                    { defaultValue: 'Bug fixes, telemetry sampling improvements…' },
                  )}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'bg-surface-container-low rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary/30',
                  )}
                />
              </label>

              {uploadError && (
                <p className={cm.cn(cm.textSize('xs'), 'text-error')}>{uploadError}</p>
              )}

              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'firmware.upload.publishHint',
                  {},
                  {
                    defaultValue:
                      'Will be published immediately so it can be rolled out to fleets.',
                  },
                )}
              </p>

              <div className={cm.flex({ align: 'center', justify: 'end', gap: 'sm' })}>
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  disabled={uploadBusy}
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
                  disabled={uploadBusy || !uploadVersion.trim()}
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
                  data-mol-id="firmware-upload-submit"
                >
                  {uploadBusy
                    ? t('firmware.upload.submitting', {}, { defaultValue: 'Uploading…' })
                    : t('firmware.upload.submit', {}, { defaultValue: 'Upload & publish' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRollout && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rollout-firmware-heading"
          className={cm.cn('fixed inset-0 z-50 flex items-center justify-center p-4')}
        >
          <div
            aria-hidden="true"
            onClick={() => !rolloutBusy && setShowRollout(false)}
            className={cm.cn('absolute inset-0 bg-on-surface/40 backdrop-blur-sm')}
          />
          <div className={cm.cn('relative w-full max-w-md rounded-2xl bg-surface shadow-2xl p-6')}>
            <h2
              id="rollout-firmware-heading"
              className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight mb-4')}
            >
              {t('firmware.rollout.title', {}, { defaultValue: 'Roll out firmware' })}
            </h2>
            <form onSubmit={handleRollout} className={cm.stack(4)}>
              <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
                <span
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('firmware.rollout.versionLabel', {}, { defaultValue: 'Published version' })}
                </span>
                <select
                  value={rolloutFirmwareId}
                  onChange={(e) => setRolloutFirmwareId(e.target.value)}
                  required
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'bg-surface-container-low rounded-xl border border-outline-variant text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30',
                  )}
                  data-mol-id="firmware-rollout-version"
                >
                  <option value="" disabled>
                    —
                  </option>
                  {publishedVersions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version} · {v.device_type}
                    </option>
                  ))}
                </select>
              </label>

              <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
                <span
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(
                    'firmware.rollout.fleetLabel',
                    {},
                    { defaultValue: 'Target fleet (optional)' },
                  )}
                </span>
                <select
                  value={rolloutFleetId}
                  onChange={(e) => setRolloutFleetId(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'bg-surface-container-low rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary/30',
                  )}
                  data-mol-id="firmware-rollout-fleet"
                >
                  <option value="">
                    {t('firmware.rollout.noneOption', {}, { defaultValue: '— none —' })}
                  </option>
                  {fleets.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset
                className={cm.cn(
                  'rounded-xl border border-outline-variant p-3 max-h-48 overflow-y-auto',
                )}
              >
                <legend
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-2',
                  )}
                >
                  {t('firmware.rollout.devicesLabel', {}, { defaultValue: 'Or pick devices' })}
                </legend>
                {devices.length === 0 ? (
                  <p className={cm.cn('text-xs text-on-surface-variant py-2')}>
                    {t(
                      'firmware.rollout.noDevices',
                      {},
                      { defaultValue: 'No devices yet — register one to roll out updates.' },
                    )}
                  </p>
                ) : (
                  devices.map((d) => {
                    const checked = rolloutDeviceIds.includes(d.id)
                    return (
                      <label
                        key={d.id}
                        className={cm.cn('flex items-center gap-2 py-1 text-sm cursor-pointer')}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setRolloutDeviceIds((prev) =>
                              checked ? prev.filter((x) => x !== d.id) : [...prev, d.id],
                            )
                          }}
                          data-mol-id={`firmware-rollout-device-${d.id}`}
                        />
                        <span className={cm.cn('flex-1')}>{d.name}</span>
                        <span className={cm.cn('text-[10px] font-mono text-on-surface-variant')}>
                          {d.device_type}
                        </span>
                      </label>
                    )
                  })
                )}
              </fieldset>

              {rolloutError && (
                <p className={cm.cn(cm.textSize('xs'), 'text-error')}>{rolloutError}</p>
              )}

              <div className={cm.flex({ align: 'center', justify: 'end', gap: 'sm' })}>
                <button
                  type="button"
                  onClick={() => setShowRollout(false)}
                  disabled={rolloutBusy}
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
                  disabled={rolloutBusy || !rolloutFirmwareId}
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
                  data-mol-id="firmware-rollout-submit"
                >
                  {rolloutBusy
                    ? t('firmware.rollout.submitting', {}, { defaultValue: 'Queueing…' })
                    : t('firmware.rollout.submit', {}, { defaultValue: 'Queue rollout' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
