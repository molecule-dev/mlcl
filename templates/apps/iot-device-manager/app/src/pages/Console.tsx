import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import type { FleetDevice } from '../components/DeviceActivityFeed.js'
import { getRealtimeConnection } from '../lib/realtime.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const CONSOLE_LINE_CAP = 500

interface ConsoleLine {
  ts: string
  kind: 'prompt' | 'output' | 'success' | 'error' | 'warning'
  text: string
}

const HELP_LINES: ConsoleLine[] = [
  { ts: '--', kind: 'output', text: 'Available commands:' },
  {
    ts: '--',
    kind: 'output',
    text: '  send <command_type>           Send command to selected target.',
  },
  { ts: '--', kind: 'output', text: '  send <command_type> {json}    Same, with JSON payload.' },
  { ts: '--', kind: 'output', text: '  reboot                        Shortcut for `send reboot`.' },
  {
    ts: '--',
    kind: 'output',
    text: '  log                           Tail latest commands for this device.',
  },
  { ts: '--', kind: 'output', text: '  help                          Show this list.' },
  { ts: '--', kind: 'output', text: '  clear                         Clear the terminal.' },
]

function ts(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false })
}

function normalizeDevice(row: Record<string, unknown>): FleetDevice {
  return {
    id: String(row.id),
    name: String(row.name ?? row.id),
    serial_number: row.serial_number ? String(row.serial_number) : undefined,
    status: String(row.status ?? 'offline').toLowerCase() as FleetDevice['status'],
    device_type: String(row.device_type ?? 'sensor'),
    firmware_version: row.firmware_version ? String(row.firmware_version) : undefined,
    last_seen: row.last_seen ? String(row.last_seen) : undefined,
  }
}

