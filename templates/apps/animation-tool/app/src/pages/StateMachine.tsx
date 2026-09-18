import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AnimationToolLayout } from '../components/AnimationToolLayout.js'
import { KeyframeTimelineMini } from '../components/KeyframeTimelineMini.js'
import { StatusPill } from '../components/StatusPill.js'

interface ApiState {
  id: string
  project_id: string
  name: string
  is_initial: boolean
  transitions?: unknown
  animation_id?: string | null
  created_at?: string
}

interface NodeDef {
  id: string
  label: string
  x: number
  y: number
  state: 'idle' | 'active' | 'transition'
}

interface EdgeDef {
  id: string
  from: string
  to: string
  trigger: string
}

const STATE_COLOR: Record<NodeDef['state'], string> = {
  idle: 'var(--anim-text-muted)',
  active: 'var(--anim-secondary)',
  transition: 'var(--anim-accent)',
}

function deriveStateClass(name: string, isInitial: boolean): NodeDef['state'] {
  if (isInitial) return 'idle'
  if (/active|press|click|on/i.test(name)) return 'active'
  return 'transition'
}

function layoutNodes(states: ApiState[]): NodeDef[] {
  if (states.length === 0) return []
  const cols = Math.max(2, Math.ceil(Math.sqrt(states.length)))
  return states.map((s, idx) => {
    const col = idx % cols
    const row = Math.floor(idx / cols)
    return {
      id: s.id,
      label: s.name,
      x: 60 + col * 180,
      y: 60 + row * 110,
      state: deriveStateClass(s.name, s.is_initial),
    }
  })
}

function deriveEdges(states: ApiState[]): EdgeDef[] {
  // Each state's transitions JSON column may hold {to, trigger} pairs;
  // the runtime stores stringified JSON or arrays, so we tolerate both.
  const edges: EdgeDef[] = []
  for (const s of states) {
    const raw = s.transitions
    let parsed: unknown = raw
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw)
      } catch (_error) {
        // Malformed JSON in the transitions column — fall back to no edges for this state
        parsed = null
      }
    }
    if (Array.isArray(parsed)) {
      parsed.forEach((entry, idx) => {
        if (entry && typeof entry === 'object') {
          const e = entry as { to?: string; trigger?: string }
          if (e.to) {
            edges.push({
              id: `${s.id}-${idx}`,
              from: s.id,
              to: e.to,
              trigger: e.trigger ?? 'on:next',
            })
          }
        }
      })
    }
  }
  return edges
}

