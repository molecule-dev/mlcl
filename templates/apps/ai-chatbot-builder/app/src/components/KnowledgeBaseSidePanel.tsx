import { getClassMap } from '@molecule/app-ui'

import KnowledgeBaseDatabaseHealth from '../components/KnowledgeBaseDatabaseHealth.js'
import KnowledgeBaseModelInsight from '../components/KnowledgeBaseModelInsight.js'
import KnowledgeBaseNeuralVisualization from '../components/KnowledgeBaseNeuralVisualization.js'

function KnowledgeBaseSidePanel() {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.stack(6), 'lg:col-span-4')}>
      {/* Data Health Widget */}
      <KnowledgeBaseDatabaseHealth />
      {/* AI Confidence Alert (Specialized Component) */}
      <KnowledgeBaseModelInsight />
      {/* Visual Asset Placeholder */}
      <KnowledgeBaseNeuralVisualization />
    </div>
  )
}

export default KnowledgeBaseSidePanel
export { KnowledgeBaseSidePanel }
