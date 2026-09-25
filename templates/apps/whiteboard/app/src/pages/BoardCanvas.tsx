import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'
import { useIsDesktop } from '@molecule/app-ui-react'

import { CollaboratorStack } from '../components/CollaboratorStack.js'
import { WhiteboardLayout } from '../components/WhiteboardLayout.js'
import { getRealtimeConnection } from '../lib/realtime.js'

const TOOLS: Array<{ id: ToolId; icon: string; label: string }> = [
  { id: 'select', icon: 'arrow_selector_tool', label: 'Select' },
  { id: 'draw', icon: 'draw', label: 'Draw' },
  { id: 'sticky', icon: 'sticky_note_2', label: 'Sticky' },
  { id: 'rectangle', icon: 'rectangle', label: 'Rectangle' },
  { id: 'ellipse', icon: 'circle', label: 'Ellipse' },
  { id: 'text', icon: 'text_fields', label: 'Text' },
  { id: 'eraser', icon: 'ink_eraser', label: 'Eraser' },
]

type ToolId = 'select' | 'draw' | 'sticky' | 'rectangle' | 'ellipse' | 'text' | 'eraser'

const STICKY_COLORS = ['#fef08a', '#bfdbfe', '#bbf7d0', '#fecdd3', '#e9d5ff', '#fed7aa']

/** Ink color for freehand strokes — dark enough on every board background. */
const STROKE_INK = '#312e81'

interface BoardElement {
  id: string
  board_id: string
  user_id?: string
  type:
    | 'sticky'
    | 'shape'
    | 'text'
    | 'image'
    | 'connector'
    | 'freehand'
    | 'group'
    | 'rectangle'
    | 'ellipse'
  x: number | string
  y: number | string
  width: number | string
  height: number | string
  rotation?: number | string
  z_index?: number
  content?: ElementContent
}

interface ElementContent {
  text?: string
  color?: string
  shape?: 'rectangle' | 'ellipse'
  /** Freehand strokes: [dx, dy] offsets from the element's x/y origin. */
  points?: number[][]
  [k: string]: unknown
}

interface BoardRow {
  id: string
  title: string
  description?: string
  background?: string
  is_public?: boolean
  public_slug?: string | null
}

interface CollaboratorRow {
  id: string
  board_id: string
  user_id: string | null
  email: string | null
  role: 'viewer' | 'commenter' | 'editor'
}

const COLLAB_PALETTE = ['#5b5bf7', '#00c4a8', '#a855f7', '#f97316', '#ec4899', '#84cc16', '#06b6d4']

function colorForId(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return COLLAB_PALETTE[h % COLLAB_PALETTE.length]!
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }
  return fallback
}

