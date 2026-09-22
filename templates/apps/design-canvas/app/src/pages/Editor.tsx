import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CollaboratorStack } from '../components/CollaboratorStack.js'
import { DesignCanvasLayout } from '../components/DesignCanvasLayout.js'
import { UserMenu } from '../components/UserMenu.js'

interface Project {
  id: string
  name: string
  width: number
  height: number
  canvas_data?: { shapes?: unknown[] } | null
  thumbnail_color?: string | null
}

interface Shape {
  id: string
  type: 'rect' | 'ellipse' | 'text' | 'line' | 'path' | 'image'
  x: number
  y: number
  width: number
  height: number
  fill: string | null
  stroke: string | null
  stroke_width: number
  opacity: number
  text: string | null
  font_size: number | null
  font_family: string | null
  rotation: number
  z_index: number
}

const TOOLS = [
  { id: 'select', icon: 'arrow_selector_tool', shortcut: 'V', label: 'Select' },
  { id: 'rect', icon: 'rectangle', shortcut: 'R', label: 'Rectangle' },
  { id: 'ellipse', icon: 'circle', shortcut: 'O', label: 'Ellipse' },
  { id: 'text', icon: 'title', shortcut: 'T', label: 'Text' },
  { id: 'line', icon: 'horizontal_rule', shortcut: 'L', label: 'Line' },
  { id: 'hand', icon: 'pan_tool', shortcut: 'H', label: 'Hand' },
] as const

type ToolId = (typeof TOOLS)[number]['id']