export function Console() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [devices, setDevices] = useState<FleetDevice[]>([])
  const [target, setTarget] = useState<string>('')
  const [draft, setDraft] = useState('')
  const [lines, setLines] = useState<ConsoleLine[]>([])
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/devices?limit=500')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<Record<string, unknown>>(res).map(normalizeDevice)
        setDevices(list)
        if (list.length > 0) setTarget(list[0].id)
        setLines([
          { ts: ts(), kind: 'output', text: `Connected · ${list.length} devices loaded.` },
          {
            ts: ts(),
            kind: 'success',
            text:
              list.length > 0
                ? '✓ ready · type `help` for available commands'
                : '✓ ready · register a device to begin',
          },
        ])
      })
      .catch(() => {
        if (!cancelled) {
          setLines([{ ts: ts(), kind: 'error', text: 'Failed to load device list.' }])
        }
      })
    return () => {
      cancelled = true
    }
  }, [http])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  const targetDevice = useMemo(() => devices.find((d) => d.id === target), [devices, target])

  const append = useCallback((line: ConsoleLine | ConsoleLine[]) => {
    setLines((prev) => prev.concat(Array.isArray(line) ? line : [line]))
  }, [])

  const tailCommands = useCallback(async () => {
    if (!target) return
    try {
      const res = await http.get(`/api/commands?device_id=${target}&limit=10`)
      const cmds = unwrapList<Record<string, unknown>>(res)
      if (cmds.length === 0) {
        append({ ts: ts(), kind: 'output', text: 'No recent commands.' })
        return
      }
      append([
        { ts: ts(), kind: 'output', text: `Last ${cmds.length} commands:` },
        ...cmds.map<ConsoleLine>((c) => {
          const status = String(c.status ?? 'unknown')
          const kind: ConsoleLine['kind'] =
            status === 'failed' || status === 'error'
              ? 'error'
              : status === 'completed' || status === 'acknowledged'
                ? 'success'
                : status === 'canceled'
                  ? 'warning'
                  : 'output'
          return {
            ts: new Date(String(c.created_at ?? Date.now())).toLocaleTimeString('en-GB', {
              hour12: false,
            }),
            kind,
            text: `  ${String(c.command_type ?? '?').padEnd(20)} ${status}`,
          }
        }),
      ])
    } catch (error) {
      logError('console.tailCommands', error)
      append({ ts: ts(), kind: 'error', text: 'Failed to read command log.' })
    }
  }, [append, http, target])

  // Live tail: stream the selected device's logs and command-status updates into
  // the terminal. `logs:<id>` is otherwise dead (no other consumer). Re-subscribes
  // when the target device changes. Server: api/src/handlers/{logs,commands}.ts.
  useEffect(() => {
    if (!target) return
    const rooms = [`logs:${target}`, `commands:${target}:status`]
    let active = true
    let connection: RealtimeConnection | null = null

    const asRecord = (data: unknown): Record<string, unknown> | null =>
      typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null
    const push = (line: ConsoleLine) => setLines((prev) => [...prev, line].slice(-CONSOLE_LINE_CAP))

    const onLog = (data: unknown) => {
      const rec = asRecord(data)
      const log = rec && asRecord(rec.log)
      if (!log) return
      const level = String(log.level ?? 'info').toLowerCase()
      const kind: ConsoleLine['kind'] =
        level === 'error' || level === 'fatal'
          ? 'error'
          : level === 'warn' || level === 'warning'
            ? 'warning'
            : 'output'
      const source = log.source ? `${String(log.source)}: ` : ''
      push({ ts: ts(), kind, text: `[${level}] ${source}${String(log.message ?? '')}` })
    }
    const onStatus = (data: unknown) => {
      const rec = asRecord(data)
      const command = rec && asRecord(rec.command)
      if (!command) return
      const status = String(command.status ?? 'unknown')
      const kind: ConsoleLine['kind'] =
        status === 'failed' || status === 'error'
          ? 'error'
          : status === 'completed' || status === 'acknowledged'
            ? 'success'
            : status === 'canceled'
              ? 'warning'
              : 'output'
      push({
        ts: ts(),
        kind,
        text: `  ${String(command.command_type ?? '?').padEnd(20)} ${status}`,
      })
    }

    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        conn.on('log', onLog)
        conn.on('status', onStatus)
        return Promise.all(rooms.map((r) => conn.joinRoom(r)))
      })
      .catch(() => {
        // Realtime is best-effort; the terminal still works for manual commands.
      })

    return () => {
      active = false
      if (connection) {
        connection.off('log', onLog)
        connection.off('status', onStatus)
        for (const r of rooms) connection.leaveRoom(r).catch(() => {})
      }
    }
  }, [target])

  const sendCommand = useCallback(
    async (commandType: string, payload: Record<string, unknown>) => {
      if (!target) {
        append({ ts: ts(), kind: 'error', text: 'No target device selected.' })
        return
      }
      setBusy(true)
      append({
        ts: ts(),
        kind: 'output',
        text: `→ dispatching to ${targetDevice?.name ?? target}…`,
      })
      try {
        const res = await http.post('/api/commands', {
          device_id: target,
          command_type: commandType,
          payload,
          priority: 'normal',
        })
        const created = unwrapSingle<Record<string, unknown>>(res)
        const id = created?.id ? String(created.id).slice(0, 8) : '?'
        append({ ts: ts(), kind: 'success', text: `✓ command queued · ${id}` })
        void track({
          name: 'command.sent',
          properties: {
            device_id: target,
            command_type: commandType,
            command_id: created?.id ? String(created.id) : undefined,
            source: 'console',
          },
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'send failed'
        append({ ts: ts(), kind: 'error', text: `✗ ${msg}` })
      } finally {
        setBusy(false)
      }
    },
    [append, http, target, targetDevice],
  )

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const command = draft.trim()
      if (!command) return
      append({ ts: ts(), kind: 'prompt', text: command })
      setDraft('')

      if (command === 'help' || command === '?') {
        append(HELP_LINES)
        return
      }
      if (command === 'clear') {
        setLines([])
        return
      }
      if (command === 'log' || command === 'tail') {
        await tailCommands()
        return
      }
      if (command === 'reboot') {
        await sendCommand('reboot', { confirm: true })
        return
      }
      const sendMatch = command.match(/^send\s+(\S+)(?:\s+(.+))?$/)
      if (sendMatch) {
        const [, commandType, rawPayload] = sendMatch
        let payload: Record<string, unknown> = {}
        if (rawPayload) {
          try {
            payload = JSON.parse(rawPayload)
          } catch (_error) {
            // Invalid JSON from user input — error message shown in console output
            append({ ts: ts(), kind: 'error', text: 'Invalid JSON payload.' })
            return
          }
        }
        await sendCommand(commandType, payload)
        return
      }
      append({ ts: ts(), kind: 'error', text: `Unknown command: ${command}. Try \`help\`.` })
    },
    [append, draft, sendCommand, tailCommands],
  )

  const targetLabel = targetDevice ? (targetDevice.serial_number ?? targetDevice.id) : '—'

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(6))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
            {t('console.heading', {}, { defaultValue: 'Live console' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'console.subheading',
              {},
              {
                defaultValue:
                  'Send commands to devices, watch acknowledgments stream back, scrub the audit trail.',
              },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <label
            className={cm.cn(
              'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('console.target', {}, { defaultValue: 'Target' })}
          </label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={devices.length === 0}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'bg-surface-container-lowest border border-outline-variant rounded-full text-xs font-mono',
            )}
          >
            {devices.length === 0 && (
              <option value="">
                {t('console.noDevices', {}, { defaultValue: '— no devices —' })}
              </option>
            )}
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.serial_number ?? d.id} — {d.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <section
        className={cm.cn(
          'relative overflow-hidden rounded-[1.25rem] shadow-2xl shadow-on-surface/10',
        )}
        // Console-navy per DESIGN.md — fixed (NOT var(--color-text), which flips
        // light in dark mode and would put the light terminal text on white).
        style={{ backgroundColor: '#0c1222' }}
      >
        <div
          className={cm.cn('px-5 py-3 border-b border-surface/5 flex items-center gap-3')}
          style={{ backgroundColor: '#060a12' }}
        >
          <span className={cm.cn('flex gap-1.5')} aria-hidden="true">
            <span className={cm.cn('w-3 h-3 rounded-full bg-red-500/80')} />
            <span className={cm.cn('w-3 h-3 rounded-full bg-amber-500/80')} />
            <span className={cm.cn('w-3 h-3 rounded-full bg-emerald-500/80')} />
          </span>
          <span className={cm.cn('text-[11px] font-mono text-cyan-300/70')}>
            {APP_NAME.toLowerCase()} · {targetLabel}
          </span>
          <span
            className={cm.cn(
              'ml-auto text-[10px] font-mono text-emerald-300 flex items-center gap-1.5',
            )}
          >
            <span className={cm.cn('w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse')} />
            {busy
              ? t('console.sending', {}, { defaultValue: 'sending…' })
              : t('console.connected', {}, { defaultValue: 'mqtt connected' })}
          </span>
        </div>

        <div
          ref={scrollRef}
          className={cm.cn(
            // Constant slate on the fixed console-navy shell — theme tokens would
            // flip dark-on-dark in dark mode.
            'px-6 py-5 font-mono text-sm leading-relaxed h-[420px] overflow-y-auto text-slate-300',
          )}
        >
          {lines.map((l, i) => (
            <div key={i} className={cm.cn('flex gap-3')}>
              <span className={cm.cn('text-slate-500 tabular-nums text-xs shrink-0 w-20 mt-0.5')}>
                {l.ts}
              </span>
              {l.kind === 'prompt' && (
                <>
                  <span className={cm.cn('text-cyan-400 shrink-0')}>$</span>
                  <span className={cm.cn('text-slate-300')}>{l.text}</span>
                </>
              )}
              {l.kind === 'output' && (
                <span className={cm.cn('text-slate-300 whitespace-pre-wrap break-words min-w-0')}>
                  {l.text}
                </span>
              )}
              {l.kind === 'success' && <span className={cm.cn('text-emerald-400')}>{l.text}</span>}
              {l.kind === 'warning' && <span className={cm.cn('text-amber-400')}>{l.text}</span>}
              {l.kind === 'error' && <span className={cm.cn('text-red-400')}>{l.text}</span>}
            </div>
          ))}
        </div>

        <form
          onSubmit={onSubmit}
          className={cm.cn('px-6 py-4 border-t border-surface/5 flex items-center gap-3')}
          style={{ backgroundColor: '#0a0f1c' }}
        >
          <span className={cm.cn('text-cyan-400 font-mono shrink-0')}>$</span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t(
              'console.placeholder',
              {},
              { defaultValue: 'send <command_type> [json] · reboot · log · help' },
            )}
            disabled={busy || !target}
            className={cm.cn(
              'flex-1 bg-transparent text-slate-200 placeholder:text-slate-500 font-mono text-sm focus:outline-none disabled:opacity-50',
            )}
          />
          <button
            type="submit"
            disabled={busy || !target}
            className={cm.cn(
              'px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest text-white disabled:opacity-50',
            )}
            style={{
              background: 'linear-gradient(135deg, var(--color-accent), var(--color-secondary))',
            }}
          >
            {t('common.send', {}, { defaultValue: 'Send' })}
          </button>
        </form>
      </section>
    </div>
  )
}
