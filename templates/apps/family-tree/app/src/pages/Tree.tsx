import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PersonCard } from '../components/PersonCard.js'
import { displayName, type TreePayload } from '../lib/people.js'
import { unwrapSingle } from '../lib/unwrap.js'

/** Layout constants — must match the SVG connector geometry below. */
const CARD_W = 176
const CARD_H = 132
const GAP_X = 40
const GAP_Y = 84
const X_STEP = CARD_W + GAP_X
const Y_STEP = CARD_H + GAP_Y
const PAD = 40
const MIN_ZOOM = 0.4
const MAX_ZOOM = 1.6

export function Tree() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [tree, setTree] = useState<TreePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [rootId, setRootId] = useState<string | undefined>(undefined)
  const [zoom, setZoom] = useState(1)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [pan, setPanState] = useState({ x: 0, y: 0 })
  const panRef = useRef({ x: 0, y: 0 })
  const setPan = useCallback((p: { x: number; y: number }) => {
    panRef.current = p
    setPanState(p)
  }, [])
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const qs = rootId ? `?root=${encodeURIComponent(rootId)}` : ''
    http
      .get(`/api/tree${qs}`)
      .then((res) => {
        if (cancelled) return
        setTree(unwrapSingle<TreePayload>(res) ?? null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t('tree.loadError', {}, { defaultValue: 'Failed to load the tree.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootId, reload])

  const nodes = useMemo(() => tree?.nodes ?? [], [tree])
  const edges = useMemo(() => tree?.edges ?? [], [tree])

  const world = useMemo(() => {
    let maxX = 0
    let maxGen = 0
    for (const n of nodes) {
      maxX = Math.max(maxX, n.x)
      maxGen = Math.max(maxGen, n.generation)
    }
    return {
      width: PAD * 2 + (maxX + 1) * X_STEP,
      height: PAD * 2 + (maxGen + 1) * Y_STEP,
    }
  }, [nodes])

  const pos = useMemo(() => {
    const map = new Map<
      string,
      { left: number; top: number; centerX: number; topY: number; bottomY: number; midY: number }
    >()
    for (const n of nodes) {
      const left = PAD + n.x * X_STEP
      const top = PAD + n.generation * Y_STEP
      map.set(n.id, {
        left,
        top,
        centerX: left + CARD_W / 2,
        topY: top,
        bottomY: top + CARD_H,
        midY: top + CARD_H / 2,
      })
    }
    return map
  }, [nodes])

  const connectors = useMemo(() => {
    const out: Array<{ d: string; kind: 'parent' | 'partner'; key: string }> = []
    for (const e of edges) {
      const from = pos.get(e.fromId)
      const to = pos.get(e.toId)
      if (!from || !to) continue
      if (e.kind === 'parent') {
        // child (fromId) top-center → parent (toId) bottom-center, elbow route
        const midY = (from.topY + to.bottomY) / 2
        out.push({
          key: `${e.fromId}->${e.toId}`,
          kind: 'parent',
          d: `M ${from.centerX} ${from.topY} V ${midY} H ${to.centerX} V ${to.bottomY}`,
        })
      } else {
        // horizontal line between the two cards' facing edges
        const a = from.centerX <= to.centerX ? from : to
        const b = from.centerX <= to.centerX ? to : from
        out.push({
          key: `${e.fromId}--${e.toId}`,
          kind: 'partner',
          d: `M ${a.left + CARD_W} ${a.midY} H ${b.left}`,
        })
      }
    }
    return out
  }, [edges, pos])

  // After each (re)load, bring the root person into view: horizontally
  // centered, eldest generation at the top. Without this the canvas opens on
  // the top-left corner of the world — on a phone that is a single card with
  // no context and no hint that the rest is out there.
  useEffect(() => {
    const el = canvasRef.current
    const p = tree && tree.rootId ? pos.get(tree.rootId) : null
    if (!el || !p) return
    setPan({ x: el.clientWidth / 2 - p.centerX * zoom, y: 24 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: panRef.current.x,
      baseY: panRef.current.y,
    }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (!drag) return
      setPan({
        x: drag.baseX + (e.clientX - drag.startX),
        y: drag.baseY + (e.clientY - drag.startY),
      })
    },
    [setPan],
  )

  const onPointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8))} data-mol-id="page-tree">
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      </div>
    )
  }

  if (error || !tree) {
    return (
      <div className={cm.cn(cm.sp('p', 8))} data-mol-id="page-tree">
        <div
          className={cm.cn(
            cm.sp('py', 8),
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          )}
        >
          <p className="text-error font-bold">{error}</p>
          <button
            type="button"
            data-mol-id="tree-retry"
            onClick={() => setReload((n) => n + 1)}
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-lg border border-outline-variant/50 bg-surface-container-lowest hover:bg-surface-container transition-colors',
            )}
          >
            {t('common.retry', {}, { defaultValue: 'Try again' })}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('p', 6), 'lg:p-8')} data-mol-id="page-tree">
      {/* Toolbar */}
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 4),
        )}
      >
        <div>
          <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('tree.title', {}, { defaultValue: 'Family tree' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'tree.stats',
              { people: tree.stats.people, generations: tree.stats.generations },
              { defaultValue: '{{people}} people · {{generations}} generations' },
            )}
          </p>
        </div>
        {/* Wrap at every level: on a 390px screen the unwrapped controls row
            overflowed off-screen (zoom-in/reset/Add person were unreachable). */}
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
          <button
            type="button"
            data-mol-id="tree-zoom-out"
            aria-label={t('tree.zoomOut', {}, { defaultValue: 'Zoom out' })}
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, Math.round((z - 0.2) * 10) / 10))}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-lg bg-surface-container-lowest border border-outline-variant/40 hover:bg-surface-container transition-colors',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              zoom_out
            </span>
          </button>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              'tabular-nums text-on-surface-variant w-12 text-center',
            )}
            data-mol-id="tree-zoom-level"
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            data-mol-id="tree-zoom-in"
            aria-label={t('tree.zoomIn', {}, { defaultValue: 'Zoom in' })}
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, Math.round((z + 0.2) * 10) / 10))}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-lg bg-surface-container-lowest border border-outline-variant/40 hover:bg-surface-container transition-colors',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              zoom_in
            </span>
          </button>
          <button
            type="button"
            data-mol-id="tree-zoom-reset"
            onClick={() => {
              setZoom(1)
              const el = canvasRef.current
              const p = tree.rootId ? pos.get(tree.rootId) : null
              if (el && p) setPan({ x: el.clientWidth / 2 - p.centerX, y: 24 })
              else setPan({ x: 0, y: 0 })
            }}
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-lg bg-surface-container-lowest border border-outline-variant/40 hover:bg-surface-container transition-colors',
            )}
          >
            {t('tree.resetView', {}, { defaultValue: 'Reset view' })}
          </button>
          <Link
            to="/people/new"
            data-mol-id="tree-add-person"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'text-white rounded-lg hover:shadow-lg transition-all',
            )}
            style={{ background: 'linear-gradient(135deg, #15803d, #65a30d)' }}
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              person_add
            </span>
            {t('tree.addPerson', {}, { defaultValue: 'Add person' })}
          </Link>
        </div>
      </div>

      {nodes.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 12),
            'rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/60 text-center',
          )}
        >
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), cm.sp('mb', 2))}>
            {t('tree.empty.title', {}, { defaultValue: 'Your tree starts with one person.' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 6))}>
            {t(
              'tree.empty.body',
              {},
              {
                defaultValue:
                  'Add yourself, then a parent or a partner — the branches grow from there.',
              },
            )}
          </p>
          <Link
            to="/people/new"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.sp('px', 6),
              cm.sp('py', 3),
              'text-white rounded-xl inline-block',
            )}
            style={{ background: 'linear-gradient(135deg, #15803d, #65a30d)' }}
          >
            {t('tree.addFirstPerson', {}, { defaultValue: 'Add the first person' })}
          </Link>
        </div>
      ) : (
        <div
          className={cm.cn(
            'relative overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest',
            'touch-none select-none cursor-grab active:cursor-grabbing',
          )}
          style={{ height: '70vh' }}
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          data-mol-id="tree-canvas"
        >
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            <svg
              width={world.width}
              height={world.height}
              className="absolute top-0 left-0 pointer-events-none"
              data-mol-id="tree-connectors"
              aria-hidden="true"
            >
              {connectors.map((c) => (
                <path
                  key={c.key}
                  d={c.d}
                  fill="none"
                  strokeWidth={2}
                  strokeLinecap="round"
                  stroke={
                    c.kind === 'partner'
                      ? 'var(--color-tree-partner)'
                      : 'var(--color-tree-connector)'
                  }
                  strokeDasharray={c.kind === 'partner' ? '6 4' : undefined}
                />
              ))}
            </svg>
            {nodes.map((n) => {
              const p = pos.get(n.id)
              if (!p) return null
              return (
                <div
                  key={n.id}
                  className="absolute"
                  style={{ left: p.left, top: p.top, width: CARD_W }}
                >
                  <PersonCard person={n.person} isRoot={n.id === tree.rootId} variant="tree" />
                  <button
                    type="button"
                    data-mol-id={`tree-reroot-${n.id}`}
                    aria-label={t(
                      'tree.reroot',
                      { name: displayName(n.person) },
                      { defaultValue: 'Show tree from {{name}}' },
                    )}
                    title={t(
                      'tree.reroot',
                      { name: displayName(n.person) },
                      { defaultValue: 'Show tree from {{name}}' },
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      setRootId(n.id)
                      setZoom(1)
                      // Panning is handled by the center-on-root effect that
                      // runs after the refetch lands.
                    }}
                    className={cm.cn(
                      // 28px visual + a ::before extending the hit area to
                      // ~44px — the 24px original failed the mobile tap-target
                      // floor (×14 cards on screen).
                      'absolute -top-2 -right-2 w-7 h-7 rounded-full bg-surface border border-outline-variant/60 shadow-sm flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors',
                      "before:content-[''] before:absolute before:-inset-1.5 before:rounded-full",
                    )}
                  >
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">
                      my_location
                    </span>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default Tree