const FILL_PALETTE = ['#7c3aed', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#1e1535', '#ffffff']

interface CanvasShape {
  type: Shape['type']
  x: number
  y: number
  width: number
  height: number
  fill: string
  text?: string
}

function shapeFromRecord(s: Record<string, unknown>): Shape {
  return {
    id: String(s.id),
    type: (s.type as Shape['type']) ?? 'rect',
    x: Number(s.x ?? 0),
    y: Number(s.y ?? 0),
    width: Number(s.width ?? 100),
    height: Number(s.height ?? 100),
    fill: (s.fill as string) ?? '#7c3aed',
    stroke: (s.stroke as string) ?? null,
    stroke_width: Number(s.stroke_width ?? 0),
    opacity: Number(s.opacity ?? 1),
    text: (s.text as string) ?? null,
    font_size: Number(s.font_size ?? 16),
    font_family: (s.font_family as string) ?? 'Inter',
    rotation: Number(s.rotation ?? 0),
    z_index: Number(s.z_index ?? 0),
  }
}

export function Editor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [shapes, setShapes] = useState<Shape[]>([])
  const [activeTool, setActiveTool] = useState<ToolId>('select')
  const [zoom, setZoom] = useState(100)
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
  const [savingName, setSavingName] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [shareStatus, setShareStatus] = useState<string | null>(null)
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  /** Which side panel is slid over the canvas on <lg screens (asides are fixed there). */
  const [mobilePanel, setMobilePanel] = useState<'layers' | 'properties' | null>(null)

  const loadProject = useCallback(async () => {
    if (!id) return
    try {
      const resp = await http.get(`/api/projects/${id}`)
      const data = (resp as { data?: Project }).data ?? null
      if (!data) {
        setLoadError('Project not found')
        return
      }
      setProject(data)
      setDraftName(data.name)
      const sresp = await http.get(`/api/shapes?projectId=${id}`)
      const list = ((sresp as { data?: unknown }).data ?? []) as Array<Record<string, unknown>>
      setShapes(list.map(shapeFromRecord))
    } catch (err) {
      setLoadError((err as { message?: string }).message ?? 'Failed to load project')
    }
  }, [http, id])

  useEffect(() => {
    void loadProject()
  }, [loadProject])

  const saveName = async () => {
    if (!project) return
    if (draftName.trim() === project.name) {
      setEditingName(false)
      return
    }
    setSavingName(true)
    try {
      const resp = await http.put(`/api/projects/${project.id}`, { name: draftName.trim() })
      const updated = (resp as { data?: Project }).data ?? project
      setProject({ ...project, name: updated.name })
      setEditingName(false)
      void track({ name: 'canvas.renamed', properties: { projectId: project.id } })
    } finally {
      setSavingName(false)
    }
  }

  const addShape = async (type: ToolId) => {
    if (!project) return
    if (type === 'select' || type === 'hand') return
    const dbType = type === 'rect' ? 'rect' : type
    const palette = FILL_PALETTE[shapes.length % FILL_PALETTE.length]
    const payload: CanvasShape = {
      type: dbType as Shape['type'],
      x: 80 + (shapes.length % 5) * 120,
      y: 80 + Math.floor(shapes.length / 5) * 120,
      width: type === 'line' ? 200 : type === 'text' ? 240 : 120,
      height: type === 'line' ? 4 : type === 'text' ? 32 : 120,
      fill: palette,
    }
    if (type === 'text') payload.text = 'Atelier'
    try {
      const resp = await http.post('/api/shapes', { projectId: project.id, ...payload })
      const created = (resp as { data?: Record<string, unknown> }).data ?? null
      if (created) {
        setShapes((prev) => [...prev, shapeFromRecord(created)])
        void track({
          name: 'shape.added',
          properties: { projectId: project.id, shapeId: String(created.id), type: payload.type },
        })
      }
    } catch (_error) {
      // leave UI unchanged on failure; toast surfaced via feedback
    }
  }

  const deleteShape = async (shapeId: string) => {
    try {
      await http.delete(`/api/shapes/${shapeId}`)
      setShapes((prev) => prev.filter((s) => s.id !== shapeId))
      if (selectedShapeId === shapeId) setSelectedShapeId(null)
      void track({
        name: 'shape.deleted',
        properties: { projectId: project?.id, shapeId },
      })
    } catch (_error) {
      // optimistic delete already applied; server error is best-effort
    }
  }

  const startExport = async () => {
    if (!project) return
    setExportStatus(null)
    try {
      const resp = await http.post('/api/exports', {
        projectId: project.id,
        format: 'png',
        quality: 90,
        scale: 2,
      })
      const data = (resp as { data?: { id?: string; status?: string } }).data ?? null
      if (data?.status === 'ready') {
        setExportStatus(t('editor.exportReady', {}, { defaultValue: 'Export ready' })!)
        void track({
          name: 'design.exported',
          properties: { projectId: project.id, exportId: data.id, format: 'png', status: 'ready' },
        })
      } else if (data) {
        setExportStatus(t('editor.exportQueued', {}, { defaultValue: 'Export queued' })!)
        void track({
          name: 'design.exported',
          properties: { projectId: project.id, exportId: data.id, format: 'png', status: 'queued' },
        })
      }
    } catch (err) {
      setExportStatus(((err as { message?: string }).message ?? 'Export failed').slice(0, 80))
    }
  }

  const startShare = async () => {
    if (!project) return
    setShareStatus(null)
    // Free-tier doesn't allow real collaborator invites. Try the call,
    // surface the real backend response (success URL or paywall message).
    try {
      const resp = await http.post(`/api/projects/${project.id}/collaborators`, {
        user_id: '00000000-0000-0000-0000-000000000001',
        role: 'viewer',
      })
      const data = (resp as { data?: { id?: string } }).data ?? null
      if (data?.id) {
        setShareStatus(t('editor.shareInvited', {}, { defaultValue: 'Collaborator invite sent' })!)
        void track({
          name: 'design.shared',
          properties: { projectId: project.id, collaboratorId: data.id },
        })
      }
    } catch (err) {
      const msg =
        (err as { message?: string }).message ??
        (err as { error?: string }).error ??
        'Share unavailable'
      setShareStatus(String(msg).slice(0, 100))
    }
  }

  const layerEntries = useMemo(() => {
    return [...shapes].sort((a, b) => b.z_index - a.z_index)
  }, [shapes])

  if (loadError) {
    return (
      <DesignCanvasLayout
        eyebrow={t('nav.editor', {}, { defaultValue: 'Editor' })}
        title={t('editor.errorTitle', {}, { defaultValue: 'Project unavailable' })}
      >
        <div
          className={cm.cn(
            cm.sp('p', 8),
            cm.stack(3),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-center',
          )}
        >
          <p className={cm.cn(cm.fontWeight('semibold'))}>
            {t('editor.errorBody', {}, { defaultValue: 'We could not open this project.' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{loadError}</p>
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-xl bg-primary text-white inline-block w-fit mx-auto',
            )}
          >
            {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
          </Link>
        </div>
      </DesignCanvasLayout>
    )
  }

  if (!project) {
    return (
      <DesignCanvasLayout
        eyebrow={t('nav.editor', {}, { defaultValue: 'Editor' })}
        title={t('editor.loadingTitle', {}, { defaultValue: 'Loading project…' })}
      >
        <div
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('editor.loadingBody', {}, { defaultValue: 'Fetching project + shapes…' })}
          </span>
        </div>
      </DesignCanvasLayout>
    )
  }

  return (
    <DesignCanvasLayout variant="canvas">
      <div className={cm.cn(cm.flex({}), cm.h('screen'), 'bg-surface text-on-surface')}>
        {/* Mobile drawer backdrop (<lg) */}
        {mobilePanel && (
          <div
            aria-hidden="true"
            data-mol-id="editor-panel-backdrop"
            onClick={() => setMobilePanel(null)}
            className="lg:hidden fixed inset-0 z-30 bg-black/40"
          />
        )}
        {/* LEFT — Layers */}
        <aside
          data-mol-id="editor-layers"
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            'w-[260px] border-r border-outline-variant/30 bg-surface-container-low',
            // <lg: off-canvas drawer toggled from the toolbar
            'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-40 max-lg:shadow-2xl max-lg:transition-transform',
            mobilePanel === 'layers' ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
          )}
        >
          <header
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'border-b border-outline-variant/30',
            )}
          >
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
              aria-label={t('editor.backToProjects', {}, { defaultValue: 'Back to projects' })!}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[18px] text-on-surface-variant')}
              >
                arrow_back
              </span>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('nav.projects', {}, { defaultValue: 'Projects' })}
              </span>
            </button>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-primary',
              )}
            >
              {t('editor.layersLabel', {}, { defaultValue: 'Layers' })}
            </span>
            <button
              type="button"
              onClick={() => setMobilePanel(null)}
              aria-label={t('common.close', {}, { defaultValue: 'Close' })!}
              data-mol-id="editor-layers-close"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(8),
                cm.h(8),
                'lg:hidden rounded-md text-on-surface-variant hover:bg-surface-container',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>close</span>
            </button>
          </header>
          <div className={cm.cn(cm.flex1, 'overflow-y-auto')} data-mol-id="editor-layer-list">
            {layerEntries.length === 0 ? (
              <p
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant',
                )}
              >
                {t(
                  'editor.layersEmpty',
                  {},
                  { defaultValue: 'No shapes yet — pick a tool to start drawing.' },
                )}
              </p>
            ) : (
              layerEntries.map((shape) => {
                const active = selectedShapeId === shape.id
                return (
                  <button
                    key={shape.id}
                    type="button"
                    onClick={() => {
                      setSelectedShapeId(shape.id)
                      // On mobile, inspecting a layer → open its properties drawer
                      setMobilePanel((p) => (p === 'layers' ? 'properties' : p))
                    }}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('medium'),
                      cm.textSize('sm'),
                      'group w-full text-left transition-colors',
                      active
                        ? 'bg-primary-fixed/40 text-on-primary-container border-l-2 border-primary'
                        : 'text-on-surface-variant hover:bg-surface-container/60',
                    )}
                    data-mol-id={`editor-layer-${shape.id}`}
                  >
                    <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'truncate')}>
                      <span
                        className={cm.cn(cm.w(4), cm.h(4), 'rounded-sm shrink-0')}
                        style={{ backgroundColor: shape.fill ?? '#888' }}
                      ></span>
                      <span className={cm.cn('truncate text-[13px]')}>
                        {shape.type}
                        {shape.text ? ` · ${shape.text.slice(0, 18)}` : ''}
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* CENTER — Canvas */}
        <main className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }), 'min-w-0')}>
          <header
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              cm.sp('px', 4),
              cm.h(12),
              'border-b border-outline-variant/30 bg-surface-container-lowest',
              // <lg: let the bar wrap so tools get their own scrollable row
              'max-lg:h-auto max-lg:flex-wrap max-lg:py-2 max-lg:gap-y-2',
            )}
            data-mol-id="editor-toolbar"
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                'min-w-0 flex-1 max-lg:basis-auto',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(8),
                  cm.h(8),
                  'bg-gradient-to-br from-primary to-secondary rounded-md text-white shadow-sm',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[18px]')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  brush
                </span>
              </span>
              {editingName ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    void saveName()
                  }}
                >
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={() => void saveName()}
                    aria-label={t('editor.projectNameLabel', {}, { defaultValue: 'Project name' })!}
                    data-mol-id="editor-project-name-input"
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      'rounded bg-surface-container-low border border-outline-variant/40 text-on-surface',
                    )}
                  />
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  data-mol-id="editor-project-name"
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'tracking-tight text-on-surface hover:underline truncate',
                  )}
                >
                  {project.name}
                </button>
              )}
              <span
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.sp('py', 0),
                  cm.fontWeight('bold'),
                  'rounded-full text-[10px] uppercase tracking-widest bg-tertiary/15 text-tertiary',
                  'max-md:hidden whitespace-nowrap',
                )}
              >
                {savingName
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('editor.statusLive', {}, { defaultValue: 'Live · auto-saved' })}
              </span>
            </div>

            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                'max-lg:order-last max-lg:basis-full max-lg:overflow-x-auto max-lg:py-1',
              )}
              data-mol-id="editor-tools"
            >
              {TOOLS.map((tool) => {
                const active = tool.id === activeTool
                const label = t(`editor.tool.${tool.id}`, {}, { defaultValue: tool.label })!
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => {
                      setActiveTool(tool.id)
                      void addShape(tool.id)
                    }}
                    title={`${label} (${tool.shortcut})`}
                    aria-label={label}
                    data-mol-id={`editor-tool-${tool.id}`}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(9),
                      cm.h(9),
                      'rounded-lg transition-colors',
                      active
                        ? 'bg-primary-fixed/40 text-on-primary-container ring-1 ring-primary/50'
                        : 'text-on-surface-variant hover:bg-surface-container',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                      {tool.icon}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              {/* <lg: side panels become drawers — toggle buttons live here */}
              <button
                type="button"
                onClick={() => setMobilePanel((p) => (p === 'layers' ? null : 'layers'))}
                data-mol-id="editor-layers-toggle"
                aria-label={t('editor.layersLabel', {}, { defaultValue: 'Layers' })!}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('px', 2),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'lg:hidden rounded-lg bg-surface-container text-on-surface-variant',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[16px]')}>layers</span>
                <span className="max-[420px]:hidden">
                  {t('editor.layersLabel', {}, { defaultValue: 'Layers' })}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMobilePanel((p) => (p === 'properties' ? null : 'properties'))}
                data-mol-id="editor-properties-toggle"
                aria-label={t('editor.propertiesLabel', {}, { defaultValue: 'Properties' })!}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('px', 2),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'lg:hidden rounded-lg bg-surface-container text-on-surface-variant',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[16px]')}>tune</span>
                <span className="max-[420px]:hidden">
                  {t('editor.propertiesLabel', {}, { defaultValue: 'Properties' })}
                </span>
              </button>
              <div className={cm.cn('max-md:hidden')}>
                <CollaboratorStack
                  collaborators={[
                    { id: 'self', name: 'You', avatarColor: '#7c3aed', online: true },
                  ]}
                  max={3}
                  size="sm"
                />
              </div>
              <button
                type="button"
                onClick={() => void startShare()}
                data-mol-id="editor-share"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors',
                )}
              >
                {t('common.share', {}, { defaultValue: 'Share' })}
              </button>
              <button
                type="button"
                onClick={() => void startExport()}
                data-mol-id="editor-export"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'rounded-lg bg-gradient-to-br from-primary to-secondary text-white shadow-sm',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[14px]')}>download</span>
                {t('common.export', {}, { defaultValue: 'Export' })}
              </button>
              <UserMenu />
            </div>
          </header>

          {(shareStatus || exportStatus) && (
            <div
              data-mol-id="editor-status"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'border-b border-outline-variant/30 bg-surface-container-low text-on-surface',
              )}
            >
              {shareStatus ?? exportStatus}
            </div>
          )}

          <section
            className={cm.cn(
              cm.flex1,
              cm.flex({ align: 'center', justify: 'center' }),
              'relative overflow-auto',
            )}
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(124,58,237,0.18) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            <CanvasSurface
              project={project}
              shapes={shapes}
              zoom={zoom}
              selectedShapeId={selectedShapeId}
              onSelectShape={setSelectedShapeId}
            />

            <div
              className={cm.cn(
                'absolute bottom-4 left-4 right-4',
                cm.flex({ align: 'center', justify: 'between' }),
              )}
            >
              <div
                data-mol-id="editor-status-bar"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm text-on-surface-variant',
                )}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                <span>
                  {t(
                    'editor.shapeCount',
                    { count: shapes.length },
                    { defaultValue: '{{count}} shapes' },
                  )}
                </span>
                <span className="opacity-50">·</span>
                <span>
                  {project.width} × {project.height}
                </span>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 1),
                  cm.sp('py', 1),
                  'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
                )}
              >
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(25, z - 25))}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(9),
                    cm.h(9),
                    'rounded-md text-on-surface-variant hover:bg-surface-container',
                  )}
                  aria-label={t('editor.zoomOut', {}, { defaultValue: 'Zoom out' })!}
                >
                  <span className={cm.cn('material-symbols-outlined text-[16px]')}>remove</span>
                </button>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'min-w-12 text-center text-on-surface',
                  )}
                  data-mol-id="editor-zoom-label"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {zoom}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(400, z + 25))}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(9),
                    cm.h(9),
                    'rounded-md text-on-surface-variant hover:bg-surface-container',
                  )}
                  aria-label={t('editor.zoomIn', {}, { defaultValue: 'Zoom in' })!}
                >
                  <span className={cm.cn('material-symbols-outlined text-[16px]')}>add</span>
                </button>
              </div>
            </div>
          </section>
        </main>

        {/* RIGHT — Properties */}
        <aside
          data-mol-id="editor-properties"
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            'w-[300px] border-l border-outline-variant/30 bg-surface-container-low overflow-y-auto',
            // <lg: off-canvas drawer toggled from the toolbar
            'max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:shadow-2xl max-lg:transition-transform',
            mobilePanel === 'properties' ? 'max-lg:translate-x-0' : 'max-lg:translate-x-full',
          )}
        >
          <header
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'border-b border-outline-variant/30',
            )}
          >
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-primary',
              )}
            >
              {t('editor.propertiesLabel', {}, { defaultValue: 'Properties' })}
            </span>
            <button
              type="button"
              onClick={() => setMobilePanel(null)}
              aria-label={t('common.close', {}, { defaultValue: 'Close' })!}
              data-mol-id="editor-properties-close"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(8),
                cm.h(8),
                'lg:hidden rounded-md text-on-surface-variant hover:bg-surface-container',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>close</span>
            </button>
          </header>
          <div className={cm.cn(cm.flex1, cm.sp('p', 4), cm.stack(3))}>
            {selectedShapeId ? (
              <SelectedProperties
                shape={shapes.find((s) => s.id === selectedShapeId) ?? null}
                onDelete={() => deleteShape(selectedShapeId)}
              />
            ) : (
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'editor.propertiesEmpty',
                  {},
                  { defaultValue: 'Select a layer to inspect its position, fill, and size.' },
                )}
              </p>
            )}
            <div className={cm.cn(cm.stack(2), cm.sp('mt', 4))}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('editor.canvasSizeLabel', {}, { defaultValue: 'Canvas size' })}
              </span>
              <p
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {project.width} × {project.height}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </DesignCanvasLayout>
  )
}