export function BoardCanvas() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const http = useHttpClient()
  const canvasRef = useRef<HTMLDivElement | null>(null)

  const [board, setBoard] = useState<BoardRow | null>(null)
  const [elements, setElements] = useState<BoardElement[]>([])
  const [collaborators, setCollaborators] = useState<CollaboratorRow[]>([])
  const [tool, setTool] = useState<ToolId>('select')
  const [stickyColor, setStickyColor] = useState<string>(STICKY_COLORS[0]!)
  const [zoom, setZoom] = useState(100)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [shareRole, setShareRole] = useState<'viewer' | 'commenter' | 'editor'>('viewer')
  const [shareStatus, setShareStatus] = useState<string | null>(null)
  const [snapshotStatus, setSnapshotStatus] = useState<string | null>(null)
  // Canvas-internal breakpoint (mobile panels/toggles) — the shared shell
  // hook, inverted; the nav-drawer chrome itself is owned by the shell.
  const isMobile = !useIsDesktop()

  // Freehand stroke drawing (pointer events — works for mouse, pen AND touch).
  // While a stroke is in flight its points render as a live polyline; on
  // pointerup the stroke commits as a `freehand` element via POST.
  const [strokeDraft, setStrokeDraft] = useState<number[][] | null>(null)
  const drawingRef = useRef<{ pointerId: number; points: number[][]; moved: boolean } | null>(null)
  // A completed drag suppresses the synthetic click that follows pointerup, so
  // finishing a stroke does not also trigger the click-to-place handler.
  const suppressClickRef = useRef(false)

  const refresh = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [boardRes, elemRes, collabRes] = await Promise.all([
        http.get<BoardRow>(`/api/boards/${id}`),
        http.get<BoardElement[]>(`/api/elements/${id}`),
        http.get<CollaboratorRow[]>(`/api/collaborators/${id}`),
      ])
      setBoard(boardRes.data ?? null)
      setElements(Array.isArray(elemRes.data) ? elemRes.data : [])
      setCollaborators(Array.isArray(collabRes.data) ? collabRes.data : [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [http, id])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Live collaboration — the API broadcasts element:created/updated/deleted (each
  // carrying the full element, or its id for delete) and board:updated/deleted to the
  // read-guarded `board:<id>` room (api/src/handlers/{elements,boards}.ts). Merge each
  // element event into the `elements` array BY ID — the exact shape of this page's own
  // optimistic updates — so a collaborator's change appears without a reload and this
  // client's OWN echo is an idempotent no-op. Room + event names MUST match the server.
  // The room is read-guarded, so the socket carries the auth token (see lib/realtime.ts).
  useEffect(() => {
    if (!id) return
    const room = `board:${id}`
    let active = true
    let connection: RealtimeConnection | null = null
    const toElement = (data: unknown): BoardElement | null =>
      typeof data === 'object' && data !== null && typeof (data as { id?: unknown }).id === 'string'
        ? (data as BoardElement)
        : null
    const onCreated = (data: unknown) => {
      const el = toElement(data)
      if (!el) return
      setElements((prev) => (prev.some((x) => x.id === el.id) ? prev : [...prev, el]))
    }
    const onUpdated = (data: unknown) => {
      const el = toElement(data)
      if (!el) return
      setElements((prev) =>
        prev.some((x) => x.id === el.id)
          ? prev.map((x) => (x.id === el.id ? el : x))
          : [...prev, el],
      )
    }
    const onDeleted = (data: unknown) => {
      const el = toElement(data)
      if (!el) return
      setElements((prev) => prev.filter((x) => x.id !== el.id))
    }
    const onBoard = () => {
      void refresh()
    }
    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        conn.on('element:created', onCreated)
        conn.on('element:updated', onUpdated)
        conn.on('element:deleted', onDeleted)
        conn.on('board:updated', onBoard)
        conn.on('board:deleted', onBoard)
        return conn.joinRoom(room)
      })
      .catch(() => {
        // Socket unavailable — the board still works from the initial fetch + local edits.
      })
    return () => {
      active = false
      if (connection) {
        connection.off('element:created', onCreated)
        connection.off('element:updated', onUpdated)
        connection.off('element:deleted', onDeleted)
        connection.off('board:updated', onBoard)
        connection.off('board:deleted', onBoard)
        connection.leaveRoom(room).catch(() => {})
      }
    }
  }, [id, refresh])

  const selected = useMemo(
    () => elements.find((e) => e.id === selectedId) ?? null,
    [elements, selectedId],
  )

  useEffect(() => {
    if (selected) {
      setEditingText(typeof selected.content?.text === 'string' ? selected.content.text : '')
    } else {
      setEditingText('')
    }
  }, [selected])

  useEffect(() => {
    if (!showShareModal) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowShareModal(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showShareModal])

  const toBoardPoint = useCallback(
    (clientX: number, clientY: number): number[] | null => {
      if (!canvasRef.current) return null
      const rect = canvasRef.current.getBoundingClientRect()
      const scale = zoom / 100
      return [(clientX - rect.left) / scale, (clientY - rect.top) / scale]
    },
    [zoom],
  )

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (tool !== 'draw' || !canvasRef.current) return
      // Pointer capture keeps move/up events on the surface even when the
      // finger leaves the element bounds mid-stroke.
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch (_error) {
        // capture unsupported (stale pointer) — strokes just end at the surface edge
      }
      const p = toBoardPoint(e.clientX, e.clientY)
      if (!p) return
      drawingRef.current = { pointerId: e.pointerId, points: [p], moved: false }
      setStrokeDraft([p])
    },
    [toBoardPoint, tool],
  )

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = drawingRef.current
      if (!d || e.pointerId !== d.pointerId) return
      if (!canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      const scale = zoom / 100
      const p = [(e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale]
      const last = d.points[d.points.length - 1]
      if (last && Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 2) return
      d.points.push(p)
      d.moved = true
      setStrokeDraft([...d.points])
    },
    [zoom],
  )

  const handleCanvasPointerUp = useCallback(
    async (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = drawingRef.current
      if (!d || e.pointerId !== d.pointerId) return
      drawingRef.current = null
      setStrokeDraft(null)
      // A tap (no movement) falls through to click handling — nothing to commit.
      if (!d.moved || d.points.length < 2) return
      suppressClickRef.current = true
      const xs = d.points.map((p) => p[0])
      const ys = d.points.map((p) => p[1])
      const x = Math.floor(Math.min(...xs))
      const y = Math.floor(Math.min(...ys))
      const width = Math.max(Math.ceil(Math.max(...xs)) - x, 4)
      const height = Math.max(Math.ceil(Math.max(...ys)) - y, 4)
      const points = d.points.map((p) => [Math.round(p[0] - x), Math.round(p[1] - y)])
      try {
        const res = await http.post<BoardElement>(`/api/elements/${id}`, {
          type: 'freehand',
          x,
          y,
          width,
          height,
          content: { points, color: STROKE_INK },
        })
        if (res.data?.id) {
          // The server broadcasts element:created BEFORE answering this POST,
          // so the socket echo may have added the element already — idempotent add.
          setElements((prev) =>
            prev.some((x) => x.id === res.data?.id) ? prev : [...prev, res.data],
          )
          track({
            name: 'stroke.drawn',
            properties: { board_id: id, element_id: res.data.id, points: points.length },
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [http, id],
  )

  const handleCanvasClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false
        return
      }
      if (!canvasRef.current) return
      if (tool === 'draw') {
        // Taps with the draw tool place nothing — strokes commit on drag.
        return
      }
      if (tool === 'select' || tool === 'eraser') {
        setSelectedId(null)
        return
      }
      const rect = canvasRef.current.getBoundingClientRect()
      const scale = zoom / 100
      // Keyboard activation (e.detail === 0) carries no pointer position — place at the visible center.
      const clientX = e.detail === 0 ? rect.left + rect.width / 2 : e.clientX
      const clientY = e.detail === 0 ? rect.top + rect.height / 2 : e.clientY
      const x = (clientX - rect.left) / scale
      const y = (clientY - rect.top) / scale
      const baseDefaults: Record<ToolId, Partial<BoardElement> & { content: ElementContent }> = {
        select: { type: 'sticky', content: {} },
        draw: { type: 'freehand', content: {} },
        eraser: { type: 'sticky', content: {} },
        sticky: {
          type: 'sticky',
          width: 200,
          height: 200,
          content: { text: 'Double-click to edit', color: stickyColor },
        },
        rectangle: {
          type: 'shape',
          width: 220,
          height: 140,
          content: { shape: 'rectangle', color: '#e0e7ff', text: '' },
        },
        ellipse: {
          type: 'shape',
          width: 200,
          height: 140,
          content: { shape: 'ellipse', color: '#fce7f3', text: '' },
        },
        text: {
          type: 'text',
          width: 240,
          height: 60,
          content: { text: 'Type text here', color: 'transparent' },
        },
      }
      const defaults = baseDefaults[tool]
      try {
        const res = await http.post<BoardElement>(`/api/elements/${id}`, {
          type: defaults.type,
          x: Math.round(x),
          y: Math.round(y),
          width: defaults.width ?? 200,
          height: defaults.height ?? 200,
          content: defaults.content,
        })
        if (res.data?.id) {
          // Idempotent add — the server's element:created echo may beat the
          // POST response back to the socket handler (broadcast precedes reply).
          setElements((prev) =>
            prev.some((x) => x.id === res.data?.id) ? prev : [...prev, res.data],
          )
          setSelectedId(res.data.id)
          setTool('select')
          track({
            name: 'element.created',
            properties: { board_id: id, element_id: res.data.id, type: defaults.type },
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [http, id, stickyColor, tool, zoom],
  )

  const handleElementClick = useCallback(
    async (el: BoardElement) => {
      if (tool === 'eraser') {
        try {
          await http.delete(`/api/elements/${id}/${el.id}`)
          setElements((prev) => prev.filter((x) => x.id !== el.id))
          if (selectedId === el.id) setSelectedId(null)
          track({
            name: 'element.deleted',
            properties: { board_id: id, element_id: el.id, via: 'eraser' },
          })
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err))
        }
        return
      }
      setSelectedId(el.id)
    },
    [http, id, selectedId, tool],
  )

  const handleSaveText = useCallback(async () => {
    if (!selected) return
    const nextContent: ElementContent = {
      ...(selected.content ?? {}),
      text: editingText,
    }
    try {
      const res = await http.put<BoardElement>(`/api/elements/${id}/${selected.id}`, {
        content: nextContent,
      })
      const updated = res.data
      if (updated) {
        setElements((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [editingText, http, id, selected])

  const handleChangeColor = useCallback(
    async (color: string) => {
      if (!selected) return
      const nextContent: ElementContent = { ...(selected.content ?? {}), color }
      try {
        const res = await http.put<BoardElement>(`/api/elements/${id}/${selected.id}`, {
          content: nextContent,
        })
        const updated = res.data
        if (updated) {
          setElements((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [http, id, selected],
  )

  const handleDelete = useCallback(async () => {
    if (!selected) return
    try {
      await http.delete(`/api/elements/${id}/${selected.id}`)
      setElements((prev) => prev.filter((x) => x.id !== selected.id))
      setSelectedId(null)
      track({
        name: 'element.deleted',
        properties: { board_id: id, element_id: selected.id, via: 'properties' },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [http, id, selected])

  const handleSaveSnapshot = useCallback(async () => {
    setSnapshotStatus(null)
    try {
      await http.post(`/api/versions/${id}`, {
        snapshot: { elements },
        change_summary: t(
          'boardCanvas.snapshotSummary',
          { count: elements.length },
          { defaultValue: 'Snapshot of {{count}} elements' },
        ),
      })
      setSnapshotStatus(t('boardCanvas.snapshotSaved', {}, { defaultValue: 'Snapshot saved' })!)
      track({
        name: 'snapshot.saved',
        properties: { board_id: id, elements: elements.length },
      })
    } catch (err) {
      setSnapshotStatus(err instanceof Error ? err.message : String(err))
    }
  }, [elements, http, id, t])

  const handleInvite = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setShareStatus(null)
      try {
        const res = await http.post<CollaboratorRow>(`/api/collaborators/${id}`, {
          email: shareEmail,
          role: shareRole,
          board_title: board?.title,
        })
        const created = res.data
        if (created?.id) {
          setCollaborators((prev) => [...prev, created])
          setShareEmail('')
          setShareStatus(
            t('boardCanvas.invited', { email: shareEmail }, { defaultValue: 'Invited {{email}}' })!,
          )
          track({
            name: 'board.shared',
            properties: { board_id: id, collaborator_id: created.id, role: shareRole },
          })
        }
      } catch (err) {
        setShareStatus(err instanceof Error ? err.message : String(err))
      }
    },
    [board?.title, http, id, shareEmail, shareRole, t],
  )

  const handleTogglePublic = useCallback(async () => {
    if (!board) return
    try {
      const res = await http.put<BoardRow>(`/api/boards/${id}`, {
        is_public: !board.is_public,
        public_slug: !board.is_public ? `b-${id.slice(0, 8)}` : null,
      })
      setBoard(res.data ?? board)
      track({
        name: 'board.visibility_changed',
        properties: { board_id: id, is_public: !board.is_public },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [board, http, id])

  const collaboratorAvatars = useMemo(
    () =>
      collaborators.map((c) => ({
        id: c.id,
        name: c.email ?? c.user_id ?? 'collaborator',
        avatarColor: colorForId(c.id),
        online: false,
      })),
    [collaborators],
  )

  return (
    <WhiteboardLayout variant="canvas">
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.h('screen'),
          'relative bg-[var(--color-canvas-bg)]',
        )}
      >
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            'px-3 sm:px-6',
            cm.sp('py', 3),
            'sticky top-0 z-30 bg-surface/85 backdrop-blur-xl border-b border-outline-variant/30 flex-wrap',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-nowrap min-w-0')}>
            <Link
              to="/boards"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'text-on-surface-variant hover:text-on-surface transition-colors shrink-0 min-h-[36px] min-w-[36px] justify-center',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_back</span>
              <span className="hidden sm:inline">
                {t('boardCanvas.backToBoards', {}, { defaultValue: 'All boards' })}
              </span>
            </Link>
            <span className={cm.cn(cm.h(6), 'w-px bg-outline-variant/40 hidden sm:block')}></span>
            <div className={cm.stack(0)}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant hidden sm:block',
                )}
              >
                {t('boardCanvas.eyebrow', {}, { defaultValue: 'Board · Live' })}
              </span>
              <h1
                data-mol-id="board-title"
                className={cm.cn(
                  cm.textSize('lg'),
                  'font-extrabold tracking-tight text-on-surface truncate max-w-[45vw] sm:max-w-none',
                )}
              >
                {board?.title ??
                  (loading
                    ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
                    : t('boardCanvas.untitled', {}, { defaultValue: 'Untitled board' }))}
              </h1>
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap justify-end')}>
            <CollaboratorStack collaborators={collaboratorAvatars} max={4} />
            <button
              type="button"
              data-mol-id="board-snapshot"
              onClick={handleSaveSnapshot}
              aria-label={t('boardCanvas.saveSnapshot', {}, { defaultValue: 'Save snapshot' })}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                'bg-surface-container border border-outline-variant/40 rounded-lg hover:bg-surface-container-high transition-colors min-h-[36px]',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')}>save</span>
              <span className="hidden md:inline">
                {t('boardCanvas.saveSnapshot', {}, { defaultValue: 'Save snapshot' })}
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/board/${id}/history`)}
              aria-label={t('nav.history', {}, { defaultValue: 'History' })}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                'bg-surface-container border border-outline-variant/40 rounded-lg hover:bg-surface-container-high transition-colors min-h-[36px]',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')}>history</span>
              <span className="hidden md:inline">
                {t('nav.history', {}, { defaultValue: 'History' })}
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/board/${id}/present`)}
              aria-label={t('boardCanvas.present', {}, { defaultValue: 'Present' })}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                'bg-surface-container border border-outline-variant/40 rounded-lg hover:bg-surface-container-high transition-colors min-h-[36px]',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')}>slideshow</span>
              <span className="hidden md:inline">
                {t('boardCanvas.present', {}, { defaultValue: 'Present' })}
              </span>
            </button>
            <button
              type="button"
              data-mol-id="board-share"
              onClick={() => setShowShareModal(true)}
              aria-label={t('common.share', {}, { defaultValue: 'Share' })}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'bg-gradient-to-br from-primary to-primary-hover text-white rounded-lg shadow-md shadow-primary/30 hover:scale-[1.02] transition-transform min-h-[36px]',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')}>ios_share</span>
              <span className="hidden sm:inline">
                {t('common.share', {}, { defaultValue: 'Share' })}
              </span>
            </button>
          </div>
        </header>

        {snapshotStatus && (
          <div
            role="status"
            data-mol-id="board-snapshot-status"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'bg-success-light text-success border-b border-emerald-200',
            )}
          >
            {snapshotStatus}
          </div>
        )}

        <div className={cm.cn(cm.flex({}), cm.flex1, 'relative', 'min-h-0')}>
          <div
            ref={canvasRef}
            data-mol-id="board-canvas-surface"
            className={cm.cn(cm.flex1, 'relative overflow-hidden')}
            style={{
              backgroundColor: board?.background ?? 'var(--color-canvas-bg)',
              backgroundImage: 'radial-gradient(circle, rgba(91,91,247,0.18) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              cursor: tool === 'eraser' ? 'cell' : tool === 'select' ? 'default' : 'crosshair',
              // Touch drawing: pointer drags must draw, not scroll the page.
              touchAction: 'none',
            }}
          >
            {/* Real button as the click/keyboard target for the empty surface: placing an
                element (or clearing the selection) is an action, and board elements render
                as siblings above it — so pointer placement, Enter/Space placement at the
                canvas center, and focus order all come for free without faking a widget
                role on the drawing surface. The draw tool draws through its pointer
                events; the synthetic click after a stroke is suppressed. */}
            <button
              type="button"
              data-mol-id="board-canvas-place"
              onClick={handleCanvasClick}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerCancel={() => {
                drawingRef.current = null
                setStrokeDraft(null)
              }}
              aria-label={
                tool === 'select' || tool === 'eraser'
                  ? t(
                      'boardCanvas.surface.clear',
                      {},
                      { defaultValue: 'Board canvas — clear selection' },
                    )
                  : tool === 'draw'
                    ? t(
                        'boardCanvas.surface.draw',
                        {},
                        { defaultValue: 'Board canvas — drag to draw' },
                      )
                    : t(
                        'boardCanvas.surface.place',
                        {},
                        { defaultValue: 'Board canvas — place element' },
                      )
              }
              className={cm.cn('absolute inset-0 h-full w-full')}
              style={{ cursor: 'inherit', touchAction: 'none' }}
            />

            {/* Live in-progress stroke (board coordinates, same space as elements). */}
            {strokeDraft && strokeDraft.length > 1 && (
              <svg aria-hidden className="absolute inset-0 h-full w-full pointer-events-none">
                <polyline
                  points={strokeDraft.map((p) => `${p[0]},${p[1]}`).join(' ')}
                  fill="none"
                  stroke={STROKE_INK}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.85}
                />
              </svg>
            )}
            {error && (
              <div
                role="alert"
                data-mol-id="board-canvas-error"
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'absolute top-4 left-1/2 -translate-x-1/2 rounded-xl bg-error-container/40 text-on-error-container shadow',
                )}
              >
                {error}
              </div>
            )}

            {!loading && elements.length === 0 && (
              <div
                data-mol-id="board-canvas-empty"
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'sm' }),
                  'absolute inset-0 pointer-events-none text-on-surface-variant px-8 text-center',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[48px] text-primary')}>
                  draw
                </span>
                <p className={cm.cn(cm.fontWeight('semibold'))}>
                  {t('boardCanvas.empty.title', {}, { defaultValue: 'This board is empty' })}
                </p>
                <p className={cm.cn(cm.textSize('sm'))}>
                  {t(
                    'boardCanvas.empty.body',
                    {},
                    {
                      defaultValue:
                        'Pick a tool from the toolbar below and click anywhere on the canvas to add an element.',
                    },
                  )}
                </p>
              </div>
            )}

            {elements.map((el) => {
              const x = num(el.x)
              const y = num(el.y)
              const w = num(el.width, 200)
              const h = num(el.height, 200)
              const color = (el.content?.color as string | undefined) ?? '#fef08a'
              const text = (el.content?.text as string | undefined) ?? ''
              const isShapeEllipse =
                el.type === 'shape' && (el.content?.shape as string | undefined) === 'ellipse'
              const isFreehand = el.type === 'freehand'
              const strokePoints = isFreehand ? (el.content?.points ?? []) : []
              const radius = isShapeEllipse ? '9999px' : el.type === 'sticky' ? '6px' : '12px'
              const isSelected = selectedId === el.id
              return (
                <div
                  key={el.id}
                  data-mol-id={`board-element-${el.id}`}
                  data-mol-element-type={el.type}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={
                    text ||
                    t(
                      'boardCanvas.elementLabel',
                      { type: el.type },
                      { defaultValue: '{{type}} element' },
                    )
                  }
                  onClick={() => handleElementClick(el)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      void handleElementClick(el)
                    }
                  }}
                  style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    width: w,
                    height: h,
                    backgroundColor: isFreehand || color === 'transparent' ? undefined : color,
                    borderRadius: radius,
                    boxShadow:
                      el.type === 'text' || isFreehand ? 'none' : '2px 3px 8px rgba(0,0,0,0.1)',
                    border: isSelected ? '2px solid var(--color-primary)' : 'none',
                    padding: el.type === 'text' || isFreehand ? 0 : 12,
                    cursor: tool === 'eraser' ? 'cell' : 'pointer',
                  }}
                >
                  {isFreehand ? (
                    <svg
                      aria-hidden
                      width={Math.max(w, 1)}
                      height={Math.max(h, 1)}
                      className="pointer-events-none overflow-visible"
                    >
                      <polyline
                        points={strokePoints.map((p) => `${num(p[0])},${num(p[1])}`).join(' ')}
                        fill="none"
                        stroke={color === 'transparent' ? STROKE_INK : color}
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <p
                      className={cm.cn(
                        el.type === 'text'
                          ? cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))
                          : cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')),
                        'text-[var(--color-text)] whitespace-pre-wrap break-words',
                      )}
                    >
                      {text || '\u00A0'}
                    </p>
                  )}
                </div>
              )
            })}

            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('p', 1),
                'absolute bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 max-w-[calc(100vw-16px)] flex-wrap justify-center gap-y-1 bg-surface/95 backdrop-blur-md rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.12)]',
              )}
            >
              {TOOLS.map((toolDef) => (
                <button
                  key={toolDef.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setTool(toolDef.id)
                  }}
                  data-mol-id={`board-tool-${toolDef.id}`}
                  aria-pressed={tool === toolDef.id}
                  aria-label={t(
                    `boardCanvas.tool.${toolDef.id}`,
                    {},
                    { defaultValue: toolDef.label },
                  )}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-11 w-11 rounded-lg transition-colors',
                    tool === toolDef.id
                      ? 'bg-primary text-white shadow-md'
                      : 'text-on-surface hover:bg-surface-container-high',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-[20px]')}>
                    {toolDef.icon}
                  </span>
                </button>
              ))}
              <span className={cm.cn(cm.h(8), 'w-px bg-outline-variant/40 mx-1 sm:mx-2')}></span>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.sp('px', 1))}>
                {STICKY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    data-mol-id={`board-sticky-color-${c}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setStickyColor(c)
                    }}
                    aria-label={t(
                      'boardCanvas.stickyColor',
                      { color: c },
                      { defaultValue: 'Pick sticky color' },
                    )}
                    aria-pressed={stickyColor === c}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-11 w-9 rounded transition-transform hover:scale-110',
                    )}
                  >
                    <span
                      className="h-6 w-6 rounded"
                      style={{
                        backgroundColor: c,
                        border:
                          stickyColor === c
                            ? '2px solid var(--color-text)'
                            : '1px solid rgba(0,0,0,0.1)',
                      }}
                    ></span>
                  </button>
                ))}
              </div>
            </div>

            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('p', 1),
                'absolute bottom-3 left-3 sm:bottom-6 sm:left-6 bg-surface/95 backdrop-blur-md rounded-lg shadow-md',
              )}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setZoom((z) => Math.max(10, z - 10))
                }}
                aria-label={t('boardCanvas.zoomOut', {}, { defaultValue: 'Zoom out' })}
                className={cm.cn(
                  'h-10 w-10',
                  cm.flex({ align: 'center', justify: 'center' }),
                  'rounded hover:bg-surface-container-high',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>remove</span>
              </button>
              <span
                data-mol-id="board-zoom"
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'min-w-[44px] text-center',
                )}
              >
                {zoom}%
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setZoom((z) => Math.min(800, z + 10))
                }}
                aria-label={t('boardCanvas.zoomIn', {}, { defaultValue: 'Zoom in' })}
                className={cm.cn(
                  'h-10 w-10',
                  cm.flex({ align: 'center', justify: 'center' }),
                  'rounded hover:bg-surface-container-high',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>add</span>
              </button>
            </div>

            <div
              data-mol-id="board-element-count"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'absolute bottom-3 right-3 sm:bottom-6 sm:right-6 bg-surface/95 backdrop-blur-md rounded-lg shadow-md text-on-surface-variant',
              )}
            >
              {t(
                'boardCanvas.elementsCount',
                { count: elements.length },
                { defaultValue: '{{count}} elements' },
              )}
            </div>
          </div>

          {selected ? (
            <aside
              data-mol-id="board-properties"
              className={cm.cn(
                cm.flex({ direction: 'col' }),
                cm.sp('p', 5),
                cm.stack(5),
                isMobile
                  ? 'fixed inset-y-0 right-0 z-40 w-[88vw] max-w-[340px] bg-surface border-l border-outline-variant/30 shadow-2xl overflow-y-auto'
                  : 'w-[320px] bg-surface border-l border-outline-variant/30 overflow-y-auto',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('boardCanvas.properties', {}, { defaultValue: 'Properties' })}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className={cm.cn(
                    cm.w(6),
                    cm.h(6),
                    cm.flex({ align: 'center', justify: 'center' }),
                    'rounded hover:bg-surface-container-low',
                  )}
                  aria-label={t('boardCanvas.deselect', {}, { defaultValue: 'Deselect' })}
                >
                  <span className={cm.cn('material-symbols-outlined text-[16px]')}>close</span>
                </button>
              </div>

              <label className={cm.cn(cm.stack(2))}>
                <span
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('xs'),
                    'text-on-surface-variant',
                  )}
                >
                  {t('boardCanvas.elementText', {}, { defaultValue: 'Text' })}
                </span>
                <textarea
                  data-mol-id="board-element-text"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  rows={4}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'w-full rounded-lg border border-outline-variant/40 bg-surface-container-low focus:bg-surface focus:ring-2 focus:ring-primary/30 outline-none',
                  )}
                />
              </label>
              <button
                type="button"
                data-mol-id="board-element-text-save"
                onClick={handleSaveText}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-lg bg-primary text-white hover:opacity-90',
                )}
              >
                {t('boardCanvas.saveText', {}, { defaultValue: 'Save text' })}
              </button>

              <div className={cm.stack(2)}>
                <span
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('xs'),
                    'text-on-surface-variant',
                  )}
                >
                  {t('boardCanvas.fillColor', {}, { defaultValue: 'Fill' })}
                </span>
                <div className={cm.cn(cm.grid({ cols: 6, gap: 'sm' }))}>
                  {STICKY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      data-mol-id={`board-element-color-${c}`}
                      onClick={() => handleChangeColor(c)}
                      aria-label={t(
                        'boardCanvas.changeColor',
                        { color: c },
                        { defaultValue: 'Change color {{color}}' },
                      )}
                      className={cm.cn(
                        cm.w(8),
                        cm.h(8),
                        cm.roundedFull,
                        'border-2 transition-transform hover:scale-110',
                      )}
                      style={{
                        backgroundColor: c,
                        borderColor:
                          selected.content?.color === c ? 'var(--color-primary)' : 'transparent',
                      }}
                    ></button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                data-mol-id="board-element-delete"
                onClick={handleDelete}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  'rounded-lg bg-error-container/40 text-on-error-container hover:bg-error-container/60',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[16px]')}>delete</span>
                {t('boardCanvas.deleteElement', {}, { defaultValue: 'Delete element' })}
              </button>

              <div
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.stack(1),
                  cm.textSize('xs'),
                  'rounded-lg bg-surface-container-low text-on-surface-variant',
                )}
              >
                <span
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    'uppercase tracking-widest text-[10px]',
                  )}
                >
                  {t('boardCanvas.metaTitle', {}, { defaultValue: 'Position' })}
                </span>
                <span>
                  {t(
                    'boardCanvas.metaXY',
                    { x: Math.round(num(selected.x)), y: Math.round(num(selected.y)) },
                    { defaultValue: 'X: {{x}}  Y: {{y}}' },
                  )}
                </span>
                <span>
                  {t(
                    'boardCanvas.metaWH',
                    { w: Math.round(num(selected.width)), h: Math.round(num(selected.height)) },
                    { defaultValue: 'W: {{w}}  H: {{h}}' },
                  )}
                </span>
              </div>
            </aside>
          ) : (
            !isMobile && (
              <aside
                data-mol-id="board-side-info"
                className={cm.cn(
                  cm.flex({ direction: 'col' }),
                  cm.sp('p', 5),
                  cm.stack(4),
                  'w-[280px] bg-surface border-l border-outline-variant/30 overflow-y-auto',
                )}
              >
                <div className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('boardCanvas.summaryTitle', {}, { defaultValue: 'Board' })}
                  </span>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-on-surface',
                    )}
                  >
                    {board?.title ?? '—'}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'boardCanvas.summaryCount',
                      { count: elements.length },
                      { defaultValue: '{{count}} elements on the canvas' },
                    )}
                  </p>
                </div>

                <div className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('boardCanvas.collaboratorsTitle', {}, { defaultValue: 'Collaborators' })}
                  </span>
                  {collaborators.length === 0 ? (
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'boardCanvas.noCollaborators',
                        {},
                        { defaultValue: 'No collaborators yet. Use Share to invite teammates.' },
                      )}
                    </p>
                  ) : (
                    <ul className={cm.stack(1)}>
                      {collaborators.map((c) => (
                        <li
                          key={c.id}
                          data-mol-id={`board-collaborator-${c.id}`}
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'between' }),
                            cm.sp('px', 2),
                            cm.sp('py', 1),
                            cm.textSize('xs'),
                            'rounded bg-surface-container-low',
                          )}
                        >
                          <span className={cm.cn('truncate')}>
                            {c.email ?? c.user_id ?? 'unknown'}
                          </span>
                          <span
                            className={cm.cn(
                              cm.fontWeight('bold'),
                              'uppercase tracking-widest text-[10px] text-primary',
                            )}
                          >
                            {c.role}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('boardCanvas.visibilityTitle', {}, { defaultValue: 'Visibility' })}
                  </span>
                  <button
                    type="button"
                    data-mol-id="board-toggle-public"
                    onClick={handleTogglePublic}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.fontWeight('semibold'),
                      cm.textSize('xs'),
                      'rounded-lg bg-surface-container-low hover:bg-surface-container',
                    )}
                  >
                    <span>
                      {board?.is_public
                        ? t(
                            'boardCanvas.public',
                            {},
                            { defaultValue: 'Public — anyone with link can view' },
                          )
                        : t('boardCanvas.private', {}, { defaultValue: 'Private — invite only' })}
                    </span>
                    <span className={cm.cn('material-symbols-outlined text-[16px]')}>
                      {board?.is_public ? 'visibility' : 'lock'}
                    </span>
                  </button>
                </div>
              </aside>
            )
          )}
        </div>

        {showShareModal && (
          <div
            role="presentation"
            data-mol-id="board-share-modal"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm',
            )}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowShareModal(false)
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="board-share-title"
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(4),
                'w-full max-w-md bg-surface rounded-2xl shadow-2xl',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <h2
                  id="board-share-title"
                  className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}
                >
                  {t('boardCanvas.shareTitle', {}, { defaultValue: 'Share this board' })}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  aria-label={t('common.close', {}, { defaultValue: 'Close' })}
                  className={cm.cn(
                    cm.w(8),
                    cm.h(8),
                    cm.flex({ align: 'center', justify: 'center' }),
                    'rounded hover:bg-surface-container-low',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined')}>close</span>
                </button>
              </div>
              <form onSubmit={handleInvite} className={cm.stack(3)}>
                <label className={cm.stack(1)}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('boardCanvas.shareEmail', {}, { defaultValue: 'Collaborator email' })}
                  </span>
                  <input
                    type="email"
                    required
                    data-mol-id="board-share-email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="teammate@example.com"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'rounded-xl border border-outline-variant/40 bg-surface-container-low focus:bg-surface focus:ring-2 focus:ring-primary/30 outline-none',
                    )}
                  />
                </label>
                <label className={cm.stack(1)}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('boardCanvas.shareRole', {}, { defaultValue: 'Permission' })}
                  </span>
                  <select
                    data-mol-id="board-share-role"
                    value={shareRole}
                    onChange={(e) =>
                      setShareRole(e.target.value as 'viewer' | 'commenter' | 'editor')
                    }
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'rounded-xl border border-outline-variant/40 bg-surface-container-low focus:bg-surface focus:ring-2 focus:ring-primary/30 outline-none',
                    )}
                  >
                    <option value="viewer">
                      {t('boardCanvas.roleViewer', {}, { defaultValue: 'Can view' })}
                    </option>
                    <option value="commenter">
                      {t('boardCanvas.roleCommenter', {}, { defaultValue: 'Can comment' })}
                    </option>
                    <option value="editor">
                      {t('boardCanvas.roleEditor', {}, { defaultValue: 'Can edit' })}
                    </option>
                  </select>
                </label>
                {shareStatus && (
                  <p
                    data-mol-id="board-share-status"
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-success')}
                  >
                    {shareStatus}
                  </p>
                )}
                <button
                  type="submit"
                  data-mol-id="board-share-submit"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                    'bg-gradient-to-br from-primary to-primary-hover text-white rounded-xl shadow-md',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-[16px]')}>person_add</span>
                  {t('nav.invite', {}, { defaultValue: 'Send invite' })}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </WhiteboardLayout>
  )
}

export default BoardCanvas
