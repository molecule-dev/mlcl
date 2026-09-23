import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import type { WhiteboardRow, WhiteboardStroke } from '../lib/api.js'
import { isUuid } from '../lib/api.js'
import { getRealtimeConnection } from '../lib/realtime.js'

const SWATCHES = [
  '#5b4dc7',
  '#e8853b',
  '#16a34a',
  '#06b6d4',
  '#ec4899',
  '#1e293b',
  '#f59e0b',
  '#000000',
]

const VIEW_W = 800
const VIEW_H = 450

export function Whiteboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const params = useParams()
  const roomId = params.id ?? ''

  const [strokes, setStrokes] = useState<WhiteboardStroke[]>([])
  const [color, setColor] = useState<string>(SWATCHES[0])
  const [width, setWidth] = useState<number>(3)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const svgRef = useRef<SVGSVGElement | null>(null)
  const drawingRef = useRef<{ points: { x: number; y: number }[] } | null>(null)
  const [draftPoints, setDraftPoints] = useState<{ x: number; y: number }[]>([])

  const refresh = useCallback(async () => {
    // The API validates :roomId as a UUID (400 otherwise) — a malformed deep
    // link must render its not-found state without firing doomed requests.
    if (!roomId || !isUuid(roomId)) {
      setError(
        t('whiteboard.roomNotFound', {}, { defaultValue: 'Whiteboard not found for this link.' }),
      )
      return
    }
    try {
      const res = await http.get<WhiteboardRow>(`/api/whiteboard/room/${roomId}`)
      setStrokes(Array.isArray(res.data.strokes) ? res.data.strokes : [])
      setSavedAt(res.data.updated_at ?? null)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load whiteboard')
    }
  }, [http, roomId, t])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    refresh().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [refresh])

  // Live board: a peer's stroke (or a clear) now arrives instantly via the
  // `room:<id>` room (was a 4 s poll). Strokes carry no client-stable id and the
  // draw handler already reconciles via refresh(), so `whiteboard-stroke` refetches
  // the authoritative board (idempotent — our own echo just re-pulls the same list)
  // and `whiteboard-cleared` empties it. A slow 20 s poll remains as a reconnect
  // safety net. Server: api/src/handlers/whiteboard.ts.
  useEffect(() => {
    // Also skip the realtime room for malformed ids — the server's join guard
    // would deny `room:<non-uuid>` exactly like the HTTP read above.
    if (loading || !isUuid(roomId)) return
    let active = true
    let connection: RealtimeConnection | null = null

    const onStroke = () => {
      void refresh()
    }
    const onCleared = () => {
      setStrokes([])
    }

    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        conn.on('whiteboard-stroke', onStroke)
        conn.on('whiteboard-cleared', onCleared)
        return conn.joinRoom(`room:${roomId}`)
      })
      .catch(() => {
        // Realtime is best-effort; the slow poll below still syncs the board.
      })

    const poll = setInterval(refresh, 20000)

    return () => {
      active = false
      clearInterval(poll)
      if (connection) {
        connection.off('whiteboard-stroke', onStroke)
        connection.off('whiteboard-cleared', onCleared)
        connection.leaveRoom(`room:${roomId}`).catch(() => {})
      }
    }
  }, [loading, refresh, roomId])

  const toLocal = (e: React.PointerEvent<SVGSVGElement>): { x: number; y: number } => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * VIEW_W
    const y = ((e.clientY - rect.top) / rect.height) * VIEW_H
    return { x, y }
  }

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    const p = toLocal(e)
    drawingRef.current = { points: [p] }
    setDraftPoints([p])
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawingRef.current) return
    const p = toLocal(e)
    drawingRef.current.points.push(p)
    setDraftPoints((prev) => [...prev, p])
  }

  const onPointerUp = async (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawingRef.current) return
    const captured = drawingRef.current
    drawingRef.current = null
    setDraftPoints([])
    if (captured.points.length < 1) return
    try {
      await http.post<WhiteboardStroke>(`/api/whiteboard/room/${roomId}/stroke`, {
        points: captured.points,
        color,
        width,
      })
      // Append optimistically; refresh will reconcile.
      setStrokes((prev) => [...prev, { points: captured.points, color, width }])
      void e
      void refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save stroke')
    }
  }

  const clearBoard = useCallback(async () => {
    try {
      await http.post(`/api/whiteboard/room/${roomId}/clear`, {})
      setStrokes([])
      void refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to clear whiteboard')
    }
  }, [http, refresh, roomId])

  const undoLast = useCallback(async () => {
    // No backend "undo" endpoint — undo is a clear + re-send all but last.
    // Cheap-and-cheerful: clear, then re-post (n - 1) strokes. Good enough
    // for a demo and keeps the server contract minimal.
    if (strokes.length === 0) return
    const next = strokes.slice(0, -1)
    try {
      await http.post(`/api/whiteboard/room/${roomId}/clear`, {})
      for (const s of next) {
        await http.post(`/api/whiteboard/room/${roomId}/stroke`, {
          points: s.points,
          color: s.color,
          width: s.width,
        })
      }
      setStrokes(next)
      void refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to undo')
    }
  }, [http, refresh, roomId, strokes])

  const exportSnapshot = useCallback(() => {
    if (!svgRef.current) return
    const data = new XMLSerializer().serializeToString(svgRef.current)
    const blob = new Blob([data], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `whiteboard-${roomId}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [roomId])

  const pathFromPoints = (points: { x: number; y: number }[]): string => {
    if (points.length === 0) return ''
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ')
  }

  return (
    <div className={cm.stack(6)} data-testid="whiteboard-root">
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <div className={cm.stack(1)}>
          <Link
            to={`/class/${roomId}`}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'self-start text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[16px]')}>arrow_back</span>
            {t('whiteboard.back', {}, { defaultValue: 'Return to classroom' })}
          </Link>
          <h1
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('whiteboard.title', {}, { defaultValue: 'Live whiteboard' })}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
            data-testid="whiteboard-status"
          >
            {loading
              ? t('whiteboard.loading', {}, { defaultValue: 'Loading board…' })
              : t(
                  'whiteboard.savedAt',
                  {
                    count: strokes.length,
                    when: savedAt ? new Date(savedAt).toLocaleTimeString() : '—',
                  },
                  { defaultValue: '{{count}} strokes · last saved {{when}}' },
                )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
          <button
            type="button"
            onClick={undoLast}
            data-testid="whiteboard-undo"
            disabled={strokes.length === 0}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>undo</span>
            {t('whiteboard.undo', {}, { defaultValue: 'Undo' })}
          </button>
          <button
            type="button"
            onClick={clearBoard}
            data-testid="whiteboard-clear"
            disabled={strokes.length === 0}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>delete</span>
            {t('whiteboard.clear', {}, { defaultValue: 'Clear' })}
          </button>
          <button
            type="button"
            onClick={exportSnapshot}
            data-testid="whiteboard-export"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-xl bg-primary text-on-primary hover:bg-primary-dark transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>download</span>
            {t('whiteboard.export', {}, { defaultValue: 'Export SVG' })}
          </button>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className={cm.cn(cm.sp('p', 4), 'rounded-xl bg-error-container text-on-error-container')}
        >
          {error}
        </div>
      ) : null}

      <div
        className={cm.cn(
          'relative rounded-3xl bg-surface shadow-lg border border-outline-variant/15 overflow-hidden',
        )}
      >
        <div
          className={cm.cn(
            'aspect-[16/9] relative bg-[radial-gradient(circle_at_1px_1px,color-mix(in_srgb,var(--color-primary)_16%,transparent)_1px,transparent_0)] bg-[length:24px_24px]',
          )}
        >
          <svg
            ref={svgRef}
            className={cm.cn('absolute inset-0 h-full w-full touch-none cursor-crosshair')}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="xMidYMid meet"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            data-testid="whiteboard-canvas"
          >
            {strokes.map((s, i) => (
              <path
                key={s.id ?? `s-${i}`}
                d={pathFromPoints(s.points)}
                stroke={s.color ?? '#000'}
                strokeWidth={s.width ?? 3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {draftPoints.length > 0 ? (
              <path
                d={pathFromPoints(draftPoints)}
                stroke={color}
                strokeWidth={width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.85}
              />
            ) : null}
          </svg>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'absolute right-4 top-4 rounded-full bg-surface-container-lowest shadow-md border border-outline-variant/15',
            )}
          >
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={t(
                  'whiteboard.colorLabel',
                  { color: c },
                  { defaultValue: 'Color {{color}}' },
                )}
                aria-pressed={color === c}
                data-testid={`whiteboard-color-${c.replace('#', '')}`}
                className={cm.cn(
                  'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                  color === c
                    ? 'border-primary scale-110'
                    : 'border-surface ring-1 ring-outline-variant/40',
                )}
                style={{ backgroundColor: c }}
              ></button>
            ))}
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'absolute bottom-4 right-4 rounded-full bg-surface-container-lowest shadow-md border border-outline-variant/15',
            )}
          >
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'))}>
              {t('whiteboard.brushLabel', {}, { defaultValue: 'Brush' })}
            </span>
            <input
              type="range"
              min={1}
              max={16}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              data-testid="whiteboard-brush-width"
              className={cm.cn('h-2 w-32 rounded-full accent-primary')}
              aria-label={t('whiteboard.brushWidth', {}, { defaultValue: 'Brush width' })}
            />
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'tabular-nums')}>
              {width}px
            </span>
          </div>
        </div>
      </div>

      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
        {t(
          'whiteboard.persistenceNote',
          {},
          {
            defaultValue:
              'Strokes persist to the room whiteboard. Reload the page — the board state should still be there.',
          },
        )}
      </p>
    </div>
  )
}

export default Whiteboard