export function StateMachine() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [view, setView] = useState<'timeline' | 'states'>('states')
  const [states, setStates] = useState<ApiState[] | null>(null)
  const [statesError, setStatesError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setStates(null)
    setStatesError(null)
    http
      .get<ApiState[] | { data: ApiState[] }>(`/api/states?projectId=${encodeURIComponent(id)}`)
      .then((res) => {
        if (cancelled) return
        const arr = Array.isArray(res.data)
          ? (res.data as ApiState[])
          : ((res.data as { data?: ApiState[] }).data ?? [])
        setStates(arr)
        if (arr.length > 0) setSelectedNode(arr[0]!.id)
      })
      .catch(() => {
        if (cancelled) return
        setStatesError(t('stateMachine.fetchError', {}, { defaultValue: 'Could not load states.' }))
        setStates([])
      })
    return () => {
      cancelled = true
    }
  }, [id, http, t])

  async function handleCreateState() {
    if (!id || creating) return
    setCreating(true)
    // Always POST — never paper over the click with a local-only placeholder.
    // The first state on a new project must persist (and become initial),
    // otherwise the state machine is a useState mockup.
    try {
      const isInitial = (states ?? []).length === 0
      const res = await http.post<ApiState>('/api/states', {
        projectId: id,
        name: t('stateMachine.newStateName', {}, { defaultValue: 'New state' }),
        isInitial,
      })
      const created = res.data as ApiState | null
      if (created && 'id' in created) {
        setStates((prev) => (prev ? [...prev, created] : [created]))
        setSelectedNode(created.id)
        setStatesError(null)
      } else {
        setStatesError(
          t('stateMachine.createError', {}, { defaultValue: 'Could not create state.' }),
        )
      }
    } catch (error) {
      logError('stateMachine.createState', error)
      setStatesError(t('stateMachine.createError', {}, { defaultValue: 'Could not create state.' }))
    } finally {
      setCreating(false)
    }
  }

  const nodes = states ? layoutNodes(states) : []
  const edges = states ? deriveEdges(states) : []
  const selected = nodes.find((n) => n.id === selectedNode) ?? nodes[0] ?? null
  const selectedState = states?.find((s) => s.id === selected?.id) ?? null

  const nodeXY = (nodeId: string) => {
    const n = nodes.find((it) => it.id === nodeId)
    if (!n) return { x: 0, y: 0 }
    return { x: n.x + 70, y: n.y + 24 }
  }

  return (
    <AnimationToolLayout
      title={t('stateMachine.title', {}, { defaultValue: 'State machine' })}
      breadcrumb={t(
        'stateMachine.crumb',
        { view },
        { defaultValue: '// projects › states · {{view}}' },
      )}
      toolbar={
        <div
          className={cm.cn(
            cm.flex({ gap: 1 }),
            'rounded-full p-1 bg-[var(--anim-surface)] border border-[var(--anim-border)]',
          )}
        >
          {(['timeline', 'states'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              data-mol-id={`view-${v}`}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                'rounded-full font-mono uppercase tracking-widest transition-all',
                view === v
                  ? 'bg-gradient-to-r from-[var(--anim-primary)] to-[var(--anim-secondary)] text-white'
                  : 'text-[var(--anim-text-secondary)] hover:text-[var(--anim-primary)]',
              )}
            >
              {v}
            </button>
          ))}
        </div>
      }
      fullBleed
    >
      <div className={cm.cn(cm.flex({ direction: 'row' }), 'h-full')}>
        <aside
          className={cm.cn(
            cm.sp('p', 4),
            cm.stack(4),
            'w-[260px] border-r border-[var(--anim-border)] bg-[var(--anim-surface)]/60 overflow-y-auto',
          )}
        >
          <h3
            className={cm.cn(
              'font-mono text-[10px] uppercase tracking-widest text-[var(--anim-text-secondary)]',
            )}
          >
            {t('stateMachine.states', {}, { defaultValue: 'States' })}
          </h3>
          {states === null ? (
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'text-[var(--anim-text-secondary)] font-mono uppercase tracking-widest',
              )}
            >
              {t('stateMachine.loading', {}, { defaultValue: 'Loading states…' })}
            </p>
          ) : statesError ? (
            <p
              role="alert"
              className={cm.cn(cm.textSize('xs'), 'text-[var(--anim-danger)] font-mono')}
            >
              {statesError}
            </p>
          ) : nodes.length === 0 ? (
            <p className={cm.cn(cm.textSize('xs'), 'text-[var(--anim-text-secondary)]')}>
              {t('stateMachine.empty', {}, { defaultValue: 'No states yet — add the first.' })}
            </p>
          ) : (
            <ul className={cm.stack(1)}>
              {nodes.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedNode(n.id)}
                    data-mol-id={`state-${n.id}`}
                    className={cm.cn(
                      cm.w('full'),
                      cm.flex({ align: 'center', gap: 2 }),
                      cm.sp('px', 2),
                      cm.sp('py', 2),
                      'rounded-md transition-colors',
                      selectedNode === n.id
                        ? 'bg-[color-mix(in_srgb,var(--anim-primary)_15%,transparent)] text-[var(--anim-primary)] border-l-2 border-[var(--anim-primary)]'
                        : 'text-[var(--anim-text-secondary)] hover:bg-[var(--anim-surface-elevated)] hover:text-[var(--anim-text)]',
                    )}
                  >
                    <span
                      className={cm.cn('w-2 h-2 rounded-full')}
                      style={{ background: STATE_COLOR[n.state] }}
                    />
                    <span className={cm.cn(cm.textSize('sm'))}>{n.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={handleCreateState}
            disabled={creating || !id}
            data-mol-id="state-add"
            className={cm.cn(
              cm.w('full'),
              cm.flex({ align: 'center', justify: 'center', gap: 1 }),
              cm.sp('py', 2),
              cm.textSize('xs'),
              'rounded-md border border-dashed border-[var(--anim-border)] text-[var(--anim-text-secondary)] hover:border-[color-mix(in_srgb,var(--anim-primary)_40%,transparent)] hover:text-[var(--anim-primary)] transition-colors disabled:opacity-50',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')}>add</span>
            {creating
              ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
              : t('stateMachine.add', {}, { defaultValue: 'Add state' })}
          </button>

          {edges.length > 0 ? (
            <>
              <h3
                className={cm.cn(
                  'font-mono text-[10px] uppercase tracking-widest text-[var(--anim-text-secondary)]',
                )}
              >
                {t('stateMachine.triggers', {}, { defaultValue: 'Triggers' })}
              </h3>
              <ul className={cm.cn(cm.stack(1), cm.textSize('xs'))}>
                {edges.map((e) => (
                  <li
                    key={e.id}
                    className={cm.cn(
                      'flex items-center gap-2 text-[var(--anim-text-secondary)] font-mono',
                    )}
                  >
                    <span
                      className={cm.cn(
                        'material-symbols-outlined text-[14px] text-[var(--anim-accent)]',
                      )}
                    >
                      bolt
                    </span>
                    <span className={cm.cn('truncate')}>{e.trigger}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </aside>

        <section
          className={cm.cn('flex-1 relative bg-[var(--anim-background)] overflow-auto')}
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--anim-primary) 15%, transparent) 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
        >
          {nodes.length === 0 ? (
            <div className={cm.cn('absolute inset-0 flex items-center justify-center text-center')}>
              <p className={cm.cn(cm.textSize('sm'), 'text-[var(--anim-text-secondary)]')}>
                {t(
                  'stateMachine.canvasEmpty',
                  {},
                  { defaultValue: 'Add a state from the sidebar to see it on the canvas.' },
                )}
              </p>
            </div>
          ) : view === 'timeline' ? (
            <div className={cm.cn(cm.sp('p', 6), cm.stack(4))}>
              <KeyframeTimelineMini
                caption={t(
                  'stateMachine.timelineCaption',
                  { count: nodes.length },
                  { defaultValue: '{{count}} states sequenced on the timeline.' },
                )}
              />
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${Math.max(600, nodes.length * 180)} ${Math.max(320, nodes.length * 60)}`}
              className={cm.cn('w-full h-full block min-h-[400px]')}
              aria-label={t('stateMachine.graphLabel', {}, { defaultValue: 'State machine graph' })}
            >
              <defs>
                <marker
                  id="arrow"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,6 L9,3 z" fill="var(--anim-accent)" />
                </marker>
              </defs>
              {edges.map((e) => {
                const a = nodeXY(e.from)
                const b = nodeXY(e.to)
                const cpX = (a.x + b.x) / 2
                const cpY = (a.y + b.y) / 2 - 30
                return (
                  <g key={e.id}>
                    <path
                      d={`M ${a.x} ${a.y} Q ${cpX} ${cpY} ${b.x} ${b.y}`}
                      fill="none"
                      stroke="var(--anim-accent)"
                      strokeWidth="2"
                      markerEnd="url(#arrow)"
                      opacity="0.7"
                    />
                    <rect
                      x={cpX - 36}
                      y={cpY - 12}
                      width="72"
                      height="20"
                      rx="4"
                      fill="var(--anim-surface)"
                      stroke="var(--anim-border)"
                    />
                    <text
                      x={cpX}
                      y={cpY + 2}
                      textAnchor="middle"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="10"
                      fill="var(--anim-primary)"
                    >
                      {e.trigger}
                    </text>
                  </g>
                )
              })}
              {nodes.map((n) => {
                const focused = n.id === selectedNode
                return (
                  <g key={n.id} onClick={() => setSelectedNode(n.id)} style={{ cursor: 'pointer' }}>
                    <rect
                      x={n.x}
                      y={n.y}
                      width="140"
                      height="48"
                      rx="8"
                      fill="var(--anim-surface-elevated)"
                      stroke={focused ? 'var(--anim-secondary)' : 'var(--anim-border)'}
                      strokeWidth={focused ? 2 : 1.5}
                    />
                    <circle cx={n.x + 130} cy={n.y + 10} r="4" fill={STATE_COLOR[n.state]} />
                    <text
                      x={n.x + 16}
                      y={n.y + 30}
                      fontFamily="Inter, sans-serif"
                      fontSize="14"
                      fontWeight="600"
                      fill="var(--anim-text)"
                    >
                      {n.label}
                    </text>
                  </g>
                )
              })}
            </svg>
          )}
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
              'font-mono text-[10px] uppercase tracking-widest text-[var(--anim-text-secondary)]',
            )}
          >
            {t('stateMachine.inspector', {}, { defaultValue: 'Inspector' })}
          </h3>
          {selected && selectedState ? (
            <>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                <span
                  className={cm.cn('w-3 h-3 rounded-full')}
                  style={{ background: STATE_COLOR[selected.state] }}
                />
                <h4
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('semibold'),
                    'text-[var(--anim-text)]',
                  )}
                >
                  {selected.label}
                </h4>
                <StatusPill status="ready" label={selected.state} />
              </div>
              <div
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.stack(2),
                  'rounded-lg bg-[var(--anim-background)] border border-[var(--anim-border)] text-xs',
                )}
              >
                <div
                  className={cm.cn(
                    'font-mono text-[10px] uppercase tracking-widest text-[var(--anim-primary)]',
                  )}
                >
                  {t('stateMachine.metadata', {}, { defaultValue: 'Metadata' })}
                </div>
                <div className={cm.cn('flex items-center justify-between')}>
                  <span className={cm.cn('text-[var(--anim-text-secondary)] font-mono')}>
                    {t('stateMachine.initial', {}, { defaultValue: 'Initial' })}
                  </span>
                  <span className={cm.cn('text-[var(--anim-text)] font-mono')}>
                    {selectedState.is_initial
                      ? t('common.yes', {}, { defaultValue: 'yes' })
                      : t('common.no', {}, { defaultValue: 'no' })}
                  </span>
                </div>
                <div className={cm.cn('flex items-center justify-between')}>
                  <span className={cm.cn('text-[var(--anim-text-secondary)] font-mono')}>
                    {t('stateMachine.animation', {}, { defaultValue: 'Animation' })}
                  </span>
                  <span
                    className={cm.cn('text-[var(--anim-text)] font-mono truncate max-w-[140px]')}
                  >
                    {selectedState.animation_id ?? '—'}
                  </span>
                </div>
              </div>
              <div
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.stack(2),
                  'rounded-lg bg-[var(--anim-background)] border border-[var(--anim-border)] text-xs',
                )}
              >
                <div
                  className={cm.cn(
                    'font-mono text-[10px] uppercase tracking-widest text-[var(--anim-primary)]',
                  )}
                >
                  {t('stateMachine.transitions', {}, { defaultValue: 'Transitions out' })}
                </div>
                {edges.filter((e) => e.from === selected.id).length === 0 ? (
                  <p className={cm.cn('text-[var(--anim-text-secondary)] text-xs')}>
                    {t('stateMachine.noTransitions', {}, { defaultValue: 'None defined.' })}
                  </p>
                ) : (
                  edges
                    .filter((e) => e.from === selected.id)
                    .map((e) => (
                      <div key={e.id} className={cm.cn('flex items-center justify-between')}>
                        <span className={cm.cn('text-[var(--anim-text)] font-mono')}>
                          → {nodes.find((n) => n.id === e.to)?.label ?? e.to}
                        </span>
                        <span className={cm.cn('text-[var(--anim-text-secondary)] font-mono')}>
                          {e.trigger}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </>
          ) : (
            <p className={cm.cn(cm.textSize('xs'), 'text-[var(--anim-text-secondary)]')}>
              {t('stateMachine.selectPrompt', {}, { defaultValue: 'Select a state to inspect.' })}
            </p>
          )}
        </aside>
      </div>
    </AnimationToolLayout>
  )
}

export default StateMachine
