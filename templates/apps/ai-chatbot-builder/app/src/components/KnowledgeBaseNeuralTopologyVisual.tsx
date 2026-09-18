import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function KnowledgeBaseNeuralTopologyVisual() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn('relative group rounded-2xl overflow-hidden aspect-video shadow-xl')}>
      <img
        alt={t(
          'knowledgeBaseNeuralTopologyVisual.imageAlt',
          {},
          { defaultValue: 'Digital abstract' },
        )}
        className={cm.cn(
          cm.w('full'),
          cm.h('full'),
          'object-cover transition-transform duration-700 group-hover:scale-105',
        )}
        data-alt="Abstract digital visualization of flowing blue and purple data streams and glowing neural network connections in dark space"
        src="https://picsum.photos/seed/KnowledgeBaseNeuralTopologyVisual-1/1200/800"
      />
      <div
        className={cm.cn(
          'absolute inset-0 bg-gradient-to-t from-on-background/80 to-transparent',
          cm.flex({ direction: 'col', justify: 'end' }),
          cm.sp('p', 6),
        )}
      >
        <p
          className={cm.cn(
            'text-[10px] text-primary-fixed uppercase tracking-[0.2em]',
            cm.fontWeight('bold'),
            cm.sp('mb', 1),
          )}
        >
          {t(
            'knowledgeBaseNeuralTopologyVisual.categoryLabel',
            {},
            { defaultValue: 'Neural Topology' },
          )}
        </p>
        <p className={cm.cn('text-white', cm.textSize('sm'), cm.fontWeight('medium'))}>
          {t(
            'knowledgeBaseNeuralTopologyVisual.description',
            {},
            { defaultValue: 'Visualization of current knowledge cluster relationships.' },
          )}
        </p>
      </div>
    </div>
  )
}

export default KnowledgeBaseNeuralTopologyVisual
export { KnowledgeBaseNeuralTopologyVisual }
