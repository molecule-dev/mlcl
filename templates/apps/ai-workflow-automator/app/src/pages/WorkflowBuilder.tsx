/**
 * WorkflowBuilder — three-pane layout: AppShell sidebar, center canvas
 * (dotted grid + step nodes laid out left-to-right), right inspector
 * rail with the selected step's properties.
 *
 * Data source: GET /api/workflows/:id returns the workflow + steps.
 * Toolbar buttons:
 *   - Test run: POST /api/workflows/:id/trigger (manual)
 *   - Save draft: PUT /api/workflows/:id (current step layout)
 *   - Toggle on/off: PATCH /api/workflows/:id/toggle
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WorkflowAppShell } from '../components/WorkflowAppShell.js'
import { type NodeKind, WorkflowNode } from '../components/WorkflowNode.js'
import { type RunStatus, WorkflowStatusBadge } from '../components/WorkflowStatusBadge.js'

interface WorkflowStep {
  id?: string
  type: string
  position?: number
  config?: string | Record<string, unknown>
}

interface WorkflowDetail {
  id: string
  name: string
  description?: string
  trigger_type: 'manual' | 'webhook' | 'cron' | 'schedule'
  cron_expression?: string | null
  enabled?: boolean
  version?: number
  steps?: WorkflowStep[]
  last_run?: { status?: string } | null
}

function stepKind(type: string): NodeKind {
  if (type === 'condition') return 'condition'
  if (type === 'webhook' || type === 'trigger' || type === 'manual') return 'trigger'
  return 'action'
}

function stepIcon(type: string): string {
  if (type === 'http') return 'language'
  if (type === 'ai') return 'psychology'
  if (type === 'email') return 'mail'
  if (type === 'webhook') return 'webhook'
  if (type === 'cron' || type === 'schedule' || type === 'manual') return 'play_arrow'
  if (type === 'condition') return 'rule'
  return 'bolt'
}

function statusFromWorkflow(wf: WorkflowDetail): RunStatus {
  if (!wf.enabled) return 'paused'
  const last = wf.last_run?.status ?? 'queued'
  if (last === 'success' || last === 'completed') return 'completed'
  if (last === 'failure' || last === 'failed') return 'failed'
  if (last === 'running') return 'running'
  return 'queued'
}

function parseConfig(
  config: string | Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!config) return {}
  if (typeof config === 'object') return config
  try {
    const parsed: unknown = JSON.parse(config)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch (_error) {
    // Invalid JSON in step config; return empty object so the inspector renders cleanly.
    return {}
  }
}

interface CanvasNode {
  id: string
  index: number
  kind: NodeKind
  icon: string
  title: string
  subtitle?: string
  x: number
  y: number
}

function layoutNodes(workflow: WorkflowDetail): CanvasNode[] {
  // Trigger pseudo-node + every step in linear sequence
  const triggerNode: CanvasNode = {
    id: 'trigger',
    index: -1,
    kind: 'trigger',
    icon: stepIcon(workflow.trigger_type),
    title: workflow.trigger_type,
    subtitle: workflow.cron_expression ?? undefined,
    x: 40,
    y: 60,
  }
  const steps = (workflow.steps ?? []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const stepNodes = steps.map((step, i) => ({
    id: step.id ?? `step-${i}`,
    index: i,
    kind: stepKind(step.type),
    icon: stepIcon(step.type),
    title: step.type,
    subtitle: undefined,
    x: 40 + (i + 1) * 340,
    y: 60,
  }))
  return [triggerNode, ...stepNodes]
}

export function WorkflowBuilder() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const params = useParams<{ id: string }>()
  const navigate = useNavigate()
  const http = useHttpClient()
  const id = params.id ?? ''

  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [selectedNodeId, setSelectedNodeId] = useState<string>('trigger')
  // Canvas zoom (mind-mapping/family-tree's proven canvas approach, sized for
  // this DOM-node canvas): the world scales via transform, the sizer div keeps
  // the scroll area honest, and native touch scroll pans. Bounds 0.4–1.5.
  const [zoom, setZoom] = useState(1)
  const clampZoom = (z: number) => Math.min(1.5, Math.max(0.4, Math.round(z * 10) / 10))
  const zoomBy = (delta: number) => setZoom((z) => clampZoom(z + delta))

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setWorkflow(null)
    setError(null)
    http
      .get<WorkflowDetail>(`/api/workflows/${id}`)
      .then((res) => {
        if (cancelled) return
        if (res.data) {
          setWorkflow(res.data)
        } else {
          setError(t('workflowBuilder.notFound', {}, { defaultValue: 'Workflow not found.' }))
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('workflowBuilder.error', {}, { defaultValue: 'Could not load workflow.' }),
        )
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t, reload])

  const handleTestRun = useCallback(async () => {
    if (!workflow) return
    setBusy('test')
    setActionMessage(null)
    try {
      const res = await http.post<{ id?: string }>(`/api/workflows/${workflow.id}/trigger`, {})
      const runId = res.data?.id
      track({
        name: 'workflow.executed',
        properties: { workflow_id: workflow.id, run_id: runId ?? null, trigger: 'manual' },
      })
      if (runId) {
        navigate(`/executions/${runId}`)
      } else {
        setActionMessage(t('workflowBuilder.testQueued', {}, { defaultValue: 'Test run queued.' }))
      }
    } catch (e) {
      setActionMessage(
        e instanceof Error
          ? e.message
          : t('workflowBuilder.testFailed', {}, { defaultValue: 'Test run failed.' }),
      )
    } finally {
      setBusy(null)
    }
  }, [workflow, http, navigate, t])

  const handleToggle = useCallback(async () => {
    if (!workflow) return
    setBusy('toggle')
    setActionMessage(null)
    try {
      await http.patch<{ enabled?: boolean }>(`/api/workflows/${workflow.id}/toggle`, {})
      track({
        name: 'workflow.toggled',
        properties: { workflow_id: workflow.id, enabled: !workflow.enabled },
      })
      setReload((n) => n + 1)
      setActionMessage(
        t('workflowBuilder.toggled', {}, { defaultValue: 'Workflow status updated.' }),
      )
    } catch (e) {
      setActionMessage(
        e instanceof Error
          ? e.message
          : t('workflowBuilder.toggleFailed', {}, { defaultValue: 'Toggle failed.' }),
      )
    } finally {
      setBusy(null)
    }
  }, [workflow, http, t])

  const handleSave = useCallback(async () => {
    if (!workflow) return
    setBusy('save')
    setActionMessage(null)
    try {
      await http.put<unknown>(`/api/workflows/${workflow.id}`, {
        name: workflow.name,
        description: workflow.description,
      })
      track({
        name: 'workflow.updated',
        properties: { workflow_id: workflow.id, trigger_type: workflow.trigger_type },
      })
      setReload((n) => n + 1)
      setActionMessage(t('workflowBuilder.saved', {}, { defaultValue: 'Draft saved.' }))
    } catch (e) {
      setActionMessage(
        e instanceof Error
          ? e.message
          : t('common.saveFailed', {}, { defaultValue: 'Save failed.' }),
      )
    } finally {
      setBusy(null)
    }
  }, [workflow, http, t])

  if (error && !workflow) {
    return (
      <WorkflowAppShell
        pageId="workflow-builder"
        title={t('workflowBuilder.title', {}, { defaultValue: 'Workflow builder' })}
      >
        <div
          role="alert"
          data-mol-id="workflowbuilder-error"
          className={cm.cn(cm.sp('p', 4), cm.textSize('sm'), 'rounded-xl')}
          style={{
            background: 'var(--color-status-error-bg)',
            color: 'var(--color-status-error-fg)',
          }}
        >
          {error}
        </div>
        <Link
          to="/workflows"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'inline-block',
          )}
          style={{ color: 'var(--color-accent-violet)' }}
        >
          {t('workflowBuilder.backToList', {}, { defaultValue: 'Back to workflows' })}
        </Link>
      </WorkflowAppShell>
    )
  }

  if (!workflow) {
    return (
      <WorkflowAppShell
        pageId="workflow-builder"
        title={t('workflowBuilder.title', {}, { defaultValue: 'Workflow builder' })}
      >
        <div
          className={cm.cn(cm.sp('p', 12), cm.textCenter, cm.textMuted)}
          data-mol-id="workflowbuilder-loading"
        >
          {t('workflowBuilder.loading', {}, { defaultValue: 'Loading workflow…' })}
        </div>
      </WorkflowAppShell>
    )
  }

  const layout = layoutNodes(workflow)
  const selected = layout.find((n) => n.id === selectedNodeId) ?? layout[0]
  const selectedStep =
    selected && selected.index >= 0 ? (workflow.steps ?? [])[selected.index] : undefined
  const selectedConfig = parseConfig(selectedStep?.config)
  const canvasW = Math.max(900, layout.length * 340)
  const canvasH = 360

  return (
    <WorkflowAppShell
      pageId="workflow-builder"
      flush
      title={t('workflowBuilder.title', {}, { defaultValue: 'Workflow builder' })}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] lg:h-[calc(100vh-64px)]">
        {/* Canvas pane — toolbar pinned, dotted world pans/zooms inside */}
        <div
          className="relative flex flex-col lg:h-full h-[60vh]"
          style={{ background: 'var(--color-canvas, var(--color-text))' }}
        >
          {/* Toolbar */}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              'flex-wrap',
              cm.sp('px', 3),
              'md:px-6',
              cm.sp('py', 3),
              'sticky top-0 z-10 backdrop-blur-md',
            )}
            style={{
              background: 'var(--color-panel-bg)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0 shrink')}>
              <Link
                to="/workflows"
                aria-label={t('common.back', {}, { defaultValue: 'Back' })}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  'h-9',
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'rounded-full uppercase tracking-widest shrink-0',
                )}
                style={{
                  background: 'var(--color-surface)',
                  color: 'var(--color-foreground-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span className={'material-symbols-outlined text-base'}>arrow_back</span>
                <span className="hidden sm:inline">
                  {t('common.back', {}, { defaultValue: 'Back' })}
                </span>
              </Link>
              <div className="min-w-0">
                <div
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest truncate',
                  )}
                  style={{ color: 'var(--color-secondary)' }}
                >
                  {t(
                    'workflowBuilder.workflow',
                    { v: workflow.version ?? 1 },
                    { defaultValue: 'Workflow · v{{v}}' },
                  )}
                </div>
                <h1
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('bold'),
                    'tracking-tight truncate max-w-[40vw] sm:max-w-none',
                  )}
                >
                  {workflow.name}
                </h1>
              </div>
              <WorkflowStatusBadge status={statusFromWorkflow(workflow)} size="sm" />
            </div>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap shrink-0')}>
              <ToolbarButton
                icon="bug_report"
                label={t('workflowBuilder.test', {}, { defaultValue: 'Test run' })}
                onClick={() => void handleTestRun()}
                disabled={busy !== null}
                molId="workflowbuilder-test"
              />
              <ToolbarButton
                icon="save"
                label={t('common.saveDraft', {}, { defaultValue: 'Save draft' })}
                onClick={() => void handleSave()}
                disabled={busy !== null}
                molId="workflowbuilder-save"
              />
              <button
                type="button"
                onClick={() => void handleToggle()}
                disabled={busy !== null}
                data-mol-id="workflowbuilder-toggle"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-full text-white shadow-md transition-all hover:-translate-y-0.5',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-node-trigger), var(--color-node-condition))',
                  boxShadow:
                    '0 4px 12px color-mix(in srgb, var(--color-node-trigger) 30%, transparent)',
                  opacity: busy !== null ? 0.7 : 1,
                }}
              >
                <span className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}>
                  {workflow.enabled ? 'pause' : 'publish'}
                </span>
                {workflow.enabled
                  ? t('workflowBuilder.disable', {}, { defaultValue: 'Disable' })
                  : t('workflowBuilder.enable', {}, { defaultValue: 'Enable' })}
              </button>
            </div>
          </div>

          {actionMessage && (
            <div
              role="status"
              data-mol-id="workflowbuilder-message"
              className={cm.cn(
                cm.sp('p', 3),
                cm.sp('mx', 6),
                cm.sp('mt', 3),
                cm.textSize('sm'),
                'rounded-xl',
              )}
              style={{
                background: 'var(--color-surface-hover)',
                color: 'var(--color-feedback-success-text)',
              }}
            >
              {actionMessage}
            </div>
          )}

          {/* Pannable/zoomable canvas area */}
          <div className="relative flex-1 min-h-0">
            <div className="absolute inset-0 overflow-auto">
              {/* Dotted grid + nodes — scaled world inside a scroll-honest sizer */}
              <div
                className="relative"
                style={{ width: (canvasW + 80) * zoom, height: (canvasH + 80) * zoom }}
              >
                <div
                  className="relative origin-top-left"
                  style={{
                    width: canvasW + 80,
                    minHeight: canvasH + 80,
                    transform: `scale(${zoom})`,
                    backgroundImage:
                      'radial-gradient(var(--color-canvas-dot) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                >
                  {/* Bezier connection layer */}
                  {layout.length > 1 && (
                    <svg
                      className="absolute inset-0 pointer-events-none"
                      width={canvasW + 80}
                      height={canvasH + 80}
                      style={{ overflow: 'visible' }}
                    >
                      <defs>
                        <marker
                          id="arrow"
                          markerWidth="8"
                          markerHeight="8"
                          refX="6"
                          refY="4"
                          orient="auto"
                        >
                          <path d="M0,0 L0,8 L6,4 z" fill="var(--color-accent-violet-light)" />
                        </marker>
                      </defs>
                      {layout.slice(0, -1).map((from, i) => {
                        const to = layout[i + 1]
                        const a = { x: from.x + 280 + 40, y: from.y + 80 }
                        const b = { x: to.x + 40, y: to.y + 80 }
                        const midX = (a.x + b.x) / 2
                        const path = `M${a.x},${a.y} C${midX},${a.y} ${midX},${b.y} ${b.x},${b.y}`
                        return (
                          <path
                            key={`${from.id}-${to.id}`}
                            d={path}
                            fill="none"
                            stroke="var(--color-accent-violet-light)"
                            strokeWidth={2}
                            markerEnd="url(#arrow)"
                          />
                        )
                      })}
                    </svg>
                  )}

                  {/* Nodes */}
                  {layout.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => setSelectedNodeId(node.id)}
                      data-mol-id={`workflowbuilder-node-${node.id}`}
                      className="absolute text-left"
                      style={{ left: node.x + 40, top: node.y + 40 }}
                    >
                      <WorkflowNode
                        kind={node.kind}
                        icon={node.icon}
                        title={node.title}
                        subtitle={node.subtitle}
                        selected={selectedNodeId === node.id}
                      />
                    </button>
                  ))}

                  {layout.length === 1 && (
                    <div
                      className={cm.cn(cm.sp('p', 6), 'absolute')}
                      style={{ left: 380, top: 80 }}
                    >
                      <p
                        className={cm.cn(cm.textSize('sm'), cm.textMuted)}
                        data-mol-id="workflowbuilder-no-steps"
                      >
                        {t(
                          'workflowBuilder.noSteps',
                          {},
                          { defaultValue: 'No steps yet — install a template to seed steps.' },
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Zoom controls (mind-mapping's proven canvas-controls cluster) */}
            <div
              className="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-full px-1 py-1 backdrop-blur-md"
              style={{
                background: 'color-mix(in srgb, var(--color-panel-bg) 85%, transparent)',
                border: '1px solid var(--color-border)',
              }}
              role="group"
              aria-label={t(
                'workflowBuilder.zoom.label',
                {},
                { defaultValue: 'Canvas zoom controls' },
              )}
            >
              <button
                type="button"
                onClick={() => zoomBy(-0.2)}
                aria-label={t('workflowBuilder.zoom.out', {}, { defaultValue: 'Zoom out' })}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-10 w-10 rounded-full cursor-pointer transition-colors hover:bg-surface',
                )}
                style={{ color: 'var(--color-foreground-secondary)' }}
              >
                <span className="material-symbols-outlined">zoom_out</span>
              </button>
              <span
                className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'w-10 text-center')}
                style={{ color: 'var(--color-foreground-secondary)' }}
                aria-live="polite"
              >
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => zoomBy(0.2)}
                aria-label={t('workflowBuilder.zoom.in', {}, { defaultValue: 'Zoom in' })}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-10 w-10 rounded-full cursor-pointer transition-colors hover:bg-surface',
                )}
                style={{ color: 'var(--color-foreground-secondary)' }}
              >
                <span className="material-symbols-outlined">zoom_in</span>
              </button>
            </div>
          </div>
        </div>

        {/* Inspector rail — side rail on desktop, stacked section on mobile */}
        <aside
          className="border-t lg:border-t-0 lg:border-l"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className={cm.cn(cm.sp('p', 6))}>
            <div
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest mb-2',
              )}
              style={{ color: 'var(--color-secondary)' }}
            >
              {t('workflowBuilder.inspector.eyebrow', {}, { defaultValue: 'Inspector' })}
            </div>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 2))}>
              <div
                className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'rounded-lg')}
                style={{
                  width: 32,
                  height: 32,
                  background:
                    selected?.kind === 'trigger'
                      ? 'var(--color-node-trigger)'
                      : selected?.kind === 'condition'
                        ? 'var(--color-node-condition)'
                        : 'var(--color-node-action)',
                }}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-lg')}
                  style={{ color: 'white', fontVariationSettings: "'FILL' 1" }}
                >
                  {selected?.icon ?? 'bolt'}
                </span>
              </div>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tracking-tight')}>
                {selected?.title ?? 'trigger'}
              </h2>
            </div>

            {/* Generic property fields */}
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), cm.sp('mt', 4))}>
              <Field
                label={t('form.kind', {}, { defaultValue: 'Kind' })}
                value={selected?.kind ?? '—'}
              />
              <Field
                label={t('workflowBuilder.inspector.id', {}, { defaultValue: 'Id' })}
                value={selected?.id ?? '—'}
                mono
              />
              {selectedStep && (
                <Field
                  label={t('form.type', {}, { defaultValue: 'Type' })}
                  value={selectedStep.type}
                  mono
                />
              )}
              {selected?.id === 'trigger' && (
                <>
                  <Field
                    label={t(
                      'workflowBuilder.inspector.trigger',
                      {},
                      { defaultValue: 'Trigger type' },
                    )}
                    value={workflow.trigger_type}
                    mono
                  />
                  {workflow.cron_expression && (
                    <Field
                      label={t(
                        'workflowBuilder.inspector.cron',
                        {},
                        { defaultValue: 'Cron expression' },
                      )}
                      value={workflow.cron_expression}
                      mono
                    />
                  )}
                </>
              )}
              {selectedStep && Object.keys(selectedConfig).length > 0 && (
                <div>
                  <label
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest block mb-1',
                    )}
                    style={{ color: 'var(--color-foreground-secondary)' }}
                  >
                    {t('workflowBuilder.inspector.config', {}, { defaultValue: 'Config' })}
                  </label>
                  <pre
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.textSize('xs'),
                      'rounded-lg font-mono overflow-x-auto',
                    )}
                    style={{
                      background: 'var(--color-background-secondary)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {JSON.stringify(selectedConfig, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Status footer */}
            <div className={cm.cn(cm.sp('mt', 8))}>
              <div
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest mb-3',
                )}
                style={{ color: 'var(--color-secondary)' }}
              >
                {t('workflowBuilder.inspector.status', {}, { defaultValue: 'Workflow status' })}
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <WorkflowStatusBadge status={statusFromWorkflow(workflow)} size="sm" />
                <span className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                  {workflow.enabled
                    ? t(
                        'workflowBuilder.inspector.enabled',
                        {},
                        { defaultValue: 'Enabled — runs on trigger.' },
                      )
                    : t(
                        'workflowBuilder.inspector.disabled',
                        {},
                        { defaultValue: 'Disabled — will not run automatically.' },
                      )}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </WorkflowAppShell>
  )
}

function ToolbarButton({
  icon,
  label,
  onClick,
  disabled,
  molId,
}: {
  icon: string
  label: string
  onClick: () => void
  disabled?: boolean
  molId?: string
}) {
  const cm = getClassMap()
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-mol-id={molId}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.sp('px', 3),
        cm.sp('py', 2),
        cm.textSize('xs'),
        cm.fontWeight('bold'),
        'rounded-full uppercase tracking-widest transition-colors',
      )}
      style={{
        background: 'var(--color-surface)',
        color: 'var(--color-foreground-secondary)',
        border: '1px solid var(--color-border)',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span className={cm.cn('material-symbols-outlined', cm.textSize('base'))}>{icon}</span>
      {label}
    </button>
  )
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const cm = getClassMap()
  return (
    <div>
      <label
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest block mb-1',
        )}
        style={{ color: 'var(--color-foreground-secondary)' }}
      >
        {label}
      </label>
      <div
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          'rounded-lg',
          mono ? 'font-mono' : '',
        )}
        style={{
          background: 'var(--color-background-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        {value}
      </div>
    </div>
  )
}

export default WorkflowBuilder
