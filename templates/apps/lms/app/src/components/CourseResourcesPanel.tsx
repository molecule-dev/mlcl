import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function CourseResourcesPanel() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10',
      )}
    >
      <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
        {t('courseResourcesPanel.title', {}, { defaultValue: 'Resources' })}
      </h3>
      <div className={cm.stack(3)}>
        <button
          type="button"
          disabled
          title={t(
            'courseResourcesPanel.resourceUnavailable',
            {},
            { defaultValue: 'Downloads are temporarily unavailable' },
          )}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('p', 3),
            cm.w('full'),
            'rounded-lg opacity-70 cursor-not-allowed text-left',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              'rounded bg-error-light text-error',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')}>picture_as_pdf</span>
          </div>
          <div className={cm.cn(cm.flex1, 'min-w-0')}>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'truncate')}>
              {t(
                'courseResourcesPanel.fileName',
                { name: 'Lecture_Notes_03.pdf' },
                { defaultValue: '{{name}}' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
              {t(
                'courseResourcesPanel.resourceHint',
                {},
                { defaultValue: 'Available after instructor publishes files' },
              )}
            </p>
          </div>
        </button>
        <button
          type="button"
          disabled
          title={t(
            'courseResourcesPanel.resourceUnavailable',
            {},
            { defaultValue: 'Downloads are temporarily unavailable' },
          )}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('p', 3),
            cm.w('full'),
            'rounded-lg opacity-70 cursor-not-allowed text-left',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              'rounded bg-primary-container/30 text-primary',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')}>code</span>
          </div>
          <div className={cm.cn(cm.flex1, 'min-w-0')}>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'truncate')}>
              {t(
                'courseResourcesPanel.fileName',
                { name: 'nn_basics.py' },
                { defaultValue: '{{name}}' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
              {t(
                'courseResourcesPanel.resourceHint',
                {},
                { defaultValue: 'Available after instructor publishes files' },
              )}
            </p>
          </div>
        </button>
        <button
          type="button"
          disabled
          title={t(
            'courseResourcesPanel.resourceUnavailable',
            {},
            { defaultValue: 'Downloads are temporarily unavailable' },
          )}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('p', 3),
            cm.w('full'),
            'rounded-lg opacity-70 cursor-not-allowed text-left',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              'rounded bg-orange-50 text-orange-600',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')}>slideshow</span>
          </div>
          <div className={cm.cn(cm.flex1, 'min-w-0')}>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'truncate')}>
              {t(
                'courseResourcesPanel.fileName',
                { name: 'Visualizing_Networks.pptx' },
                { defaultValue: '{{name}}' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
              {t(
                'courseResourcesPanel.resourceHint',
                {},
                { defaultValue: 'Available after instructor publishes files' },
              )}
            </p>
          </div>
        </button>
      </div>
    </div>
  )
}

export default CourseResourcesPanel
export { CourseResourcesPanel }
