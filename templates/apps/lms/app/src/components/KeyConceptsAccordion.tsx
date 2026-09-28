import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface KeyConceptsAccordionProps {
  expandedConcepts?: Set<number>
  onToggle?: (idx: number) => void
  concepts?: string[]
}

function KeyConceptsAccordion({
  expandedConcepts: externalExpanded,
  onToggle: externalToggle,
  concepts,
}: KeyConceptsAccordionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const KEY_CONCEPTS =
    concepts && concepts.length > 0
      ? concepts.map((concept) => ({ title: concept, content: '' }))
      : []
  const [localExpanded, setLocalExpanded] = useState<Set<number>>(new Set([0]))
  const expanded = externalExpanded ?? localExpanded
  const toggle =
    externalToggle ??
    ((idx: number) => {
      setLocalExpanded((prev) => {
        const next = new Set(prev)
        if (next.has(idx)) next.delete(idx)
        else next.add(idx)
        return next
      })
    })
  return (
    <div className={cm.stack(4)}>
      <h3
        className={cm.cn(
          cm.textSize('xl'),
          cm.fontWeight('bold'),
          cm.accentCard({ tone: 'primary' }),
        )}
      >
        {t('keyConcepts.heading', {}, { defaultValue: 'Key Concepts' })}
      </h3>
      {KEY_CONCEPTS.length === 0 ? (
        <p
          className={cm.cn(cm.sp('pl', 4), cm.textSize('sm'), 'text-on-surface-variant')}
          data-mol-id="key-concepts-empty"
        >
          {t(
            'keyConcepts.empty',
            {},
            { defaultValue: 'No key concepts have been added for this lesson yet.' },
          )}
        </p>
      ) : null}
      <div className={cm.stack(3)}>
        {KEY_CONCEPTS.map((concept, idx) => {
          const isOpen = expanded.has(idx)
          return (
            <div
              key={idx}
              className={cm.cn(
                'bg-surface-container-lowest rounded-lg overflow-hidden transition-all duration-300',
              )}
            >
              <button
                className={cm.cn(
                  cm.w('full'),
                  cm.flex({ justify: 'between', align: 'center' }),
                  cm.sp('p', 4),
                  cm.fontWeight('semibold'),
                  'text-left hover:bg-surface-secondary transition-colors',
                )}
                data-mol-id={`accordion-${idx + 1}`}
                onClick={() => toggle(idx)}
                aria-expanded={isOpen}
              >
                <span>{concept.title}</span>
                <span className={cm.cn('material-symbols-outlined')}>
                  {isOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {isOpen && concept.content && (
                <div
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.sp('pt', 0),
                    cm.textSize('sm'),
                    'text-foreground-secondary border-t border-border/50',
                  )}
                >
                  {concept.content}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default KeyConceptsAccordion
export { KeyConceptsAccordion }
