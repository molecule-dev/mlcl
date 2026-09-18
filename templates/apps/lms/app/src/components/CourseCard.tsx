import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type CourseCardProps = {
  continueTo?: string
  imageSeed?: string
  title?: string
  lessonsRemaining?: number
  progressPercent?: number
  levelLabel?: string
}

export function CourseCard({
  continueTo = '/course/demo-1',
  imageSeed: _imageSeed = 'CourseCard-1',
  title,
  lessonsRemaining = 4,
  progressPercent = 65,
  levelLabel,
}: CourseCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const resolvedTitle =
    title ?? t('courseCard.title', {}, { defaultValue: 'Advanced React Patterns' })
  const level = levelLabel ?? t('courseCard.level', {}, { defaultValue: 'INTERMEDIATE' })
  return (
    <div
      className={cm.cn(
        cm.w('[320px]'),
        'flex-none bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden group border border-outline-variant/10',
      )}
    >
      <div
        className={cm.cn(
          cm.h(40),
          'relative overflow-hidden bg-gradient-to-br from-primary via-primary-container to-tertiary',
        )}
        aria-label={t('courseCard.imageAlt', {}, { defaultValue: 'Course thumbnail' })}
      >
        <span
          className={cm.cn(
            'material-symbols-outlined absolute inset-0 m-auto text-white/80 text-[88px] flex items-center justify-center',
          )}
          data-icon="menu_book"
        >
          menu_book
        </span>
        <div className={cm.cn('absolute inset-0 bg-on-surface/10')}></div>
        <div
          className={cm.cn(
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.fontWeight('bold'),
            'absolute top-3 left-3 bg-surface/90 backdrop-blur-md rounded text-[10px]',
          )}
        >
          {level}
        </div>
      </div>
      <div className={cm.sp('p', 6)}>
        <h3
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('lg'),
            cm.sp('mb', 2),
            'font-headline leading-tight',
          )}
        >
          {resolvedTitle}
        </h3>
        <p className={cm.cn(cm.textSize('xs'), cm.sp('mb', 4), 'text-on-surface-variant')}>
          {t(
            'courseCard.lessonsRemaining',
            { count: lessonsRemaining },
            { defaultValue: '{{count}} lessons remaining' },
          )}
        </p>
        <div className={cm.cn(cm.stack(2), cm.sp('mb', 6))}>
          <div
            className={cm.cn(cm.flex({ justify: 'between' }), cm.fontWeight('bold'), 'text-[10px]')}
          >
            <span className={cm.textPrimary}>
              {t(
                'courseCard.progressComplete',
                { percent: progressPercent },
                { defaultValue: '{{percent}}% Complete' },
              )}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.roundedFull,
              cm.w('full'),
              'h-1.5 bg-surface-container-highest overflow-hidden',
            )}
          >
            <div
              className={cm.cn(cm.h('full'), 'bg-gradient-to-r from-primary to-primary-container')}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(continueTo)}
          className={cm.cn(
            cm.button(),
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.w('full'),
            cm.textPrimary,
            'py-2.5 bg-surface-container-low rounded-xl hover:bg-primary hover:text-on-primary transition-all',
          )}
          data-mol-id="btn-continue-1"
        >
          {t('common.continue', {}, { defaultValue: 'Continue' })}
        </button>
      </div>
    </div>
  )
}
export default CourseCard
