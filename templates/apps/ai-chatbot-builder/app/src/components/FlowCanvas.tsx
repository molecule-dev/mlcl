import { useMemo } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface FlowNode {
  id: string
  type: string
  label: string
  x: number
  y: number
  model?: string
  prompt?: string
  temperature?: number
  max_tokens?: number
  knowledge_base_id?: string
  response_format?: string
}

interface FlowConnection {
  id: string
  from_node: string
  to_node: string
  label?: string
}

interface Props {
  nodes: FlowNode[]
  connections: FlowConnection[]
  selectedNodeId: string
  onNodeSelect: (id: string) => void
}

function getNodeDimensions(type: string): { width: number; height: number } {
  if (type === 'start') return { width: 48, height: 72 }
  if (type === 'ai_agent') return { width: 208, height: 120 }
  if (type === 'logic') return { width: 192, height: 140 }
  return { width: 176, height: 80 }
}

export default function FlowCanvas({ nodes, connections, selectedNodeId, onNodeSelect }: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const nodeMap = useMemo(() => {
    const map: Record<string, FlowNode> = {}
    nodes.forEach((n) => {
      map[n.id] = n
    })
    return map
  }, [nodes])

  function getConnectionPath(conn: FlowConnection): string {
    const fromNode = nodeMap[conn.from_node]
    const toNode = nodeMap[conn.to_node]
    if (!fromNode || !toNode) return ''
    const fromDims = getNodeDimensions(fromNode.type)
    const toDims = getNodeDimensions(toNode.type)
    const x1 = fromNode.x + fromDims.width
    const y1 = fromNode.y + fromDims.height / 2
    const x2 = toNode.x
    const y2 = toNode.y + toDims.height / 2
    const cx = (x1 + x2) / 2
    return `M ${x1} ${y1} Q ${cx} ${y1} ${x2} ${y2}`
  }

  function isActiveConnection(conn: FlowConnection): boolean {
    return conn.from_node === selectedNodeId || conn.to_node === selectedNodeId
  }

  function renderNode(node: FlowNode) {
    const isSelected = node.id === selectedNodeId

    if (node.type === 'start') {
      return (
        <button
          type="button"
          key={node.id}
          aria-pressed={isSelected}
          className={cm.cn(cm.cursorPointer, 'text-left')}
          style={{ position: 'absolute', zIndex: '10', left: node.x, top: node.y }}
          data-mol-id={`node-${node.id}`}
          onClick={() => onNodeSelect(node.id)}
        >
          <div
            className={cm.flex({ direction: 'col', align: 'center' })}
            style={{ gap: 'calc(2 * 0.25rem)' }}
          >
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.roundedFull)}
              style={{
                width: '12rem-scaled',
                height: 'calc(12 * 0.25rem)',
                backgroundColor: 'rgba(${tailwindScaleToRgb($1,$2)}, ${3/100})',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: 'rgba(${tailwindScaleToRgb($1,$2)}, ${3/100})',
                color: '${tailwindScaleToHex($1,$2)}',
              }}
            >
              <span style={{ fontFamily: 'Material Symbols outlined' }}>inbox</span>
            </div>
            <span
              className={cm.fontWeight('bold')}
              style={{
                fontSize: '10px',
                color: 'var(--md-sys-color-on-surface-variant)',
                textTransform: 'uppercase',
              }}
            >
              {t('flow-canvas.user-message', {}, { defaultValue: 'User Message' })}
            </span>
          </div>
        </button>
      )
    }

    if (node.type === 'logic') {
      return (
        <button
          type="button"
          key={node.id}
          aria-pressed={isSelected}
          className={cm.cn(cm.flex({ direction: 'col' }), cm.cursorPointer, 'text-left')}
          style={{
            position: 'absolute',
            width: '48rem-scaled',
            backgroundColor: 'var(--md-sys-color-surface-container)',
            borderRadius: '0.75rem',
            borderColor: 'var(--md-sys-color-indigo-500)',
            boxShadow: 'var(--tw-shadow-2xl, revert)',
            padding: 'calc(4 * 0.25rem)',
            gap: 'calc(3 * 0.25rem)',
            left: node.x,
            top: node.y,
          }}
          data-mol-id={`node-${node.id}`}
          onClick={() => onNodeSelect(node.id)}
        >
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <span
              className={cm.fontWeight('bold')}
              style={{
                fontSize: '10px',
                color: 'var(--md-sys-color-on-surface-variant)',
                textTransform: 'uppercase',
                letterSpacing: 'widest',
              }}
            >
              {t('flow-canvas.logic-node', {}, { defaultValue: 'Logic Node' })}
            </span>
            <span
              style={{
                fontFamily: 'Material Symbols outlined',
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
                color: 'var(--md-sys-color-outline)',
              }}
            >
              drag_indicator
            </span>
          </div>
          <span
            className={cm.cn(cm.fontWeight('semibold'), 'block')}
            style={{ color: 'var(--md-sys-color-on-surface)' }}
          >
            {node.label}
          </span>
        </button>
      )
    }

    if (node.type === 'action') {
      return (
        <button
          type="button"
          key={node.id}
          aria-pressed={isSelected}
          className={cm.cn(cm.flex({ direction: 'col' }), cm.cursorPointer, 'text-left')}
          style={{
            position: 'absolute',
            width: '44rem-scaled',
            backgroundColor: 'var(--md-sys-color-surface-container)',
            borderRadius: '0.75rem',
            borderColor: 'var(--md-sys-color-outline)',
            padding: 'calc(4 * 0.25rem)',
            gap: 'calc(2 * 0.25rem)',
            opacity: 'calc(60 / 100)',
            left: node.x,
            top: node.y,
          }}
          data-mol-id={`node-${node.id}`}
          onClick={() => onNodeSelect(node.id)}
        >
          <span
            className={cm.fontWeight('bold')}
            style={{
              fontSize: '10px',
              color: 'var(--md-sys-color-on-surface-variant)',
              textTransform: 'uppercase',
            }}
          >
            {t('flow-canvas.action', {}, { defaultValue: 'Action' })}
          </span>
          <span
            className={cm.cn(cm.fontWeight('semibold'), 'block')}
            style={{ color: 'var(--md-sys-color-on-surface)' }}
          >
            {node.label}
          </span>
        </button>
      )
    }

    if (node.type === 'form') {
      return (
        <button
          type="button"
          key={node.id}
          aria-pressed={isSelected}
          className={cm.cn(cm.flex({ direction: 'col' }), cm.cursorPointer, 'text-left')}
          style={{
            position: 'absolute',
            width: '44rem-scaled',
            backgroundColor: 'var(--md-sys-color-surface-container)',
            borderRadius: '0.75rem',
            borderColor: 'var(--md-sys-color-outline)',
            padding: 'calc(4 * 0.25rem)',
            gap: 'calc(2 * 0.25rem)',
            opacity: 'calc(60 / 100)',
            left: node.x,
            top: node.y,
          }}
          data-mol-id={`node-${node.id}`}
          onClick={() => onNodeSelect(node.id)}
        >
          <span
            className={cm.fontWeight('bold')}
            style={{
              fontSize: '10px',
              color: 'var(--md-sys-color-on-surface-variant)',
              textTransform: 'uppercase',
            }}
          >
            {t('flow-canvas.form', {}, { defaultValue: 'Form' })}
          </span>
          <span
            className={cm.cn(cm.fontWeight('semibold'), 'block')}
            style={{ color: 'var(--md-sys-color-on-surface)' }}
          >
            {node.label}
          </span>
        </button>
      )
    }

    if (node.type === 'ai_agent') {
      return (
        <button
          type="button"
          key={node.id}
          aria-pressed={isSelected}
          className={`absolute w-52 text-left bg-surface-container-high rounded-xl border-l-4 border-primary shadow-[0_0_30px_rgba(192,193,255,0.15)] p-4 flex flex-col gap-3 cursor-pointer${isSelected ? ' ring-1 ring-primary/40' : ''}`}
          style={{ left: node.x, top: node.y }}
          data-mol-id={`node-${node.id}`}
          onClick={() => onNodeSelect(node.id)}
        >
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <span
              className={cm.fontWeight('bold')}
              style={{
                fontSize: '10px',
                color: 'var(--md-sys-color-primary)',
                textTransform: 'uppercase',
                letterSpacing: 'widest',
              }}
            >
              {t('flow-canvas.ai-agent', {}, { defaultValue: 'AI Agent' })}
            </span>
            <div className={cm.flex()} style={{ gap: 'calc(1 * 0.25rem)' }}>
              <span
                style={{
                  fontFamily: 'Material Symbols outlined',
                  color: 'var(--md-sys-color-primary)',
                  fontVariationSettings: "'FILL' 1",
                }}
              >
                auto_awesome
              </span>
              <span
                style={{
                  fontFamily: 'Material Symbols outlined',
                  fontSize: '${textSizeToRem($1)}',
                  lineHeight: '${textSizeToLineHeight($1)}',
                  color: 'var(--md-sys-color-outline)',
                }}
              >
                drag_indicator
              </span>
            </div>
          </div>
          <span
            className={cm.cn(cm.fontWeight('semibold'), 'block')}
            style={{ color: 'var(--md-sys-color-on-surface)' }}
          >
            {node.label}
          </span>
          {node.knowledge_base_id && (
            <div
              className={cm.flex({ align: 'center' })}
              style={{
                gap: 'calc(2 * 0.25rem)',
                fontSize: '10px',
                color: 'var(--md-sys-color-on-surface-variant)',
              }}
            >
              <span
                style={{
                  fontFamily: 'Material Symbols outlined',
                  fontSize: '${textSizeToRem($1)}',
                  lineHeight: '${textSizeToLineHeight($1)}',
                }}
              >
                database
              </span>
              {t(
                'flow-canvas.linked-to-knowledge-base',
                {},
                { defaultValue: 'Linked to Knowledge Base' },
              )}
            </div>
          )}
        </button>
      )
    }

    if (node.type === 'output') {
      return (
        <button
          type="button"
          key={node.id}
          aria-pressed={isSelected}
          className={cm.cn(cm.flex({ direction: 'col' }), cm.cursorPointer, 'text-left')}
          style={{
            position: 'absolute',
            left: node.x,
            top: node.y,
            width: '11rem',
            backgroundColor: 'var(--md-sys-color-surface-container)',
            borderRadius: '0.75rem',
            borderColor: 'var(--color-glass-border)',
            padding: 'calc(4 * 0.25rem)',
            gap: 'calc(2 * 0.25rem)',
            opacity: 0.4,
          }}
          data-mol-id={`node-${node.id}`}
          onClick={() => onNodeSelect(node.id)}
        >
          <span
            className={cm.fontWeight('bold')}
            style={{
              fontSize: '10px',
              color: 'var(--md-sys-color-on-surface-variant)',
              textTransform: 'uppercase',
            }}
          >
            {t('flow-canvas.output', {}, { defaultValue: 'Output' })}
          </span>
          <span
            className={cm.cn(cm.fontWeight('semibold'), 'block')}
            style={{ color: 'var(--md-sys-color-on-surface)' }}
          >
            {node.label}
          </span>
        </button>
      )
    }

    return (
      <button
        type="button"
        key={node.id}
        aria-pressed={isSelected}
        className={cm.cn(cm.flex({ direction: 'col' }), cm.cursorPointer, 'text-left')}
        style={{
          position: 'absolute',
          width: '44rem-scaled',
          backgroundColor: 'var(--md-sys-color-surface-container)',
          borderRadius: '0.75rem',
          borderColor: 'var(--md-sys-color-outline)',
          padding: 'calc(4 * 0.25rem)',
          gap: 'calc(2 * 0.25rem)',
          left: node.x,
          top: node.y,
        }}
        data-mol-id={`node-${node.id}`}
        onClick={() => onNodeSelect(node.id)}
      >
        <span
          className={cm.fontWeight('bold')}
          style={{
            fontSize: '10px',
            color: 'var(--md-sys-color-on-surface-variant)',
            textTransform: 'uppercase',
          }}
        >
          {node.type}
        </span>
        <span
          className={cm.cn(cm.fontWeight('semibold'), 'block')}
          style={{ color: 'var(--md-sys-color-on-surface)' }}
        >
          {node.label}
        </span>
      </button>
    )
  }

  return (
    <section
      className={cm.flex1}
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'var(--md-sys-color-background)',
        padding: 'calc(12 * 0.25rem)',
      }}
      data-mol-id="flow-canvas"
    >
      <svg
        style={{
          position: 'absolute',
          inset: 'calc(0 * 0.25rem)',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerHeight="7"
            markerWidth="10"
            orient="auto"
            refX="0"
            refY="3.5"
          >
            <polygon fill="var(--color-flow-connector)" opacity={0.4} points="0 0, 10 3.5, 0 7" />
          </marker>
        </defs>
        {connections.map((conn) => {
          const d = getConnectionPath(conn)
          if (!d) return null
          const active = isActiveConnection(conn)
          return (
            <path
              key={conn.id}
              d={d}
              fill="none"
              opacity={active ? 1 : 0.4}
              stroke={active ? 'var(--color-flow-connector-active)' : 'var(--color-flow-connector)'}
              strokeWidth={active ? 2.5 : 2}
            />
          )
        })}
      </svg>
      {nodes.map((node) => renderNode(node))}
    </section>
  )
}

export { FlowCanvas }
