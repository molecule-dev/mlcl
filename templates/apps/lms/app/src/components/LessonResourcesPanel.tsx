import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ResProps {
  resources?: Array<{ name: string; url: string; type: string; size?: string }>
}

function LessonResourcesPanel({ resources }: ResProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.stack(4)}>
      <h3
        className={cm.cn(
          cm.textSize('xl'),
          cm.fontWeight('bold'),
          cm.flex({ align: 'center', gap: 2 }),
          'tracking-tight',
        )}
      >
        <span className={cm.cn(cm.textPrimary, 'material-symbols-outlined')}>folder_open</span>

        {t('lessonResourcesPanel.title', {}, { defaultValue: 'Resources' })}
      </h3>
      {resources && resources.length > 0 ? (
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-3')}>
          {resources.map((r, i) => (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cm.cn(
                cm.sp('p', 4),
                'bg-surface-container-lowest border border-outline-variant/20 rounded-xl hover:shadow-lg transition-all group',
              )}
            >
              <span
                className={cm.cn(
                  cm.sp('mb', 3),
                  'material-symbols-outlined text-foreground-tertiary group-hover:text-primary',
                )}
              >
                insert_drive_file
              </span>
              <h4
                className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), cm.sp('mb', 1), 'block')}
              >
                {r.name}
              </h4>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {r.size
                  ? t(
                      'lessonResourcesPanel.fileMeta',
                      { format: r.type?.toUpperCase() ?? '', size: r.size },
                      { defaultValue: '{{format}} • {{size}}' },
                    )
                  : r.type?.toUpperCase()}
              </span>
            </a>
          ))}
        </div>
      ) : (
        <p
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          data-mol-id="lesson-resources-empty"
        >
          {t(
            'lessonResourcesPanel.empty',
            {},
            { defaultValue: 'No downloadable resources for this lesson yet.' },
          )}
        </p>
      )}
    </div>
  )
}

export default LessonResourcesPanel
export { LessonResourcesPanel }
