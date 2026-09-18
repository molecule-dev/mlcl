import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function LessonHeader({
  title,
  order,
  duration,
  difficulty,
  type,
}: {
  title?: string
  order?: number | string
  duration?: string
  difficulty?: string
  type?: string
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const displayedTitle = title?.trim()
  const heading =
    order != null && displayedTitle
      ? t(
          'lessonHeader.titleWithOrder',
          { order, title: displayedTitle },
          { defaultValue: '{{order}} — {{title}}' },
        )
      : (displayedTitle ?? t('lessonHeader.untitled', {}, { defaultValue: 'Untitled lesson' }))
  return (
    <div>
      <h1
        className={cm.cn(
          cm.textSize('4xl'),
          cm.sp('mb', 4),
          'font-extrabold tracking-tight text-on-surface',
        )}
      >
        {heading}
      </h1>
      {duration || difficulty || type ? (
        <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), 'text-on-surface-variant')}>
          {duration ? (
            <div
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                'gap-1.5 bg-surface-container-low border border-outline-variant/15',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>schedule</span>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{duration}</span>
            </div>
          ) : null}
          {difficulty ? (
            <div
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                'gap-1.5 bg-surface-container-low border border-outline-variant/15',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[18px]')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {difficulty}
              </span>
            </div>
          ) : null}
          {type && !difficulty ? (
            <div
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                'gap-1.5 bg-surface-container-low border border-outline-variant/15',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                {type === 'quiz'
                  ? 'quiz'
                  : type === 'assignment'
                    ? 'assignment'
                    : type === 'video'
                      ? 'play_circle'
                      : 'description'}
              </span>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'capitalize')}>
                {type}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default LessonHeader
export { LessonHeader }
