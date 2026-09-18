import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EngramMetricTile } from '../components/EngramMetricTile.js'
import { unwrapList } from '../lib/unwrap.js'

interface GraphNode {
  id: string
  label: string
  cluster: string
  degree: number
  x: number
  y: number
  r: number
}

interface GraphEdge {
  id: string
  from_doc_id: string
  to_doc_id: string
  weight: number | string
  kind: string
}

const FALLBACK_PALETTE = [
  '#5b47e0',
  '#0891b2',
  '#16a34a',
  '#dc2626',
  '#e6a817',
  '#8b5cf6',
  '#ec4899',
  '#10b981',
  '#f97316',
  '#3b82f6',
]

function colorForCluster(cluster: string, palette: Record<string, string>): string {
  if (palette[cluster]) return palette[cluster]
  let hash = 0
  for (let i = 0; i < cluster.length; i++) {
    hash = (hash * 31 + cluster.charCodeAt(i)) >>> 0
  }
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length]
}

export function KnowledgeGraph() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [nodes, setNodes] = useState<GraphNode[] | null>(null)
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeCluster, setActiveCluster] = useState<string>('all')

  useEffect(() => {
    let cancelled = false
    setError(null)
    Promise.all([
      http.get('/api/graph/nodes').catch(() => null),
      http.get('/api/graph/edges').catch(() => null),
    ])
      .then(([nodesRes, edgesRes]) => {
        if (cancelled) return
        const fetchedNodes = unwrapList<GraphNode>(nodesRes)
        const fetchedEdges = unwrapList<GraphEdge>(edgesRes)
        setNodes(fetchedNodes)
        setEdges(fetchedEdges)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t('graph.error', {}, { defaultValue: 'Failed to load knowledge graph.' }),
        )
        setNodes([])
        setEdges([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const clusters = useMemo(() => {
    if (!nodes) return []
    return Array.from(new Set(nodes.map((n) => n.cluster))).sort()
  }, [nodes])

  const palette = useMemo(() => {
    const map: Record<string, string> = {}
    clusters.forEach((c, i) => {
      map[c] = FALLBACK_PALETTE[i % FALLBACK_PALETTE.length]
    })
    return map
  }, [clusters])

  const filteredNodeIds = useMemo(() => {
    if (!nodes) return new Set<string>()
    if (activeCluster === 'all') return new Set(nodes.map((n) => n.id))
    return new Set(nodes.filter((n) => n.cluster === activeCluster).map((n) => n.id))
  }, [nodes, activeCluster])

  const orphanCount = useMemo(() => {
    if (!nodes || !nodes.length) return 0
    const connected = new Set<string>()
    edges.forEach((e) => {
      connected.add(e.from_doc_id)
      connected.add(e.to_doc_id)
    })
    return nodes.filter((n) => !connected.has(n.id)).length
  }, [nodes, edges])

  if (nodes === null) {
    return (
      <p
        data-testid="graph-loading"
        className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}
      >
        {t('graph.loading', {}, { defaultValue: 'Loading knowledge graph\u2026' })}
      </p>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-primary font-bold')}
          style={{ fontSize: 10 }}
        >
          {t('graph.eyebrow', {}, { defaultValue: 'Semantic graph' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('graph.heading', {}, { defaultValue: 'Knowledge graph' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'graph.subheading',
            {},
            {
              defaultValue:
                'Each node is a document; edges connect docs whose chunks are co-cited or semantically near each other.',
            },
          )}
        </p>
        {error ? (
          <p
            data-testid="graph-error"
            className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
          >
            {error}
          </p>
        ) : null}
      </header>

      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 sm:grid-cols-4')}>
        <EngramMetricTile
          label={t('graph.metric.nodes', {}, { defaultValue: 'Nodes' })}
          value={nodes.length.toLocaleString()}
          icon="hub"
          tone="primary"
        />
        <EngramMetricTile
          label={t('graph.metric.edges', {}, { defaultValue: 'Edges' })}
          value={edges.length.toLocaleString()}
          icon="timeline"
          tone="info"
        />
        <EngramMetricTile
          label={t('graph.metric.clusters', {}, { defaultValue: 'Clusters' })}
          value={clusters.length.toLocaleString()}
          icon="dataset"
          tone="cited"
        />
        <EngramMetricTile
          label={t('graph.metric.orphans', {}, { defaultValue: 'Orphan docs' })}
          value={orphanCount.toLocaleString()}
          icon="link_off"
          tone="warning"
          caption={t('graph.metric.orphansCaption', {}, { defaultValue: 'No co-citations yet' })}
        />
      </section>

      {nodes.length === 0 ? (
        <p
          data-testid="graph-empty"
          className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}
        >
          {t(
            'graph.empty',
            {},
            {
              defaultValue: 'Upload documents to start building your knowledge graph.',
            },
          )}
        </p>
      ) : (
        <>
          <div className={cm.flex({ wrap: 'wrap', gap: 'xs' })}>
            <button
              type="button"
              onClick={() => setActiveCluster('all')}
              data-testid="graph-cluster-all"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                'rounded-full font-bold uppercase tracking-widest transition-all',
                activeCluster === 'all'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface',
              )}
              style={{ fontSize: 11 }}
            >
              {t('graph.cluster.all', {}, { defaultValue: 'All clusters' })}
            </button>
            {clusters.map((c) => {
              const active = activeCluster === c
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveCluster(c)}
                  data-testid={`graph-cluster-${c}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('xs'),
                    'rounded-full font-bold uppercase tracking-widest transition-all',
                    active
                      ? 'text-white'
                      : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface',
                  )}
                  style={{
                    fontSize: 11,
                    background: active ? colorForCluster(c, palette) : undefined,
                  }}
                >
                  <span
                    className={cm.cn('w-2 h-2 rounded-full')}
                    style={{ background: colorForCluster(c, palette) }}
                    aria-hidden="true"
                  />
                  {c}
                </button>
              )
            })}
          </div>

          <div
            data-testid="graph-svg-wrapper"
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-3xl relative overflow-hidden border border-outline-variant/30 shadow-md',
            )}
            style={{
              background:
                'radial-gradient(circle at 30% 20%, var(--color-bg-card), var(--color-bg) 70%)',
            }}
          >
            <svg
              viewBox="0 0 800 500"
              className={cm.cn(cm.w('full'), 'block')}
              role="img"
              aria-label={t('graph.svgAria', {}, { defaultValue: 'Knowledge graph visualization' })}
            >
              <defs>
                <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="white" stopOpacity="0.6" />
                  <stop offset="80%" stopColor="white" stopOpacity="0" />
                </radialGradient>
              </defs>

              {edges.map((edge, i) => {
                const a = nodes.find((n) => n.id === edge.from_doc_id)
                const b = nodes.find((n) => n.id === edge.to_doc_id)
                if (!a || !b) return null
                const dim = !filteredNodeIds.has(a.id) || !filteredNodeIds.has(b.id)
                return (
                  <line
                    key={`e${i}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="var(--color-graph-edge)"
                    strokeOpacity={dim ? 0.05 : 0.25}
                    strokeWidth={1}
                  />
                )
              })}

              {nodes.map((n) => {
                const dim = !filteredNodeIds.has(n.id)
                const color = colorForCluster(n.cluster, palette)
                return (
                  <g key={n.id} opacity={dim ? 0.18 : 1} data-testid={`graph-node-${n.id}`}>
                    <circle cx={n.x} cy={n.y} r={n.r * 1.6} fill="url(#node-glow)" opacity={0.55} />
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={n.r}
                      fill={color}
                      stroke="white"
                      strokeOpacity={0.45}
                      strokeWidth={1.5}
                    />
                    <text
                      x={n.x}
                      y={n.y + n.r + 14}
                      textAnchor="middle"
                      fill="var(--color-graph-label)"
                      fontSize={11}
                      fontWeight={600}
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {n.label}
                    </text>
                  </g>
                )
              })}
            </svg>

            <div
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                'absolute bottom-4 left-4 rounded-full bg-surface/10 text-white/80 text-xs font-semibold backdrop-blur-md flex items-center gap-2',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined')}
                style={{ fontSize: 14 }}
                aria-hidden="true"
              >
                explore
              </span>
              {t(
                'graph.legend',
                {},
                { defaultValue: 'Click a cluster filter to highlight related documents' },
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
