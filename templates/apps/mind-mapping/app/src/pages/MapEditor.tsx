import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import {
  buildMarkdown,
  downloadBlob,
  type ExportFormat,
  serializeSvg,
  slugifyFilename,
  svgToPngBlob,
} from '../lib/export.js'
import { getRealtimeConnection } from '../lib/realtime.js'

interface MindMapNode {
  id: string
  map_id: string
  parent_id: string | null
  text: string
  color: string
  shape: string
  size: string
  x: number
  y: number
  position: number
}

interface MindMapConnection {
  id: string
  map_id: string
  source_node_id: string
  target_node_id: string
  label: string | null
  style: Record<string, unknown>
}

interface MindMapDetail {
  id: string
  owner_id: string
  title: string
  description: string | null
  is_public: boolean
  public_slug: string | null
  updated_at: string
  nodes: MindMapNode[]
  connections: MindMapConnection[]
}

// Hex values ensure aria-labels are stable, predictable strings for tests
// and accessibility tools. #10b981 (emerald) is included so the spec can
// reliably pick a non-default colour by name.
const NODE_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#f97316', // orange
  '#06b6d4', // cyan
  '#10b981', // emerald (also used as the spec's test colour)
  '#ef4444', // red
  '#6b7280', // gray
]

type Tool = 'select' | 'add' | 'connect'

const NODE_W = 140
const NODE_H = 56

// Canvas zoom bounds — mirrors family-tree's proven canvas controls.
const MIN_ZOOM = 0.4
const MAX_ZOOM = 2.4

// The SVG viewBox the world lives in; pan positions the world inside it.
const VIEW_W = 720
const VIEW_H = 480

const toNumber = (v: unknown, fallback: number): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : fallback
}

