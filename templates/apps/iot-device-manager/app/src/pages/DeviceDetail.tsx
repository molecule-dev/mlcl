import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import type { FleetDevice } from '../components/DeviceActivityFeed.js'
import { DeviceKpiCard, SignalStrength, TelemetrySparkline } from '../components/DeviceKpiCard.js'
import { getRealtimeConnection } from '../lib/realtime.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const TELEMETRY_CAP = 120

/** Normalize a raw telemetry row (from fetch or a realtime `point` event). */
function normalizePoint(p: Record<string, unknown>): TelemetryPoint {
  return {
    id: p.id ? String(p.id) : undefined,
    metric: String(p.metric ?? 'metric'),
    value: Number(p.value ?? 0),
    unit: p.unit ? String(p.unit) : null,
    recorded_at: p.recorded_at ? String(p.recorded_at) : undefined,
  }
}

/** Normalize a raw command row (from fetch or a realtime `command`/`status` event). */
function normalizeCommand(c: Record<string, unknown>): DeviceCommand {
  return {
    id: String(c.id),
    command_type: String(c.command_type ?? 'unknown'),
    status: String(c.status ?? 'pending') as DeviceCommand['status'],
    created_at: String(c.created_at ?? new Date().toISOString()),
  }
}

interface TelemetryPoint {
  id?: string
  metric: string
  value: number
  unit?: string | null
  recorded_at?: string
}

interface DeviceCommand {
  id: string
  command_type: string
  status:
    'pending' | 'sent' | 'acknowledged' | 'completed' | 'failed' | 'canceled' | 'timeout' | 'error'
  created_at: string
}

const STATUS_RING: Record<string, string> = {
  online: 'shadow-success/40',
  warning: 'shadow-warning/40',
  critical: 'shadow-error/40',
  offline: 'shadow-on-surface-variant/40',
  provisioning: 'shadow-info/40',
  decommissioned: 'shadow-on-surface-variant/30',
}

const COMMAND_TONE: Record<string, string> = {
  pending: 'text-secondary',
  sent: 'text-secondary',
  acknowledged: 'text-success',
  completed: 'text-success',
  failed: 'text-error',
  canceled: 'text-on-surface-variant',
  timeout: 'text-warning',
  error: 'text-error',
}

const COMMON_COMMAND_TYPES = [
  'reboot',
  'config_refresh',
  'firmware_upgrade',
  'diagnostics',
  'shutdown',
]

function normalizeDevice(row: Record<string, unknown> | null | undefined): FleetDevice | null {
  if (!row || !row.id) return null
  const statusRaw = String(row.status ?? 'offline').toLowerCase()
  const status: FleetDevice['status'] =
    statusRaw === 'online'
      ? 'online'
      : statusRaw === 'warning'
        ? 'warning'
        : statusRaw === 'critical'
          ? 'critical'
          : 'offline'
  return {
    id: String(row.id),
    name: String(row.name ?? row.id),
    serial_number: row.serial_number ? String(row.serial_number) : undefined,
    status,
    device_type: String(row.device_type ?? 'sensor'),
    firmware_version: row.firmware_version ? String(row.firmware_version) : undefined,
    last_seen: row.last_seen ? String(row.last_seen) : undefined,
    signal: clampSignal(row.signal),
  }
}

function clampSignal(value: unknown): 0 | 1 | 2 | 3 | 4 | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const clamped = Math.max(0, Math.min(4, Math.round(value)))
  return clamped as 0 | 1 | 2 | 3 | 4
}