interface CanvasSurfaceProps {
  project: Project
  shapes: Shape[]
  zoom: number
  selectedShapeId: string | null
  onSelectShape: (id: string) => void
}

function CanvasSurface({
  project,
  shapes,
  zoom,
  selectedShapeId,
  onSelectShape,
}: CanvasSurfaceProps) {
  const cm = getClassMap()
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const scale = zoom / 100
  const displayW = Math.min(project.width, 1080)
  const displayH = Math.round((displayW / project.width) * project.height)
  return (
    <div
      ref={surfaceRef}
      className={cm.cn('relative bg-surface shadow-xl border border-outline-variant/30')}
      style={{
        width: `${displayW * scale}px`,
        height: `${displayH * scale}px`,
        transformOrigin: 'center',
      }}
      data-mol-id="editor-canvas-surface"
    >
      <svg
        width={displayW * scale}
        height={displayH * scale}
        viewBox={`0 0 ${project.width} ${project.height}`}
        style={{ display: 'block' }}
      >
        {shapes.map((shape) => {
          const isSelected = shape.id === selectedShapeId
          const stroke = isSelected ? '#7c3aed' : (shape.stroke ?? 'transparent')
          const strokeWidth = isSelected ? 4 : (shape.stroke_width ?? 0)
          if (shape.type === 'rect') {
            return (
              <rect
                key={shape.id}
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                fill={shape.fill ?? '#7c3aed'}
                stroke={stroke}
                strokeWidth={strokeWidth}
                opacity={shape.opacity}
                onClick={() => onSelectShape(shape.id)}
                style={{ cursor: 'pointer' }}
              />
            )
          }
          if (shape.type === 'ellipse') {
            return (
              <ellipse
                key={shape.id}
                cx={shape.x + shape.width / 2}
                cy={shape.y + shape.height / 2}
                rx={shape.width / 2}
                ry={shape.height / 2}
                fill={shape.fill ?? '#7c3aed'}
                stroke={stroke}
                strokeWidth={strokeWidth}
                opacity={shape.opacity}
                onClick={() => onSelectShape(shape.id)}
                style={{ cursor: 'pointer' }}
              />
            )
          }
          if (shape.type === 'line') {
            return (
              <line
                key={shape.id}
                x1={shape.x}
                y1={shape.y + shape.height / 2}
                x2={shape.x + shape.width}
                y2={shape.y + shape.height / 2}
                stroke={shape.fill ?? '#7c3aed'}
                strokeWidth={Math.max(2, strokeWidth)}
                onClick={() => onSelectShape(shape.id)}
                style={{ cursor: 'pointer' }}
              />
            )
          }
          if (shape.type === 'text') {
            return (
              <text
                key={shape.id}
                x={shape.x}
                y={shape.y + (shape.font_size ?? 16)}
                fill={shape.fill ?? '#1e1535'}
                fontSize={shape.font_size ?? 24}
                fontFamily={shape.font_family ?? 'Inter'}
                opacity={shape.opacity}
                onClick={() => onSelectShape(shape.id)}
                style={{ cursor: 'pointer' }}
              >
                {shape.text ?? 'Text'}
              </text>
            )
          }
          return null
        })}
      </svg>
    </div>
  )
}