export function MapEditor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [map, setMap] = useState<MindMapDetail | null>(null)
  const [nodes, setNodes] = useState<MindMapNode[]>([])
  const [connections, setConnections] = useState<MindMapConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const [savingTitle, setSavingTitle] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [editingText, setEditingText] = useState<string>('')
  // Export menu state: `canExport` is fetched lazily on first open
  // (GET /billing/status → limits.canExport; free=false, pro/team=true).
  const [exportOpen, setExportOpen] = useState(false)
  const [exportBusy, setExportBusy] = useState<ExportFormat | null>(null)
  const [canExport, setCanExport] = useState<boolean | null>(null)
  const dragRef = useRef<{ nodeId: string; offsetX: number; offsetY: number } | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  // Canvas pan + zoom (family-tree's proven canvas approach): the world lives
  // inside a translated/scaled <g>, so a 720x480 world stays explorable on a
  // 390px phone instead of shrinking to fit. Background drags pan; the toolbar
  // zooms; the root node is centered once after load so the canvas never opens
  // on an empty corner.
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const panDragRef = useRef<{
    startX: number
    startY: number
    baseX: number
    baseY: number
    moved: boolean
  } | null>(null)
  const suppressClickRef = useRef(false)
  const didCenterRef = useRef(false)
  // Mirror into a ref for the center-on-load effect's dependencies.
  const centeredForMapRef = useRef<string | null>(null)
  // Mirror the selected node id into a ref so the realtime merge (below) can read
  // the current selection WITHOUT re-subscribing to the room on every selection.
  const selectedNodeIdRef = useRef<string | null>(null)
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId
  }, [selectedNodeId])

  const refreshMap = useCallback(async () => {
    if (!id) return
    try {
      const res = await http.get<MindMapDetail>(`/maps/${id}`)
      const data = res?.data
      if (!data) return
      const normalisedNodes = (data.nodes ?? []).map((n) => ({
        ...n,
        x: toNumber(n.x, 0),
        y: toNumber(n.y, 0),
      }))
      setMap(data)
      setNodes(normalisedNodes)
      setConnections(data.connections ?? [])
      setTitleDraft(data.title ?? '')
      setError(null)
    } catch (error) {
      logError('mapEditor.load', error)
      setError(t('mapEditor.loadError', {}, { defaultValue: 'Could not load this map.' }))
    }
  }, [http, id, t])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    refreshMap().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [id, refreshMap])

  // Live collaboration: merge peer edits from the `map:<id>` room into local
  // state BY ID, mirroring this page's own optimistic setNodes/setConnections
  // updates — so the client's OWN echoed events are idempotent no-ops. A remote
  // `node:updated` for a node the local user is actively dragging OR has selected
  // is SKIPPED: its position/text is a local in-progress edit (the drag ref and
  // the `editingText` draft both key off that node), and it re-syncs on the next
  // refresh or when the user moves on. Server: api/src/handlers/{nodes,connections}.ts;
  // room-auth contract: lib/realtime.ts.
  useEffect(() => {
    if (!id) return
    const room = `map:${id}`
    let active = true
    let connection: RealtimeConnection | null = null

    const toNode = (data: unknown): MindMapNode | null =>
      typeof data === 'object' && data !== null && typeof (data as { id?: unknown }).id === 'string'
        ? {
            ...(data as MindMapNode),
            x: toNumber((data as MindMapNode).x, 0),
            y: toNumber((data as MindMapNode).y, 0),
          }
        : null
    const toConnection = (data: unknown): MindMapConnection | null =>
      typeof data === 'object' && data !== null && typeof (data as { id?: unknown }).id === 'string'
        ? (data as MindMapConnection)
        : null
    const idOf = (data: unknown): string | null =>
      typeof data === 'object' && data !== null && typeof (data as { id?: unknown }).id === 'string'
        ? (data as { id: string }).id
        : null

    const onNodeCreated = (data: unknown) => {
      const node = toNode(data)
      if (!node) return
      setNodes((prev) => (prev.some((n) => n.id === node.id) ? prev : [...prev, node]))
    }
    const onNodeUpdated = (data: unknown) => {
      const node = toNode(data)
      if (!node) return
      // Don't clobber a node the local user is mid-editing (dragging or selected).
      if (dragRef.current?.nodeId === node.id || selectedNodeIdRef.current === node.id) return
      setNodes((prev) =>
        prev.some((n) => n.id === node.id)
          ? prev.map((n) => (n.id === node.id ? node : n))
          : [...prev, node],
      )
    }
    const onNodeDeleted = (data: unknown) => {
      const nodeId = idOf(data)
      if (!nodeId) return
      // Mirror handleDeleteNode: drop the node, its children link, and any
      // connection that referenced it (the server may not echo those).
      setNodes((prev) => prev.filter((n) => n.id !== nodeId && n.parent_id !== nodeId))
      setConnections((prev) =>
        prev.filter((c) => c.source_node_id !== nodeId && c.target_node_id !== nodeId),
      )
      setSelectedNodeId((cur) => (cur === nodeId ? null : cur))
    }
    const onConnectionCreated = (data: unknown) => {
      const conn = toConnection(data)
      if (!conn) return
      setConnections((prev) => (prev.some((c) => c.id === conn.id) ? prev : [...prev, conn]))
    }
    const onConnectionUpdated = (data: unknown) => {
      const conn = toConnection(data)
      if (!conn) return
      setConnections((prev) =>
        prev.some((c) => c.id === conn.id)
          ? prev.map((c) => (c.id === conn.id ? conn : c))
          : [...prev, conn],
      )
    }
    const onConnectionDeleted = (data: unknown) => {
      const connId = idOf(data)
      if (!connId) return
      setConnections((prev) => prev.filter((c) => c.id !== connId))
    }

    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        conn.on('node:created', onNodeCreated)
        conn.on('node:updated', onNodeUpdated)
        conn.on('node:deleted', onNodeDeleted)
        conn.on('connection:created', onConnectionCreated)
        conn.on('connection:updated', onConnectionUpdated)
        conn.on('connection:deleted', onConnectionDeleted)
        return conn.joinRoom(room)
      })
      .catch(() => {
        // Realtime is best-effort; the initial fetch already populated state.
      })

    return () => {
      active = false
      if (connection) {
        connection.off('node:created', onNodeCreated)
        connection.off('node:updated', onNodeUpdated)
        connection.off('node:deleted', onNodeDeleted)
        connection.off('connection:created', onConnectionCreated)
        connection.off('connection:updated', onConnectionUpdated)
        connection.off('connection:deleted', onConnectionDeleted)
        connection.leaveRoom(room).catch(() => {})
      }
    }
  }, [id])

  const selected = nodes.find((n) => n.id === selectedNodeId) || null

  // New map → fresh viewport.
  useEffect(() => {
    didCenterRef.current = false
    centeredForMapRef.current = null
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [id])

  // Center the ROOT node once the first load lands: without this the canvas
  // opens on the world's top-left corner — on a phone that can be a single
  // node pinned at the edge with no hint the rest is out there.
  useEffect(() => {
    if (loading || nodes.length === 0) return
    if (didCenterRef.current && centeredForMapRef.current === id) return
    const root = nodes.find((n) => !n.parent_id) ?? nodes[0]
    setPan({
      x: VIEW_W / 2 - (root.x + NODE_W / 2),
      y: VIEW_H / 2 - (root.y + NODE_H / 2),
    })
    didCenterRef.current = true
    centeredForMapRef.current = id ?? null
  }, [loading, nodes, id])

  const zoomBy = (delta: number) => {
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((z + delta) * 10) / 10)))
  }

  useEffect(() => {
    setEditingText(selected?.text ?? '')
  }, [selectedNodeId, selected?.text])

  const handleSaveTitle = async () => {
    if (!map || !id || titleDraft.trim() === map.title) return
    setSavingTitle(true)
    try {
      await http.patch(`/maps/${id}`, { title: titleDraft.trim() || 'Untitled mind map' })
      await refreshMap()
    } catch (error) {
      logError('mapEditor.saveTitle', error)
      setError(t('mapEditor.saveTitleError', {}, { defaultValue: 'Could not save the title.' }))
    } finally {
      setSavingTitle(false)
    }
  }

  const handleAddNode = async (atX: number, atY: number, parentId: string | null = null) => {
    if (!id) return
    try {
      const res = await http.post<MindMapNode>('/nodes', {
        map_id: id,
        parent_id: parentId,
        text: t('mapEditor.newNodeText', {}, { defaultValue: 'New idea' }),
        color: NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)],
        x: atX,
        y: atY,
        position: nodes.length,
      })
      if (res?.data) {
        // Merge BY ID: the server broadcasts `node:created` to the whole room
        // INCLUDING this client, and the socket echo can beat the HTTP response
        // back — onNodeCreated may have appended the node already. Appending
        // unconditionally duplicated it (duplicate React keys, node rendered
        // twice), so replace-or-append exactly like the realtime merge does.
        const node: MindMapNode = {
          ...res.data,
          x: toNumber(res.data.x, atX),
          y: toNumber(res.data.y, atY),
        }
        setNodes((prev) =>
          prev.some((n) => n.id === node.id)
            ? prev.map((n) => (n.id === node.id ? node : n))
            : [...prev, node],
        )
        setSelectedNodeId(node.id)
        void track({
          name: 'node.added',
          properties: {
            map_id: id,
            node_id: node.id,
            parent_id: parentId,
            method: parentId ? 'add_child' : 'canvas_click',
          },
        })
      }
    } catch (error) {
      logError('mapEditor.addNode', error)
      setError(t('mapEditor.addNodeError', {}, { defaultValue: 'Could not create the node.' }))
    }
  }

  const handleDeleteNode = async (nodeId: string) => {
    try {
      await http.delete(`/nodes/${nodeId}`)
      void track({ name: 'node.deleted', properties: { map_id: id, node_id: nodeId } })
      setNodes((prev) => prev.filter((n) => n.id !== nodeId && n.parent_id !== nodeId))
      setConnections((prev) =>
        prev.filter((c) => c.source_node_id !== nodeId && c.target_node_id !== nodeId),
      )
      if (selectedNodeId === nodeId) setSelectedNodeId(null)
    } catch (error) {
      logError('mapEditor.deleteNode', error)
      setError(t('mapEditor.deleteNodeError', {}, { defaultValue: 'Could not delete the node.' }))
    }
  }

  const handleColorChange = async (nodeId: string, color: string) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, color } : n)))
    try {
      await http.patch(`/nodes/${nodeId}`, { color })
    } catch (error) {
      logError('mapEditor.colorChange', error)
      setError(t('mapEditor.updateNodeError', {}, { defaultValue: 'Could not update the node.' }))
    }
  }

  const handleSaveText = async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return
    if (editingText.trim() === node.text) return
    try {
      await http.patch(`/nodes/${nodeId}`, { text: editingText.trim() })
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, text: editingText.trim() } : n)),
      )
    } catch (error) {
      logError('mapEditor.saveText', error)
      setError(t('mapEditor.updateNodeError', {}, { defaultValue: 'Could not update the node.' }))
    }
  }

  const handleConnect = async (sourceId: string, targetId: string) => {
    if (!id || sourceId === targetId) return
    if (connections.some((c) => c.source_node_id === sourceId && c.target_node_id === targetId)) {
      return
    }
    try {
      const res = await http.post<MindMapConnection>('/connections', {
        map_id: id,
        source_node_id: sourceId,
        target_node_id: targetId,
      })
      if (res?.data) {
        // Same by-id merge as handleAddNode — the creator's own
        // `connection:created` room echo can arrive before this HTTP response.
        setConnections((prev) =>
          prev.some((c) => c.id === res.data!.id)
            ? prev.map((c) => (c.id === res.data!.id ? res.data! : c))
            : [...prev, res.data!],
        )
        void track({
          name: 'node.connected',
          properties: {
            map_id: id,
            connection_id: res.data.id,
            source_node_id: sourceId,
            target_node_id: targetId,
          },
        })
      }
    } catch (error) {
      logError('mapEditor.connect', error)
      setError(
        t('mapEditor.connectError', {}, { defaultValue: 'Could not create the connection.' }),
      )
    }
  }

  // Save the current canvas as a reusable template (POST /templates) —
  // this is the "save as template" entry point the Templates library
  // references; user templates land under the "My templates" tab.
  const handleSaveAsTemplate = async () => {
    if (!map || savingTemplate) return
    setSavingTemplate(true)
    try {
      const res = await http.post<{ id: string }>('/templates', {
        name: map.title || t('map.untitled', {}, { defaultValue: 'Untitled mind map' }),
        description: map.description ?? '',
        snapshot: { nodes, connections },
      })
      const newId = res?.data?.id
      if (newId) {
        void track({
          name: 'template.created',
          properties: { template_id: newId, map_id: map.id },
        })
        navigate(`/templates/${newId}`)
      }
    } catch (error) {
      logError('mapEditor.saveTemplate', error)
      setError(
        t('mapEditor.saveTemplateError', {}, { defaultValue: 'Could not save as template.' }),
      )
    } finally {
      setSavingTemplate(false)
    }
  }

  // Export the canvas — tier-gated client-side via /billing/status
  // (limits.canExport). Markdown = indented outline; SVG/PNG = the current
  // canvas view, theme vars baked in (lib/export.ts).
  const ensureExportEntitlement = useCallback(async (): Promise<boolean | null> => {
    if (canExport !== null) return canExport
    try {
      const res = await http.get<{ limits?: { canExport?: boolean } }>('/billing/status')
      const allowed = res?.data?.limits?.canExport === true
      setCanExport(allowed)
      return allowed
    } catch (error) {
      // Status endpoint unavailable (e.g. billing not wired) — don't block the
      // menu, the individual exports fail with inline errors if they fail.
      logError('mapEditor.exportStatus', error)
      return null
    }
  }, [canExport, http])

  const handleExport = async (format: ExportFormat) => {
    if (!map || exportBusy) return
    setExportBusy(format)
    try {
      const filename = slugifyFilename(map.title)
      if (format === 'markdown') {
        downloadBlob(
          new Blob([buildMarkdown(map.title, nodes)], { type: 'text/markdown;charset=utf-8' }),
          `${filename}.md`,
        )
      } else {
        const svg = svgRef.current
        const svgString = svg ? serializeSvg(svg) : null
        if (!svgString) {
          setError(t('mapEditor.exportError', {}, { defaultValue: 'Could not export the map.' }))
          return
        }
        if (format === 'svg') {
          downloadBlob(
            new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }),
            `${filename}.svg`,
          )
        } else {
          const viewBox = (svg?.getAttribute('viewBox') ?? '0 0 720 480')
            .split(/[\s,]+/)
            .map(Number)
          const w = Number.isFinite(viewBox[2]) ? viewBox[2] : 720
          const h = Number.isFinite(viewBox[3]) ? viewBox[3] : 480
          const blob = await svgToPngBlob(svgString, w, h)
          downloadBlob(blob, `${filename}.png`)
        }
      }
      track({
        name: 'map.exported',
        properties: { map_id: map.id, format, node_count: nodes.length },
      })
      setExportOpen(false)
    } catch (error) {
      logError('mapEditor.export', error)
      setError(t('mapEditor.exportError', {}, { defaultValue: 'Could not export the map.' }))
    } finally {
      setExportBusy(null)
    }
  }

  const screenToSvg = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current
    if (!svg) return null
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const transformed = point.matrixTransform(ctm.inverse())
    return { x: transformed.x, y: transformed.y }
  }

  // viewBox coords → world coords (the pan/zoom <g> transform inverted).
  const svgToWorld = (pt: { x: number; y: number }) => ({
    x: (pt.x - pan.x) / zoom,
    y: (pt.y - pan.y) / zoom,
  })

  const handleNodePointerDown = (e: React.PointerEvent<SVGGElement>, node: MindMapNode) => {
    if (tool === 'add') return
    suppressClickRef.current = true
    if (tool === 'connect') {
      if (!connectFrom) {
        setConnectFrom(node.id)
      } else if (connectFrom !== node.id) {
        void handleConnect(connectFrom, node.id)
        setConnectFrom(null)
      } else {
        setConnectFrom(null)
      }
      setSelectedNodeId(node.id)
      return
    }
    setSelectedNodeId(node.id)
    const pt = screenToSvg(e.clientX, e.clientY)
    if (!pt) return
    // Capture the grab offset in WORLD coords — pt is viewBox coords and the
    // pan/zoom transform sits between the two.
    const world = svgToWorld(pt)
    dragRef.current = { nodeId: node.id, offsetX: world.x - node.x, offsetY: world.y - node.y }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  const handleNodePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const pt = screenToSvg(e.clientX, e.clientY)
    if (!pt) return
    const world = svgToWorld(pt)
    setNodes((prev) =>
      prev.map((n) =>
        n.id === drag.nodeId ? { ...n, x: world.x - drag.offsetX, y: world.y - drag.offsetY } : n,
      ),
    )
  }

  const handleNodePointerUp = async (e: React.PointerEvent<SVGGElement>) => {
    const drag = dragRef.current
    dragRef.current = null
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    if (!drag || !id) return
    const node = nodes.find((n) => n.id === drag.nodeId)
    if (!node) return
    try {
      await http.patch(`/nodes/${drag.nodeId}`, { x: Math.round(node.x), y: Math.round(node.y) })
    } catch (error) {
      logError('mapEditor.savePosition', error)
      setError(
        t('mapEditor.updateNodeError', {}, { defaultValue: 'Could not save node position.' }),
      )
    }
  }

  // Background pan: dragging the canvas (select tool, not on a node) moves the
  // world. Mirrors family-tree's pointer-drag pan, expressed in viewBox coords
  // so the viewBox↔screen scaling cancels out.
  const handleCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (tool !== 'select') return
    if ((e.target as Element).closest?.('[data-mol-id="map-editor-node"]')) return
    const pt = screenToSvg(e.clientX, e.clientY)
    if (!pt) return
    panDragRef.current = { startX: pt.x, startY: pt.y, baseX: pan.x, baseY: pan.y, moved: false }
  }

  const handleCanvasPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = panDragRef.current
    if (!d) return
    const pt = screenToSvg(e.clientX, e.clientY)
    if (!pt) return
    const dx = pt.x - d.startX
    const dy = pt.y - d.startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true
    setPan({ x: d.baseX + dx, y: d.baseY + dy })
  }

  const handleCanvasPointerUp = () => {
    if (panDragRef.current) suppressClickRef.current = panDragRef.current.moved
    panDragRef.current = null
  }

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    const pt = screenToSvg(e.clientX, e.clientY)
    if (!pt) return
    if (tool === 'add') {
      const world = svgToWorld(pt)
      void handleAddNode(Math.round(world.x - NODE_W / 2), Math.round(world.y - NODE_H / 2))
      return
    }
    // Select tool: clicking empty canvas clears the selection.
    if (tool === 'select') setSelectedNodeId(null)
  }

  const tools: Array<{ key: Tool; icon: string; label: string }> = [
    {
      key: 'select',
      icon: 'pan_tool',
      label: t('mapEditor.tool.select', {}, { defaultValue: 'Select / move' }),
    },
    {
      key: 'add',
      icon: 'add_circle',
      label: t('mapEditor.tool.addNode', {}, { defaultValue: 'Add node' }),
    },
    {
      key: 'connect',
      icon: 'timeline',
      label: t('mapEditor.tool.connect', {}, { defaultValue: 'Connect nodes' }),
    },
  ]

  const zoomControls = [
    {
      key: 'zoom-out',
      icon: 'zoom_out',
      label: t('mapEditor.zoomOut', {}, { defaultValue: 'Zoom out' }),
      onClick: () => zoomBy(-0.2),
    },
    {
      key: 'zoom-in',
      icon: 'zoom_in',
      label: t('mapEditor.zoomIn', {}, { defaultValue: 'Zoom in' }),
      onClick: () => zoomBy(0.2),
    },
  ]

  return (
    <div className={cm.cn(cm.stack(6))}>
      <div
        className={cm.cn(cm.flex({ justify: 'between', align: 'center', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(1)}>
          <Link
            to="/maps"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-primary uppercase tracking-widest hover:underline',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              arrow_back
            </span>
            {t('mapEditor.backToMaps', {}, { defaultValue: 'All maps' })}
          </Link>
          <input
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            data-mol-id="map-editor-title"
            className={cm.cn(
              cm.textSize('3xl'),
              'font-extrabold tracking-tight text-on-surface bg-transparent border-0 outline-none focus:ring-2 focus:ring-primary/30 rounded-md px-1',
            )}
            disabled={savingTitle || loading}
          />
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          <button
            type="button"
            onClick={async () => {
              if (!id) return
              try {
                await http.post(`/maps/${id}/trash`, {})
                void track({ name: 'map.trashed', properties: { map_id: id } })
                navigate('/maps')
              } catch (error) {
                logError('mapEditor.trash', error)
                setError(
                  t('mapEditor.trashError', {}, { defaultValue: 'Could not move to trash.' }),
                )
              }
            }}
            data-mol-id="map-editor-trash-button"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'rounded-xl text-on-surface hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>delete</span>
            {t('mapEditor.trash', {}, { defaultValue: 'Move to trash' })}
          </button>
          <button
            type="button"
            onClick={handleSaveAsTemplate}
            disabled={savingTemplate || loading || !map}
            data-mol-id="map-editor-save-template"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'rounded-xl text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-60',
            )}
          >
            <span
              className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
              aria-hidden="true"
            >
              collections_bookmark
            </span>
            {savingTemplate
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('mapEditor.saveTemplate', {}, { defaultValue: 'Save as template' })}
          </button>
          <div className="relative">
            <button
              type="button"
              disabled={loading || !map}
              aria-expanded={exportOpen}
              aria-haspopup="menu"
              onClick={() => {
                setExportOpen((open) => {
                  if (!open) void ensureExportEntitlement()
                  return !open
                })
              }}
              data-mol-id="map-editor-export-button"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'rounded-xl text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-60',
              )}
            >
              <span
                className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                aria-hidden="true"
              >
                download
              </span>
              {t('mapEditor.export', {}, { defaultValue: 'Export' })}
            </button>
            {exportOpen && (
              <>
                {/* Backdrop closes the menu on outside click */}
                <button
                  type="button"
                  aria-label={t('mapEditor.closeExport', {}, { defaultValue: 'Close export menu' })}
                  onClick={() => setExportOpen(false)}
                  className="fixed inset-0 z-30 cursor-default"
                />
                <div
                  role="menu"
                  aria-label={t('mapEditor.export', {}, { defaultValue: 'Export' })}
                  data-mol-id="map-editor-export-menu"
                  className={cm.cn(
                    'absolute right-0 top-full mt-1 z-40 w-56 rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-lg p-1',
                  )}
                >
                  {canExport === false ? (
                    <div className={cm.stack(2)}>
                      <p
                        className={cm.cn(
                          cm.sp('p', 2),
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                        )}
                      >
                        {t(
                          'mapEditor.exportLocked',
                          {},
                          { defaultValue: 'Exporting is a Pro feature.' },
                        )}
                      </p>
                      <Link
                        to="/billing"
                        onClick={() => setExportOpen(false)}
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.sp('py', 2),
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                          'block rounded-lg text-primary hover:bg-surface-container-low',
                        )}
                      >
                        {t('mapEditor.exportUpgrade', {}, { defaultValue: 'Upgrade to export →' })}
                      </Link>
                    </div>
                  ) : (
                    (['markdown', 'png', 'svg'] as const).map((format) => (
                      <button
                        key={format}
                        role="menuitem"
                        type="button"
                        disabled={exportBusy !== null}
                        onClick={() => void handleExport(format)}
                        data-mol-id={`map-editor-export-${format}`}
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                          'w-full rounded-lg text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-60',
                        )}
                      >
                        <span>
                          {format === 'markdown'
                            ? t('mapEditor.exportMarkdown', {}, { defaultValue: 'Markdown (.md)' })
                            : format === 'png'
                              ? t('mapEditor.exportPng', {}, { defaultValue: 'Image (.png)' })
                              : t('mapEditor.exportSvg', {}, { defaultValue: 'Vector (.svg)' })}
                        </span>
                        {exportBusy === format && (
                          <span
                            className={cm.cn(
                              cm.w(4),
                              cm.h(4),
                              'rounded-full border-2 border-primary border-t-transparent animate-spin',
                            )}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
          <Link
            to={id ? `/maps/${id}/history` : '/maps'}
            data-mol-id="map-editor-history-link"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'rounded-xl text-on-surface hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>history</span>
            {t('nav.history', {}, { defaultValue: 'History' })}
          </Link>
          <Link
            to={id ? `/maps/${id}/share` : '/maps'}
            data-mol-id="map-editor-share-link"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>share</span>
            {t('common.share', {}, { defaultValue: 'Share' })}
          </Link>
        </div>
      </div>

      {loading && (
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.textCenter)}>
          {t('mapEditor.loading', {}, { defaultValue: 'Loading the canvas…' })}
        </p>
      )}
      {error && (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'rounded-xl bg-error-container/30 text-on-error-container border border-error/30',
          )}
          role="alert"
        >
          {error}
        </div>
      )}

      <div
        className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'lg:grid-cols-[1fr_320px] items-start')}
      >
        <section
          className={cm.cn(
            'relative overflow-hidden rounded-[2rem] bg-surface-container-low border border-outline-variant/30 shadow-sm',
          )}
          style={{
            backgroundImage:
              'radial-gradient(circle, color-mix(in srgb, var(--color-primary) 18%, transparent) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            minHeight: '520px',
          }}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('p', 1),
              'absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-surface-container-lowest rounded-xl shadow-md border border-outline-variant/30 flex-wrap max-w-[calc(100%-2rem)] justify-center',
            )}
          >
            {tools.map((toolDef) => (
              <button
                key={toolDef.key}
                type="button"
                onClick={() => {
                  setTool(toolDef.key)
                  if (toolDef.key !== 'connect') setConnectFrom(null)
                }}
                title={toolDef.label}
                aria-label={toolDef.label}
                aria-pressed={tool === toolDef.key}
                data-mol-id={`map-editor-tool-${toolDef.key}`}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(9),
                  cm.h(9),
                  'rounded-lg transition-colors',
                  tool === toolDef.key
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-low',
                )}
              >
                <span
                  className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
                  aria-hidden="true"
                >
                  {toolDef.icon}
                </span>
              </button>
            ))}
            <span className={cm.cn(cm.sp('px', 1), 'border-l border-outline-variant/40 flex')}>
              {zoomControls.map((ctl) => (
                <button
                  key={ctl.key}
                  type="button"
                  onClick={ctl.onClick}
                  title={ctl.label}
                  aria-label={ctl.label}
                  data-mol-id={`map-editor-${ctl.key}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(9),
                    cm.h(9),
                    'rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors',
                  )}
                >
                  <span
                    className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
                    aria-hidden="true"
                  >
                    {ctl.icon}
                  </span>
                </button>
              ))}
            </span>
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.textSize('xs'),
                'text-on-surface-variant border-l border-outline-variant/40 hidden lg:inline',
              )}
            >
              {tool === 'add'
                ? t('mapEditor.hint.add', {}, { defaultValue: 'Click canvas to drop a node' })
                : tool === 'connect'
                  ? connectFrom
                    ? t('mapEditor.hint.connectTarget', {}, { defaultValue: 'Click target node…' })
                    : t('mapEditor.hint.connectSource', {}, { defaultValue: 'Click source node…' })
                  : t(
                      'mapEditor.hint.select',
                      {},
                      { defaultValue: 'Drag to move · click to select' },
                    )}
            </span>
          </div>

          <svg
            ref={svgRef}
            viewBox="0 0 720 480"
            className={cm.cn(cm.w('full'), 'block h-[520px] touch-none select-none')}
            onClick={handleCanvasClick}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerLeave={handleCanvasPointerUp}
            data-mol-id="map-editor-canvas"
          >
            <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
              <g
                style={{ stroke: 'color-mix(in srgb, var(--color-primary) 55%, transparent)' }}
                strokeWidth="2"
                fill="none"
              >
                {connections.map((c) => {
                  const a = nodes.find((n) => n.id === c.source_node_id)
                  const b = nodes.find((n) => n.id === c.target_node_id)
                  if (!a || !b) return null
                  const ax = a.x + NODE_W / 2
                  const ay = a.y + NODE_H / 2
                  const bx = b.x + NODE_W / 2
                  const by = b.y + NODE_H / 2
                  const cx = (ax + bx) / 2
                  return (
                    <path key={c.id} d={`M ${ax} ${ay} C ${cx} ${ay}, ${cx} ${by}, ${bx} ${by}`} />
                  )
                })}
                {nodes.map((node) => {
                  if (!node.parent_id) return null
                  const p = nodes.find((pn) => pn.id === node.parent_id)
                  if (!p) return null
                  const ax = p.x + NODE_W / 2
                  const ay = p.y + NODE_H / 2
                  const bx = node.x + NODE_W / 2
                  const by = node.y + NODE_H / 2
                  const cx = (ax + bx) / 2
                  return (
                    <path
                      key={`tree-${node.id}`}
                      d={`M ${ax} ${ay} C ${cx} ${ay}, ${cx} ${by}, ${bx} ${by}`}
                      strokeOpacity={0.35}
                      strokeDasharray="4 4"
                    />
                  )
                })}
              </g>
              {nodes.map((node) => {
                const isSelected = node.id === selectedNodeId
                const isConnectSource = node.id === connectFrom
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onPointerDown={(e) => handleNodePointerDown(e, node)}
                    onPointerMove={handleNodePointerMove}
                    onPointerUp={handleNodePointerUp}
                    data-mol-id="map-editor-node"
                    data-node-id={node.id}
                    style={{ cursor: tool === 'add' ? 'crosshair' : 'pointer' }}
                  >
                    <rect
                      x={0}
                      y={0}
                      width={NODE_W}
                      height={NODE_H}
                      rx={12}
                      ry={12}
                      style={{ fill: 'var(--color-surface)' }}
                      stroke={
                        isConnectSource
                          ? 'var(--color-success)'
                          : isSelected
                            ? node.color
                            : 'var(--color-border-light)'
                      }
                      strokeWidth={isConnectSource ? 4 : isSelected ? 3 : 2}
                    />
                    <rect x={0} y={0} width={4} height={NODE_H} rx={2} ry={2} fill={node.color} />
                    <foreignObject x={10} y={6} width={NODE_W - 14} height={NODE_H - 12}>
                      <div
                        style={{
                          fontFamily: 'Inter, system-ui, sans-serif',
                          fontWeight: 600,
                          fontSize: 13,
                          color: 'var(--color-node-text)',
                          lineHeight: '1.25',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {node.text || t('status.untitled', {}, { defaultValue: 'Untitled' })}
                      </div>
                    </foreignObject>
                  </g>
                )
              })}
            </g>
            {nodes.length === 0 && !loading && (
              <text
                x={360}
                y={240}
                textAnchor="middle"
                fontFamily="Inter, system-ui, sans-serif"
                fontSize={14}
                style={{ fill: 'var(--color-text-muted)' }}
              >
                {t(
                  'mapEditor.emptyHint',
                  {},
                  { defaultValue: 'Pick the + tool, then click anywhere to add your first node' },
                )}
              </text>
            )}
          </svg>
        </section>

        <aside
          className={cm.cn(
            cm.stack(5),
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
          )}
        >
          <div className={cm.stack(1)}>
            <span
              className={cm.cn(
                'text-[10px] uppercase tracking-widest font-bold text-on-surface-variant',
              )}
            >
              {t('mapEditor.panel.eyebrow', {}, { defaultValue: 'Selected node' })}
            </span>
            {selected ? (
              <input
                type="text"
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onBlur={() => handleSaveText(selected.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                }}
                data-mol-id="map-editor-node-text"
                className={cm.cn(
                  cm.textSize('xl'),
                  'font-extrabold tracking-tight text-on-surface bg-transparent border-0 outline-none focus:ring-2 focus:ring-primary/30 rounded-md px-1',
                )}
              />
            ) : (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('mapEditor.panel.noSelection', {}, { defaultValue: 'Click a node to edit it.' })}
              </p>
            )}
          </div>
          {selected && (
            <>
              <div className={cm.stack(2)}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('mapEditor.panel.color', {}, { defaultValue: 'Color' })}
                </span>
                <div className={cm.flex({ gap: 'sm' })}>
                  {NODE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleColorChange(selected.id, c)}
                      data-mol-id="map-editor-node-color"
                      data-color={c}
                      className={cm.cn(
                        cm.w(8),
                        cm.h(8),
                        'rounded-full border-2 hover:scale-105 transition-transform',
                      )}
                      style={{
                        backgroundColor: c,
                        borderColor: selected.color === c ? c : 'transparent',
                      }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
              <div className={cm.flex({ gap: 'sm' })}>
                <button
                  type="button"
                  onClick={() => handleAddNode(selected.x + NODE_W + 40, selected.y, selected.id)}
                  data-mol-id="map-editor-add-child"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors',
                  )}
                >
                  <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>add</span>
                  {t('mapEditor.addChild', {}, { defaultValue: 'Add child' })}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteNode(selected.id)}
                  data-mol-id="map-editor-delete-node"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'rounded-xl bg-error-container/30 text-on-error-container hover:bg-error-container/50 transition-colors',
                  )}
                >
                  <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                    delete
                  </span>
                  {t('common.delete', {}, { defaultValue: 'Delete' })}
                </button>
              </div>
            </>
          )}
          <div className={cm.stack(2)}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('mapEditor.panel.stats', {}, { defaultValue: 'Map stats' })}
            </span>
            <ul className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
              <li className={cm.flex({ justify: 'between' })}>
                <span className={cm.cn('text-on-surface-variant')}>
                  {t('mapEditor.panel.nodes', {}, { defaultValue: 'Nodes' })}
                </span>
                <span className={cm.fontWeight('bold')} data-mol-id="map-editor-node-count">
                  {nodes.length}
                </span>
              </li>
              <li className={cm.flex({ justify: 'between' })}>
                <span className={cm.cn('text-on-surface-variant')}>
                  {t('nav.connections', {}, { defaultValue: 'Connections' })}
                </span>
                <span className={cm.fontWeight('bold')} data-mol-id="map-editor-connection-count">
                  {connections.length}
                </span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default MapEditor
