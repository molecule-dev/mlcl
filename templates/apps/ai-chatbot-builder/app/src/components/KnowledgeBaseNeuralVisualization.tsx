import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function KnowledgeBaseNeuralVisualization() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn('relative group rounded-2xl overflow-hidden aspect-video shadow-xl')}>
      <img
        alt={t(
          'knowledgeBaseNeuralVisualization.imageAlt',
          {},
          { defaultValue: 'Digital abstract' },
        )}
        className={cm.cn(
          cm.w('full'),
          cm.h('full'),
          'object-cover transition-transform duration-700 group-hover:scale-105',
        )}
        data-alt="Abstract digital visualization of flowing blue and purple data streams and glowing neural network connections in dark space"
        src="https://picsum.photos/seed/KnowledgeBaseNeuralVisualization-1/1200/800"
      />
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'end' }),
          cm.sp('p', 6),
          'absolute inset-0 bg-gradient-to-t from-on-background/80 to-transparent',
        )}
      >
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.sp('mb', 1),
            'text-[10px] text-primary-fixed uppercase tracking-[0.2em]',
          )}
        >
          {t(
            'knowledgeBaseNeuralVisualization.sectionLabel',
            {},
            { defaultValue: 'Neural Topology' },
          )}
        </p>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-white')}>
          {t(
            'knowledgeBaseNeuralVisualization.description',
            {},
            { defaultValue: 'Visualization of current knowledge cluster relationships.' },
          )}
        </p>
      </div>
    </div>
  )
}

export default KnowledgeBaseNeuralVisualization
export { KnowledgeBaseNeuralVisualization }
