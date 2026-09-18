import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AnimationToolLayout } from '../components/AnimationToolLayout.js'
import { KeyframeTimelineMini } from '../components/KeyframeTimelineMini.js'
import { StatusPill } from '../components/StatusPill.js'

interface ApiProject {
  id: string
  name: string
  width?: number
  height?: number
  fps?: number
  duration?: number | string
}

interface ApiLayer {
  id: string
  project_id: string
  name: string
  type: string
  parent_id: string | null
  z_index: number
  locked: boolean
  hidden: boolean
}

const LAYER_ICON_BY_TYPE: Record<string, string> = {
  shape: 'rectangle',
  text: 'text_fields',
  image: 'image',
  group: 'folder',
  mask: 'visibility',
}

export function Editor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const [tool, setTool] = useState<'select' | 'transform' | 'pen' | 'text'>('transform')
  const [project, setProject] = useState<ApiProject | null>(null)
  const [projectError, setProjectError] = useState<string | null>(null)
  const [layers, setLayers] = useState<ApiLayer[] | null>(null)
  const [layersError, setLayersError] = useState<string | null>(null)
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setProject(null)
    setProjectError(null)
    http
      .get<ApiProject>(`/api/projects/${encodeURIComponent(id)}`)
      .then((res) => {
        if (cancelled) return
        setProject(res.data)
      })
      .catch(() => {
        if (cancelled) return
        setProjectError(t('editor.projectError', {}, { defaultValue: 'Could not load project.' }))
      })
    return () => {
      cancelled = true
    }
  }, [id, http, t])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLayers(null)
    setLayersError(null)
    http
      .get<ApiLayer[] | { data: ApiLayer[] }>(`/api/layers?projectId=${encodeURIComponent(id)}`)
      .then((res) => {
        if (cancelled) return
        const arr = Array.isArray(res.data)
          ? (res.data as ApiLayer[])
          : ((res.data as { data?: ApiLayer[] }).data ?? [])
        setLayers(arr)
        if (arr.length > 0) setSelectedLayerId(arr[0]!.id)
      })
      .catch(() => {
        if (cancelled) return
        setLayersError(t('editor.layersError', {}, { defaultValue: 'Could not load layers.' }))
        setLayers([])
      })
    return () => {
      cancelled = true
    }
  }, [id, http, t])

  async function handleAddLayer() {
    // Always POST — never invent a local-only layer. A layer that doesn't
    // round-trip through the backend won't appear in any other view, won't
    // show up after reload, and won't be exportable.
    if (!id || adding) return
    setAdding(true)
    try {
      const res = await http.post<ApiLayer>('/api/layers', {
        projectId: id,
        name: t('editor.newLayerName', {}, { defaultValue: 'New layer' }),
        type: 'shape',
      })
      const created = res.data as ApiLayer | { data?: ApiLayer } | null
      const layer =
        created && 'id' in (created as ApiLayer)
          ? (created as ApiLayer)
          : ((created as { data?: ApiLayer } | null)?.data ?? null)
      if (layer) {
        setLayers((prev) => (prev ? [...prev, layer] : [layer]))
        setSelectedLayerId(layer.id)
        setLayersError(null)
      } else {
        setLayersError(t('editor.addLayerError', {}, { defaultValue: 'Could not add layer.' }))
      }
    } catch (error) {
      logError('editor.addLayer', error)
      setLayersError(t('editor.addLayerError', {}, { defaultValue: 'Could not add layer.' }))
    } finally {
      setAdding(false)
    }
  }

  const selectedLayer = layers?.find((l) => l.id === selectedLayerId) ?? layers?.[0] ?? null
  const projectName =
    project?.name ?? t('editor.untitled', {}, { defaultValue: 'Untitled project' })
  const fps = Number(project?.fps ?? 60)
  const width = Number(project?.width ?? 800)
  const height = Number(project?.height ?? 600)

  return (
    <AnimationToolLayout
      title={t('editor.title', { name: projectName }, { defaultValue: '{{name}}' })}
      breadcrumb={t('editor.crumb', { tool }, { defaultValue: '// projects › edit · {{tool}}' })}
      toolbar={
        <Link
          to={id ? `/projects/${id}/export` : '/projects'}
          data-mol-id="editor-export"
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', gap: 1 }),
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            'rounded-md bg-gradient-to-r from-[var(--anim-primary)] to-[var(--anim-secondary)] text-white hover:opacity-90 transition-opacity uppercase tracking-widest font-mono',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[14px]')}>ios_share</span>
          <span>{t('common.export', {}, { defaultValue: 'Export' })}</span>
        </Link>
      }
      fullBleed
    >
      <div className={cm.cn(cm.flex({ direction: 'col' }), 'h-full')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.sp('px', 4),
            'h-12 border-b border-[var(--anim-border)] bg-[var(--anim-surface)]/60',
          )}
        >
          {(
            [
              { id: 'select', icon: 'mouse' },
              { id: 'transform', icon: 'transform' },
              { id: 'pen', icon: 'edit' },
              { id: 'text', icon: 'text_fields' },
            ] as const
          ).map((toolItem) => (
            <button
              key={toolItem.id}
              type="button"
              onClick={() => setTool(toolItem.id)}
              data-mol-id={`tool-${toolItem.id}`}
              className={cm.cn(
                cm.w(9),
                cm.h(9),
                cm.flex({ align: 'center', justify: 'center' }),
                'rounded-md transition-colors',
                tool === toolItem.id
                  ? 'bg-[color-mix(in_srgb,var(--anim-primary)_15%,transparent)] text-[var(--anim-primary)] border border-[color-mix(in_srgb,var(--anim-primary)_40%,transparent)]'
                  : 'text-[var(--anim-text-secondary)] hover:bg-[var(--anim-surface-elevated)]',
              )}
              aria-label={t(`editor.tool.${toolItem.id}`, {}, { defaultValue: toolItem.id })}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                {toolItem.icon}
              </span>
            </button>
          ))}
          <div className={cm.cn('h-6 w-px bg-[var(--anim-border)] mx-2')} />
          <StatusPill
            status="rendering"
            label={t('editor.autoSave', {}, { defaultValue: 'Auto-saving' })}
          />
          <span
            className={cm.cn(
              'font-mono text-[11px] uppercase tracking-widest text-[var(--anim-text-muted)] ml-auto',
            )}
          >
            {t(
              'editor.coords',
              { width, height, fps },
              { defaultValue: '{{width}} × {{height}} · {{fps}}fps' },
            )}
          </span>
        </div>

        <div className={cm.cn(cm.flex({ direction: 'row' }), 'flex-1 min-h-0')}>
          <aside
            className={cm.cn(
              cm.sp('p', 4),
              cm.stack(4),
              'w-[260px] border-r border-[var(--anim-border)] bg-[var(--anim-surface)]/60 overflow-y-auto',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                'font-mono uppercase tracking-widest text-[var(--anim-text-secondary)]',
              )}
            >
              {t('editor.layers', {}, { defaultValue: 'Layers' })}
            </h3>
            {layers === null ? (
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-[var(--anim-text-secondary)] font-mono uppercase tracking-widest',
                )}
              >
                {t('editor.layersLoading', {}, { defaultValue: 'Loading layers…' })}
              </p>
            ) : layersError ? (
              <p
                role="alert"
                className={cm.cn(cm.textSize('xs'), 'text-[var(--anim-danger)] font-mono')}
              >
                {layersError}
              </p>
            ) : layers.length === 0 ? (
              <p className={cm.cn(cm.textSize('xs'), 'text-[var(--anim-text-secondary)]')}>
                {t('editor.noLayers', {}, { defaultValue: 'No layers yet — add the first.' })}
              </p>
            ) : (
              <ul
                className={cm.stack(1)}
                role="listbox"
                aria-label={t('editor.layersList', {}, { defaultValue: 'Layers' })}
              >
                {layers.map((layer) => (
                  <li
                    key={layer.id}
                    onClick={() => setSelectedLayerId(layer.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedLayerId(layer.id)
                      }
                    }}
                    data-mol-id={`editor-layer-${layer.id}`}
                    role="option"
                    aria-selected={selectedLayerId === layer.id}
                    tabIndex={0}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 2 }),
                      cm.sp('px', 2),
                      cm.sp('py', 2),
                      'rounded-md hover:bg-[var(--anim-surface-elevated)] transition-colors cursor-pointer',
                      selectedLayerId === layer.id &&
                        'bg-[color-mix(in_srgb,var(--anim-primary)_10%,transparent)] border-l-2 border-[var(--anim-primary)]',
                    )}
                  >
                    <span
                      className={cm.cn(
                        'material-symbols-outlined text-[14px]',
                        !layer.hidden
                          ? 'text-[var(--anim-primary)]'
                          : 'text-[var(--anim-text-muted)]',
                      )}
                    >
                      {!layer.hidden ? 'visibility' : 'visibility_off'}
                    </span>
                    <span
                      className={cm.cn(
                        'material-symbols-outlined text-[14px]',
                        layer.locked
                          ? 'text-[var(--anim-accent)]'
                          : 'text-[var(--anim-text-muted)]',
                      )}
                    >
                      {layer.locked ? 'lock' : 'lock_open'}
                    </span>
                    <span
                      className={cm.cn(
                        'material-symbols-outlined text-[14px] text-[var(--anim-text-secondary)]',
                      )}
                    >
                      {LAYER_ICON_BY_TYPE[layer.type] ?? 'layers'}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-[var(--anim-text)] truncate')}>
                      {layer.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={handleAddLayer}
              type="button"
              disabled={adding || !id}
              data-mol-id="editor-add-layer"
              className={cm.cn(
                cm.w('full'),
                cm.flex({ align: 'center', justify: 'center', gap: 1 }),
                cm.sp('py', 2),
                cm.textSize('xs'),
                'rounded-md border border-dashed border-[var(--anim-border)] text-[var(--anim-text-secondary)] hover:border-[color-mix(in_srgb,var(--anim-primary)_40%,transparent)] hover:text-[var(--anim-primary)] transition-colors disabled:opacity-50',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[14px]')}>add</span>
              {adding
                ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                : t('editor.addLayer', {}, { defaultValue: 'Add layer' })}
            </button>
          </aside>

          <section
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'flex-1 bg-[var(--anim-background)] min-w-0 overflow-hidden',
            )}
          >
            <div
              className={cm.cn('flex-1 relative overflow-hidden')}
              style={{
                backgroundImage:
                  'radial-gradient(circle at 2px 2px, color-mix(in srgb, var(--anim-primary) 10%, transparent) 1px, transparent 0)',
                backgroundSize: '24px 24px',
              }}
            >
              <div className={cm.cn('absolute inset-0 flex items-center justify-center')}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-[420px] h-[260px] rounded-2xl border border-[var(--anim-border)] bg-[var(--anim-surface)] shadow-[0_30px_80px_-20px_color-mix(in_srgb,var(--anim-primary)_50%,transparent)] relative',
                  )}
                >
                  {projectError ? (
                    <p
                      role="alert"
                      className={cm.cn(cm.textSize('sm'), 'text-[var(--anim-danger)] font-mono')}
                    >
                      {projectError}
                    </p>
                  ) : (
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        cm.textSize('lg'),
                        'text-[var(--anim-text)] font-headline',
                      )}
                    >
                      {selectedLayer?.name ?? projectName}
                    </span>
                  )}
                  <div
                    className={cm.cn(
                      'absolute inset-0 border-2 border-dashed border-[color-mix(in_srgb,var(--anim-primary)_40%,transparent)] rounded-2xl pointer-events-none',
                    )}
                  />
                  {[
                    { className: '-top-1 -left-1' },
                    { className: '-top-1 -right-1' },
                    { className: '-bottom-1 -left-1' },
                    { className: '-bottom-1 -right-1' },
                  ].map((handle) => (
                    <div
                      key={handle.className}
                      className={cm.cn(
                        'absolute w-2 h-2 bg-surface border border-[var(--anim-primary)]',
                        handle.className,
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div
              className={cm.cn(
                'border-t border-[var(--anim-border)] p-4 bg-[var(--anim-background)]',
              )}
            >
              <KeyframeTimelineMini playheadPercent={42} />
            </div>
          </section>

          <aside
            className={cm.cn(
              cm.sp('p', 4),
              cm.stack(4),
              'w-[300px] border-l border-[var(--anim-border)] bg-[var(--anim-surface)]/60 overflow-y-auto',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                'font-mono uppercase tracking-widest text-[var(--anim-text-secondary)]',
              )}
            >
              {t('editor.inspector', {}, { defaultValue: 'Inspector' })}
            </h3>
            <section className={cm.stack(2)}>
              <h4
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-[var(--anim-text)]',
                )}
              >
                {t('editor.group.project', {}, { defaultValue: 'Project' })}
              </h4>
              <dl className={cm.cn('grid grid-cols-2 gap-2')}>
                {[
                  {
                    label: t('editor.prop.width', {}, { defaultValue: 'W' }),
                    value: String(width),
                  },
                  {
                    label: t('editor.prop.height', {}, { defaultValue: 'H' }),
                    value: String(height),
                  },
                  { label: t('editor.prop.fps', {}, { defaultValue: 'FPS' }), value: String(fps) },
                  {
                    label: t('editor.prop.duration', {}, { defaultValue: 'DUR' }),
                    value: String(project?.duration ?? 0),
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'rounded-md bg-[var(--anim-background)] border border-[var(--anim-border)] flex items-center justify-between',
                    )}
                  >
                    <dt
                      className={cm.cn(
                        cm.textSize('xs'),
                        'font-mono text-[var(--anim-text-secondary)]',
                      )}
                    >
                      {row.label}
                    </dt>
                    <dd className={cm.cn(cm.textSize('xs'), 'font-mono text-[var(--anim-text)]')}>
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
            {selectedLayer ? (
              <section className={cm.stack(2)}>
                <h4
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'text-[var(--anim-text)]',
                  )}
                >
                  {t('editor.group.layer', {}, { defaultValue: 'Layer' })}
                </h4>
                <dl className={cm.cn('grid grid-cols-2 gap-2')}>
                  {[
                    {
                      label: t('form.name', {}, { defaultValue: 'Name' }),
                      value: selectedLayer.name,
                      accent: true,
                    },
                    {
                      label: t('form.type', {}, { defaultValue: 'Type' }),
                      value: selectedLayer.type,
                    },
                    {
                      label: t('editor.prop.zIndex', {}, { defaultValue: 'Z' }),
                      value: String(selectedLayer.z_index),
                    },
                    {
                      label: t('editor.prop.locked', {}, { defaultValue: 'Locked' }),
                      value: selectedLayer.locked
                        ? t('common.yes', {}, { defaultValue: 'yes' })
                        : t('common.no', {}, { defaultValue: 'no' }),
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        'rounded-md bg-[var(--anim-background)] border border-[var(--anim-border)] flex items-center justify-between',
                      )}
                    >
                      <dt
                        className={cm.cn(
                          cm.textSize('xs'),
                          'font-mono text-[var(--anim-text-secondary)]',
                        )}
                      >
                        {row.label}
                      </dt>
                      <dd
                        className={cm.cn(
                          cm.textSize('xs'),
                          'font-mono',
                          row.accent ? 'text-[var(--anim-primary)]' : 'text-[var(--anim-text)]',
                        )}
                      >
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </AnimationToolLayout>
  )
}

export default Editor
