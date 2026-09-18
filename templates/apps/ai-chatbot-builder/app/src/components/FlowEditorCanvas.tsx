import { getClassMap } from '@molecule/app-ui'

import ActionFlowNode from './ActionFlowNode.js'
import AiResponseFlowNode from './AiResponseFlowNode.js'
import FlowConnectionsLayer from './FlowConnectionsLayer.js'
import FormFlowNode from './FormFlowNode.js'
import IntentClassificationFlowNode from './IntentClassificationFlowNode.js'
import OutputFlowNode from './OutputFlowNode.js'
import StartFlowNode from './StartFlowNode.js'

function FlowEditorCanvas() {
  const cm = getClassMap()
  return (
    <section className={cm.cn(cm.flex1, cm.sp('p', 12), 'relative overflow-hidden canvas-on-dark')}>
      {/* SVG Background Layer for Connections */}
      <FlowConnectionsLayer />
      {/* Start Node */}
      <StartFlowNode />
      {/* Intent Classification Node */}
      <IntentClassificationFlowNode />
      {/* Level 2 Nodes */}
      <ActionFlowNode />
      <FormFlowNode />
      <AiResponseFlowNode />
      {/* Final Destination Nodes */}
      <OutputFlowNode />
    </section>
  )
}

export default FlowEditorCanvas
export { FlowEditorCanvas }
