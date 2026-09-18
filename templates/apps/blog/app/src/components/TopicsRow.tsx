import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function TopicsRow() {
  const { t } = useTranslation()
  const [activeTopic, setActiveTopic] = useState<string | null>(null)
  const cm = getClassMap()
  return (
    <>
      {/* Topics Row */}
      <section className={cm.cn(cm.sp('py', 12), 'border-y border-outline-variant/10')}>
        <div
          className={cm.cn(
            'max-w-7xl',
            cm.mxAuto,
            cm.sp('px', 6),
            cm.flex({ gap: 'sm' }),
            'overflow-x-auto hide-scrollbar whitespace-nowrap',
          )}
        >
          <button
            type="button"
            aria-pressed={activeTopic === 'programming'}
            className={cm.cn(
              `${activeTopic === 'programming' ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'}`,
              cm.sp('px', 5),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              cm.cursorPointer,
              'py-2.5 transition-colors border',
            )}
            onClick={() => setActiveTopic(activeTopic === 'programming' ? null : 'programming')}
          >
            {t('topicsRow.programming', {}, { defaultValue: 'Programming' })}
          </button>
          <button
            type="button"
            aria-pressed={activeTopic === 'dataScience'}
            className={cm.cn(
              `${activeTopic === 'dataScience' ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'}`,
              cm.sp('px', 5),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              cm.cursorPointer,
              'py-2.5 transition-colors border',
            )}
            onClick={() => setActiveTopic(activeTopic === 'dataScience' ? null : 'dataScience')}
          >
            {t('topicsRow.dataScience', {}, { defaultValue: 'Data Science' })}
          </button>
          <button
            type="button"
            aria-pressed={activeTopic === 'technology'}
            className={cm.cn(
              `${activeTopic === 'technology' ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'}`,
              cm.sp('px', 5),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              cm.cursorPointer,
              'py-2.5 transition-colors border',
            )}
            onClick={() => setActiveTopic(activeTopic === 'technology' ? null : 'technology')}
          >
            {t('topicsRow.technology', {}, { defaultValue: 'Technology' })}
          </button>
          <button
            type="button"
            aria-pressed={activeTopic === 'selfImprovement'}
            className={cm.cn(
              `${activeTopic === 'selfImprovement' ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'}`,
              cm.sp('px', 5),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              cm.cursorPointer,
              'py-2.5 transition-colors border',
            )}
            onClick={() =>
              setActiveTopic(activeTopic === 'selfImprovement' ? null : 'selfImprovement')
            }
          >
            {t('topicsRow.selfImprovement', {}, { defaultValue: 'Self Improvement' })}
          </button>
          <button
            type="button"
            aria-pressed={activeTopic === 'writing'}
            className={cm.cn(
              `${activeTopic === 'writing' ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'}`,
              cm.sp('px', 5),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              cm.cursorPointer,
              'py-2.5 transition-colors border',
            )}
            onClick={() => setActiveTopic(activeTopic === 'writing' ? null : 'writing')}
          >
            {t('topicsRow.writing', {}, { defaultValue: 'Writing' })}
          </button>
          <button
            type="button"
            aria-pressed={activeTopic === 'relationships'}
            className={cm.cn(
              `${activeTopic === 'relationships' ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'}`,
              cm.sp('px', 5),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              cm.cursorPointer,
              'py-2.5 transition-colors border',
            )}
            onClick={() => setActiveTopic(activeTopic === 'relationships' ? null : 'relationships')}
          >
            {t('topicsRow.relationships', {}, { defaultValue: 'Relationships' })}
          </button>
          <button
            type="button"
            aria-pressed={activeTopic === 'machineLearning'}
            className={cm.cn(
              `${activeTopic === 'machineLearning' ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'}`,
              cm.sp('px', 5),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              cm.cursorPointer,
              'py-2.5 transition-colors border',
            )}
            onClick={() =>
              setActiveTopic(activeTopic === 'machineLearning' ? null : 'machineLearning')
            }
          >
            {t('topicsRow.machineLearning', {}, { defaultValue: 'Machine Learning' })}
          </button>
          <button
            type="button"
            aria-pressed={activeTopic === 'visualArts'}
            className={cm.cn(
              `${activeTopic === 'visualArts' ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'}`,
              cm.sp('px', 5),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              cm.cursorPointer,
              'py-2.5 transition-colors border',
            )}
            onClick={() => setActiveTopic(activeTopic === 'visualArts' ? null : 'visualArts')}
          >
            {t('topicsRow.visualArts', {}, { defaultValue: 'Visual Arts' })}
          </button>
          <button
            type="button"
            aria-pressed={activeTopic === 'curation'}
            className={cm.cn(
              `${activeTopic === 'curation' ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'}`,
              cm.sp('px', 5),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              cm.cursorPointer,
              'py-2.5 transition-colors border',
            )}
            onClick={() => setActiveTopic(activeTopic === 'curation' ? null : 'curation')}
          >
            {t('topicsRow.curation', {}, { defaultValue: 'Curation' })}
          </button>
        </div>
      </section>
    </>
  )
}

export default TopicsRow
export { TopicsRow }
