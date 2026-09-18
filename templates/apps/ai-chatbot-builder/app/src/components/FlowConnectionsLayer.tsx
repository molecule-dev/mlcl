import { getClassMap } from '@molecule/app-ui'

function FlowConnectionsLayer() {
  const cm = getClassMap()
  return (
    <svg className={cm.cn(cm.w('full'), cm.h('full'), 'absolute inset-0 pointer-events-none')}>
      <defs>
        <marker id="arrowhead" markerHeight="7" markerWidth="10" orient="auto" refX="0" refY="3.5">
          <polygon
            fill="var(--color-flow-connector)"
            opacity="0.4"
            points="0 0, 10 3.5, 0 7"
          ></polygon>
        </marker>
      </defs>
      {/* Start to Classification */}
      <path
        className={cm.cn('bezier-connection')}
        d="M 120 180 Q 200 180 250 180"
        fill="none"
        opacity="0.4"
        stroke="var(--color-flow-connector)"
        strokeWidth="2"
      ></path>
      {/* Branch 1: Billing */}
      <path
        className={cm.cn('bezier-connection')}
        d="M 460 160 Q 520 80 580 80"
        fill="none"
        opacity="0.4"
        stroke="var(--color-flow-connector)"
        strokeWidth="2"
      ></path>
      <path
        className={cm.cn('bezier-connection')}
        d="M 760 80 Q 820 80 880 80"
        fill="none"
        opacity="0.4"
        stroke="var(--color-flow-connector)"
        strokeWidth="2"
      ></path>
      {/* Branch 2: Technical */}
      <path
        className={cm.cn('bezier-connection')}
        d="M 460 180 Q 520 180 580 180"
        fill="none"
        opacity="0.4"
        stroke="var(--color-flow-connector)"
        strokeWidth="2"
      ></path>
      <path
        className={cm.cn('bezier-connection')}
        d="M 760 180 Q 820 180 880 180"
        fill="none"
        opacity="0.4"
        stroke="var(--color-flow-connector)"
        strokeWidth="2"
      ></path>
      {/* Branch 3: General Inquiry (Active Path) */}
      <path
        className={cm.cn('bezier-connection')}
        d="M 460 200 Q 520 300 580 300"
        fill="none"
        stroke="var(--color-flow-connector-active)"
        strokeWidth="2.5"
      ></path>
    </svg>
  )
}

export default FlowConnectionsLayer
export { FlowConnectionsLayer }