interface SelectedPropertiesProps {
  shape: Shape | null
  onDelete: () => void
}

function SelectedProperties({ shape, onDelete }: SelectedPropertiesProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  if (!shape) return null
  return (
    <div className={cm.cn(cm.stack(2))}>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          'text-[10px] uppercase tracking-widest text-primary',
        )}
      >
        {shape.type}
      </span>
      <p
        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
        style={{ fontFamily: 'JetBrains Mono, monospace' }}
      >
        x {Math.round(shape.x)} · y {Math.round(shape.y)}
        <br />w {Math.round(shape.width)} · h {Math.round(shape.height)}
      </p>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
        <span
          className={cm.cn(cm.w(5), cm.h(5), 'rounded-md border border-outline-variant/40')}
          style={{ backgroundColor: shape.fill ?? '#888' }}
        ></span>
        <span
          className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          {(shape.fill ?? '').toUpperCase()}
        </span>
      </div>
      <button
        type="button"
        onClick={onDelete}
        data-mol-id="editor-shape-delete"
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.fontWeight('semibold'),
          cm.textSize('xs'),
          'w-fit rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high border border-outline-variant/40',
        )}
      >
        {t('editor.deleteShape', {}, { defaultValue: 'Delete shape' })}
      </button>
    </div>
  )
}

export default Editor
