import { useState } from 'react'

import { getClassMap } from '@molecule/app-ui'

import KnowledgeBaseSidePanel from './KnowledgeBaseSidePanel.js'
import KnowledgeBaseSourceCard from './KnowledgeBaseSourceCard.js'
import KnowledgeBaseSourceCardApi from './KnowledgeBaseSourceCardApi.js'
import KnowledgeBaseSourceCardFaq from './KnowledgeBaseSourceCardFaq.js'
import KnowledgeBaseSourcesHeader from './KnowledgeBaseSourcesHeader.js'

interface KnowledgeBaseContentGridProps {
  sources?: Array<{ id: string; title?: string }>
}

function KnowledgeBaseContentGrid({ sources = [] }: KnowledgeBaseContentGridProps = {}) {
  const cm = getClassMap()
  const [items, setItems] = useState(sources)

  return (
    <div className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'lg:grid-cols-12')}>
      <div className={cm.cn(cm.stack(4), 'lg:col-span-8')}>
        <KnowledgeBaseSourcesHeader />
        {items.length === 0 ? (
          <KnowledgeBaseSourceCard
            id="default"
            title="Product Manual v3.pdf"
            onRemove={() => setItems((prev) => prev.filter((s) => s.id !== 'default'))}
          />
        ) : (
          items.map((source) => (
            <KnowledgeBaseSourceCard
              key={source.id}
              id={source.id}
              title={source.title}
              onRemove={() => setItems((prev) => prev.filter((s) => s.id !== source.id))}
            />
          ))
        )}
        <KnowledgeBaseSourceCardFaq />
        <KnowledgeBaseSourceCardApi />
      </div>
      <KnowledgeBaseSidePanel />
    </div>
  )
}

export default KnowledgeBaseContentGrid
export { KnowledgeBaseContentGrid }
