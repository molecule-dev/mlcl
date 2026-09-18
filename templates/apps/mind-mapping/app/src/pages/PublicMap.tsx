import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

interface PublicNode {
  id: string
  parent_id: string | null
  text: string
  color: string
  x: number
  y: number
}

interface PublicConnection {
  id: string
  source_node_id: string
  target_node_id: string
}

interface PublicMapDetail {
  id: string
  title: string
  description: string | null
  nodes: PublicNode[]
  connections: PublicConnection[]
}

const NODE_W = 140
const NODE_H = 56

const toNumber = (v: unknown, fallback: number): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : fallback
}

/**
 * Anonymous read-only viewer for publicly shared maps. This is the page the
 * Share screen's minted `/public/:slug` link resolves to — it hydrates from
 * the unauthenticated `GET /maps/public/:slug` endpoint and renders the same
 * canvas as the editor, without any editing affordances.
 */
export function PublicMap() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { slug } = useParams<{ slug: string }>()
  const [map, setMap] = useState<PublicMapDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    http
      .get<PublicMapDetail>(`/maps/public/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (cancelled) return
        setMap(res?.data ?? null)
        setError(null)
      })
      .catch((error) => {
        if (cancelled) return
        logError('publicMap.load', error)
        setError(
          t(
            'publicMap.loadError',
            {},
            { defaultValue: 'This map is no longer shared, or the link is invalid.' },
          ),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, slug, t])

  const nodes = (map?.nodes ?? []).map((n) => ({
    ...n,
    x: toNumber(n.x, 0),
    y: toNumber(n.y, 0),
  }))
  const connections = map?.connections ?? []

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface text-on-surface antialiased',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
          "sticky top-0 z-40 bg-surface/85 backdrop-blur-xl border-b border-outline-variant/30 font-['Inter']",
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(9),
              cm.h(9),
              'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md',
            )}
          >
            <span
              className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              account_tree
            </span>
          </span>
          <span
            className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {APP_NAME}
          </span>
        </Link>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <ThemeToggle />
          <Link
            to="/signup"
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform',
            )}
          >
            {t('publicMap.cta', {}, { defaultValue: 'Make your own map' })}
          </Link>
        </div>
      </header>

      <main
        className={cm.cn(
          cm.flex1,
          cm.sp('px', 8),
          cm.sp('py', 8),
          cm.stack(6),
          'max-w-6xl w-full mx-auto',
        )}
      >
        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.textCenter, cm.sp('py', 12))}>
            {t('publicMap.loading', {}, { defaultValue: 'Loading the map…' })}
          </p>
        ) : error || !map ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-error-container/30 text-on-error-container border border-error/30',
            )}
          >
            {error || t('publicMap.notFound', {}, { defaultValue: 'Map not found.' })}
          </div>
        ) : (
          <>
            <div className={cm.stack(1)}>
              <span
                className={cm.cn('text-[10px] uppercase tracking-widest font-bold text-primary')}
              >
                {t('publicMap.eyebrow', {}, { defaultValue: 'Shared map · read-only' })}
              </span>
              <h1
                className={cm.cn(
                  cm.textSize('4xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
                data-mol-id="public-map-title"
              >
                {map.title}
              </h1>
              {map.description && (
                <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
                  {map.description}
                </p>
              )}
            </div>
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
              <svg
                viewBox="0 0 720 480"
                className={cm.cn(cm.w('full'), 'block h-[520px]')}
                data-mol-id="public-map-canvas"
              >
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
                      <path
                        key={c.id}
                        d={`M ${ax} ${ay} C ${cx} ${ay}, ${cx} ${by}, ${bx} ${by}`}
                      />
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
                {nodes.map((node) => (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    data-mol-id="public-map-node"
                    data-node-id={node.id}
                  >
                    <rect
                      x={0}
                      y={0}
                      width={NODE_W}
                      height={NODE_H}
                      rx={12}
                      ry={12}
                      style={{ fill: 'var(--color-surface)' }}
                      stroke="var(--color-border-light)"
                      strokeWidth={2}
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
                ))}
                {nodes.length === 0 && (
                  <text
                    x={360}
                    y={240}
                    textAnchor="middle"
                    fontFamily="Inter, system-ui, sans-serif"
                    fontSize={14}
                    style={{ fill: 'var(--color-text-muted)' }}
                  >
                    {t('publicMap.emptyHint', {}, { defaultValue: 'This map has no nodes yet.' })}
                  </text>
                )}
              </svg>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default PublicMap