export function DeviceDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [device, setDevice] = useState<FleetDevice | null>(null)
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([])
  const [commands, setCommands] = useState<DeviceCommand[]>([])
  const [loading, setLoading] = useState(true)
  const [showCommandModal, setShowCommandModal] = useState(false)
  const [commandType, setCommandType] = useState('reboot')
  const [commandPayload, setCommandPayload] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionMessage, setActionMessage] = useState<{
    kind: 'success' | 'error'
    text: string
  } | null>(null)

  const refresh = useCallback(async () => {
    if (!id) return
    const [dev, tel, cmd] = await Promise.all([
      http.get(`/api/devices/${id}`).catch(() => null),
      http.get(`/api/telemetry?device_id=${id}&limit=120`).catch(() => null),
      http.get(`/api/commands?device_id=${id}&limit=20`).catch(() => null),
    ])
    setDevice(normalizeDevice(unwrapSingle<Record<string, unknown>>(dev)))
    // Fetched newest-first; reverse to chronological for the sparkline.
    const tels = unwrapList<Record<string, unknown>>(tel).map(normalizePoint).reverse()
    setTelemetry(tels)
    const cmds = unwrapList<Record<string, unknown>>(cmd).map(normalizeCommand)
    setCommands(cmds)
  }, [http, id])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    refresh()
      .catch(() => {
        /* network errors handled by individual requests */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refresh])

  // Live device streams for this device (the page fetches once, then goes live).
  // telemetry `point` → append (capped); `command`/`status` → upsert the command
  // list BY ID; firmware `rollout` → pull just the device (firmware/status may
  // have changed). Room membership scopes the generic event names to THIS device.
  // Server: api/src/handlers/{telemetry,commands,firmware}.ts; auth: lib/realtime.ts.
  useEffect(() => {
    if (!id) return
    let active = true
    let connection: RealtimeConnection | null = null
    const rooms = [`telemetry:${id}`, `commands:${id}`, `commands:${id}:status`, `firmware:${id}`]

    const asRecord = (data: unknown): Record<string, unknown> | null =>
      typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null

    const onPoint = (data: unknown) => {
      const rec = asRecord(data)
      const point = rec && asRecord(rec.point)
      if (!point) return
      setTelemetry((prev) => [...prev, normalizePoint(point)].slice(-TELEMETRY_CAP))
    }
    const onCommand = (data: unknown) => {
      const rec = asRecord(data)
      const command = rec && asRecord(rec.command)
      if (!command || command.id === undefined || command.id === null) return
      const next = normalizeCommand(command)
      // Newest-first (fetched limit=20): prepend if unseen, else refresh in place.
      setCommands((prev) =>
        prev.some((c) => c.id === next.id)
          ? prev.map((c) => (c.id === next.id ? next : c))
          : [next, ...prev].slice(0, 20),
      )
    }
    const onStatus = (data: unknown) => {
      const rec = asRecord(data)
      const command = rec && asRecord(rec.command)
      if (!command || command.id === undefined || command.id === null) return
      const next = normalizeCommand(command)
      setCommands((prev) => prev.map((c) => (c.id === next.id ? next : c)))
    }
    const onRollout = () => {
      void http
        .get(`/api/devices/${id}`)
        .then((d) => setDevice(normalizeDevice(unwrapSingle<Record<string, unknown>>(d))))
        .catch(() => {})
    }

    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        conn.on('point', onPoint)
        conn.on('command', onCommand)
        conn.on('status', onStatus)
        conn.on('rollout', onRollout)
        return Promise.all(rooms.map((r) => conn.joinRoom(r)))
      })
      .catch(() => {
        // Realtime is best-effort; the initial fetch already populated the view.
      })

    return () => {
      active = false
      if (connection) {
        connection.off('point', onPoint)
        connection.off('command', onCommand)
        connection.off('status', onStatus)
        connection.off('rollout', onRollout)
        for (const r of rooms) connection.leaveRoom(r).catch(() => {})
      }
    }
  }, [id, http])

  const sendCommand = useCallback(
    async (type: string, payloadObj?: Record<string, unknown>) => {
      if (!id || busy) return
      setBusy(true)
      setActionMessage(null)
      try {
        await http.post('/api/commands', {
          device_id: id,
          command_type: type,
          payload: payloadObj ?? {},
          priority: 'normal',
        })
        setActionMessage({
          kind: 'success',
          text: t(
            'deviceDetail.command.sent',
            { type },
            { defaultValue: 'Command "{{type}}" queued for delivery.' },
          ),
        })
        void track({
          name: 'command.sent',
          properties: { device_id: id, command_type: type, source: 'device-detail' },
        })
        await refresh()
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : t('deviceDetail.command.error', {}, { defaultValue: 'Failed to send command.' })
        setActionMessage({ kind: 'error', text: msg })
      } finally {
        setBusy(false)
      }
    },
    [busy, http, id, refresh, t],
  )

  const handleCommandSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!commandType.trim()) return
      let parsedPayload: Record<string, unknown> = {}
      if (commandPayload.trim()) {
        try {
          parsedPayload = JSON.parse(commandPayload)
        } catch (_error) {
          // Invalid JSON from user input — error message shown in action feedback
          setActionMessage({
            kind: 'error',
            text: t(
              'deviceDetail.command.invalidJson',
              {},
              { defaultValue: 'Payload must be valid JSON (or empty).' },
            ),
          })
          return
        }
      }
      await sendCommand(commandType.trim(), parsedPayload)
      setShowCommandModal(false)
      setCommandPayload('')
    },
    [commandPayload, commandType, sendCommand, t],
  )

  const series = useMemo(() => telemetry.slice(-24).map((p) => p.value), [telemetry])
  const latest = telemetry[telemetry.length - 1]

  // Fire-once per mount, after the initial fetch lands: the telemetry
  // funnel's "viewed" step (fire-and-forget; a no-op without a provider).
  const viewedTracked = useRef(false)
  useEffect(() => {
    if (loading || viewedTracked.current) return
    viewedTracked.current = true
    void track({
      name: 'telemetry.viewed',
      properties: { device_id: id, count: telemetry.length },
    })
  }, [loading, telemetry.length, id])

  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }

  if (!device) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.maxW('3xl'), cm.mxAuto, cm.textCenter)}
      >
        <p className={cm.cn('text-on-surface-variant')}>
          {t('deviceDetail.notFound', {}, { defaultValue: 'Device not found.' })}
        </p>
        <Link
          to="/devices"
          className={cm.cn(cm.sp('mt', 4), 'inline-block text-primary font-bold hover:underline')}
        >
          ← {t('deviceDetail.back', {}, { defaultValue: 'All devices' })}
        </Link>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        <Link to="/devices" className={cm.cn('text-sm font-bold text-primary hover:underline')}>
          ← {t('deviceDetail.back', {}, { defaultValue: 'All devices' })}
        </Link>
      </div>

      {actionMessage && (
        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-lg text-sm font-medium border',
            actionMessage.kind === 'success'
              ? 'bg-success-container text-on-success-container border-success'
              : 'bg-error-container text-on-error-container border-error',
          )}
          role={actionMessage.kind === 'error' ? 'alert' : 'status'}
        >
          {actionMessage.text}
        </div>
      )}

      <header
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] text-white shadow-2xl',
          STATUS_RING[device.status] ?? STATUS_RING.offline,
        )}
        style={{
          // Console-navy per DESIGN.md — fixed (NOT var(--color-text), which
          // flips light in dark mode and would put white text on white).
          backgroundColor: '#0c1222',
          backgroundImage:
            'radial-gradient(circle at 25% 50%, rgba(6, 182, 212, 0.45) 0%, transparent 40%),' +
            'radial-gradient(circle at 70% 30%, rgba(99, 102, 241, 0.35) 0%, transparent 35%),' +
            'linear-gradient(135deg, #0c1222 0%, #1a2332 100%)',
        }}
      >
        <div className={cm.cn('relative z-10 p-8 lg:p-10')}>
          {(() => {
            const isOnline = device.status === 'online'
            const dotColor = isOnline
              ? 'bg-emerald-400'
              : device.status === 'critical'
                ? 'bg-rose-400'
                : device.status === 'warning'
                  ? 'bg-amber-400'
                  : 'bg-slate-400'
            const labelColor = isOnline
              ? 'text-emerald-300'
              : device.status === 'critical'
                ? 'text-rose-300'
                : device.status === 'warning'
                  ? 'text-amber-300'
                  : 'text-slate-400'
            const label = device.last_seen
              ? t(
                  'deviceDetail.lastSeen',
                  { time: new Date(device.last_seen).toLocaleString() },
                  { defaultValue: 'Last seen {{time}}' },
                )
              : isOnline
                ? t('deviceDetail.live', {}, { defaultValue: 'Streaming · last seen now' })
                : t(
                    'deviceDetail.awaiting',
                    {},
                    { defaultValue: 'Awaiting first telemetry reading' },
                  )
            return (
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span className={cm.cn('relative flex h-3 w-3')} aria-hidden="true">
                  {isOnline && (
                    <span
                      className={cm.cn(
                        'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
                        dotColor,
                      )}
                    />
                  )}
                  <span className={cm.cn('relative inline-flex rounded-full h-3 w-3', dotColor)} />
                </span>
                <span
                  className={cm.cn('text-[11px] font-bold uppercase tracking-widest', labelColor)}
                >
                  {label}
                </span>
              </div>
            )
          })()}
          <div
            className={cm.cn(
              cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' }),
              cm.sp('mt', 4),
            )}
          >
            <div>
              <p
                className={cm.cn(
                  'text-[11px] font-bold uppercase tracking-widest text-cyan-300/80 mb-2',
                )}
              >
                {t(`devices.type.${device.device_type}`, {}, { defaultValue: device.device_type })}
              </p>
              <h1
                className={cm.cn(
                  'text-4xl md:text-5xl font-extrabold tracking-tight leading-tight',
                )}
              >
                {device.name}
              </h1>
              <p className={cm.cn('mt-2 text-sm font-mono text-cyan-300')}>
                {device.serial_number ?? device.id}
              </p>
            </div>
            <div className={cm.flex({ align: 'center', gap: 'md' })}>
              <button
                type="button"
                onClick={() => sendCommand('reboot', { confirm: true })}
                disabled={busy}
                className={cm.cn(
                  'px-4 py-2 rounded-full text-xs font-bold bg-surface/10 backdrop-blur-md hover:bg-surface/20 transition-colors',
                  busy && 'opacity-60 cursor-not-allowed',
                )}
              >
                {t('deviceDetail.action.reboot', {}, { defaultValue: 'Send reboot' })}
              </button>
              <button
                type="button"
                onClick={() => setShowCommandModal(true)}
                disabled={busy}
                className={cm.cn(
                  'px-4 py-2 rounded-full text-xs font-bold text-white',
                  busy && 'opacity-60 cursor-not-allowed',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-accent), var(--color-secondary))',
                }}
              >
                {t('deviceDetail.action.command', {}, { defaultValue: 'Send command' })}
              </button>
            </div>
          </div>
          <div
            className={cm.cn(
              'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none',
            )}
            aria-hidden="true"
          />
        </div>
      </header>

      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 lg:grid-cols-4')}>
        <DeviceKpiCard
          label={t('deviceDetail.kpi.metric', {}, { defaultValue: 'Last metric' })}
          value={latest ? `${latest.value.toFixed(1)}${latest.unit ? ' ' + latest.unit : ''}` : '—'}
          accentColor="border-primary"
          decoration={<TelemetrySparkline color="#0891b2" values={series} />}
        />
        <DeviceKpiCard
          label={t('deviceDetail.kpi.firmware', {}, { defaultValue: 'Firmware' })}
          value={`v${device.firmware_version ?? '—'}`}
          accentColor="border-secondary"
          meta={t('deviceDetail.kpi.firmwareMeta', {}, { defaultValue: 'channel: stable' })}
        />
        <DeviceKpiCard
          label={t('deviceDetail.kpi.signal', {}, { defaultValue: 'Signal' })}
          value={`${device.signal ?? 0} / 4`}
          accentColor="border-success"
          decoration={<SignalStrength bars={device.signal ?? 0} color="#10b981" />}
        />
        <DeviceKpiCard
          label={t('nav.status', {}, { defaultValue: 'Status' })}
          value={t(`devices.status.${device.status}`, {}, { defaultValue: device.status })}
          accentColor={
            device.status === 'critical'
              ? 'border-error'
              : device.status === 'warning'
                ? 'border-warning'
                : 'border-success'
          }
          valueTone={
            device.status === 'critical'
              ? 'text-error'
              : device.status === 'warning'
                ? 'text-warning'
                : 'text-success'
          }
        />
      </section>

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <div
          className={cm.cn('lg:col-span-2 bg-surface-container-lowest rounded-xl shadow-sm p-6')}
        >
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <h2 className={cm.cn('text-lg font-bold')}>
              {t(
                'deviceDetail.telemetryHeading',
                {},
                { defaultValue: 'Telemetry · last 24 readings' },
              )}
            </h2>
            <span
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {latest?.metric ?? '—'}
            </span>
          </div>
          <Sparkline values={series} />
          <p className={cm.cn('text-xs text-on-surface-variant font-mono mt-3')}>
            {telemetry.length === 0
              ? t(
                  'deviceDetail.telemetryEmpty',
                  {},
                  { defaultValue: 'No telemetry yet — waiting for the first reading.' },
                )
              : t(
                  'deviceDetail.telemetryFooter',
                  { count: telemetry.length },
                  { defaultValue: '{{count}} readings · most recent first' },
                )}
          </p>
        </div>

        <aside className={cm.cn('bg-surface-container-lowest rounded-xl shadow-sm p-6')}>
          <h2 className={cm.cn('text-lg font-bold mb-4')}>
            {t('deviceDetail.commandLogHeading', {}, { defaultValue: 'Command log' })}
          </h2>
          {commands.length === 0 ? (
            <p className={cm.cn('text-xs text-on-surface-variant font-mono py-4 text-center')}>
              {t('deviceDetail.commandLogEmpty', {}, { defaultValue: 'No commands sent yet.' })}
            </p>
          ) : (
            <ul className={cm.cn('space-y-3')}>
              {commands.map((c) => (
                <li
                  key={c.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('p', 2),
                    'rounded-md',
                  )}
                >
                  <div>
                    <p className={cm.cn('text-sm font-mono font-bold')}>{c.command_type}</p>
                    <p className={cm.cn('text-[10px] text-on-surface-variant font-mono')}>
                      {new Date(c.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest',
                      COMMAND_TONE[c.status] ?? 'text-on-surface-variant',
                    )}
                  >
                    {t(`deviceDetail.commandStatus.${c.status}`, {}, { defaultValue: c.status })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>

      {showCommandModal && (
        <div
          className={cm.cn(
            'fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-4',
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby="command-modal-heading"
        >
          <form
            onSubmit={handleCommandSubmit}
            className={cm.cn(
              'bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-lg',
              cm.sp('p', 6),
              cm.stack(4),
            )}
          >
            <h2 id="command-modal-heading" className={cm.cn('text-xl font-bold')}>
              {t('deviceDetail.command.title', {}, { defaultValue: 'Send custom command' })}
            </h2>
            <label className={cm.stack(2)}>
              <span
                className={cm.cn(
                  'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('deviceDetail.command.typeLabel', {}, { defaultValue: 'Command type' })}
              </span>
              <input
                list="cmd-types"
                value={commandType}
                onChange={(e) => setCommandType(e.target.value)}
                required
                pattern="[a-zA-Z][a-zA-Z0-9_]{1,63}"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-lg border border-outline bg-surface text-sm font-mono',
                )}
              />
              <datalist id="cmd-types">
                {COMMON_COMMAND_TYPES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label className={cm.stack(2)}>
              <span
                className={cm.cn(
                  'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t(
                  'deviceDetail.command.payloadLabel',
                  {},
                  { defaultValue: 'Payload (JSON, optional)' },
                )}
              </span>
              <textarea
                value={commandPayload}
                onChange={(e) => setCommandPayload(e.target.value)}
                rows={4}
                placeholder='{"target": "primary"}'
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-lg border border-outline bg-surface text-sm font-mono',
                )}
              />
            </label>
            <div className={cm.flex({ justify: 'end', gap: 'sm' })}>
              <button
                type="button"
                onClick={() => {
                  setShowCommandModal(false)
                  setCommandPayload('')
                }}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'text-sm font-semibold rounded-lg hover:bg-surface-container-low',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                disabled={busy}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'text-sm font-bold rounded-lg bg-primary text-on-primary disabled:opacity-60',
                )}
              >
                {busy
                  ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                  : t('deviceDetail.command.send', {}, { defaultValue: 'Send command' })}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function Sparkline({ values }: { values: number[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  if (values.length === 0) {
    return (
      <p className={cm.cn('text-xs text-on-surface-variant py-8 text-center')}>
        {t('deviceDetail.sparklineEmpty', {}, { defaultValue: 'No data.' })}
      </p>
    )
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 600
  const h = 140
  const step = w / Math.max(1, values.length - 1)
  const path = values
    .map((v, i) => {
      const x = i * step
      const y = h - ((v - min) / range) * h
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
  const area = `${path} L ${w} ${h} L 0 ${h} Z`
  return (
    <svg
      className={cm.cn('w-full h-36 mt-4')}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="telemetryFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#telemetryFill)" />
      <path
        d={path}
        fill="none"
        stroke="#0891b2"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
