import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

// Re-index pipeline is not yet implemented end-to-end. Surfacing the
// metric is fine, but we suppress the action button so users do not
// trigger a request that 404s.
function KnowledgeBaseDataHealthWidget() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.sp('p', 6), 'bg-surface-container-low rounded-2xl')}>
      <h3
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          cm.sp('mb', 6),
          'text-on-surface',
        )}
      >
        {t('knowledgeBaseDataHealthWidget.title', {}, { defaultValue: 'Database Health' })}
      </h3>
      <div className={cm.stack(6)}>
        <div className={cm.stack(2)}>
          <div
            className={cm.cn(
              cm.flex({ justify: 'between' }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
            )}
          >
            <span className={cm.cn('text-outline')}>
              {t(
                'knowledgeBaseDataHealthWidget.processingPower',
                {},
                { defaultValue: 'Processing Power' },
              )}
            </span>
            <span className={cm.textPrimary}>82%</span>
          </div>
          <div
            className={cm.cn(
              cm.h(1.5),
              cm.w('full'),
              cm.roundedFull,
              'bg-surface-container-high overflow-hidden',
            )}
          >
            <div className={cm.cn(cm.h('full'), cm.roundedFull, 'bg-primary w-[82%]')}></div>
          </div>
        </div>
        <div className={cm.stack(2)}>
          <div
            className={cm.cn(
              cm.flex({ justify: 'between' }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
            )}
          >
            <span className={cm.cn('text-outline')}>
              {t(
                'knowledgeBaseDataHealthWidget.vectorDensity',
                {},
                { defaultValue: 'Vector Density' },
              )}
            </span>
            <span className={cm.textPrimary}>64%</span>
          </div>
          <div
            className={cm.cn(
              cm.h(1.5),
              cm.w('full'),
              cm.roundedFull,
              'bg-surface-container-high overflow-hidden',
            )}
          >
            <div className={cm.cn(cm.h('full'), cm.roundedFull, 'bg-primary w-[64%]')}></div>
          </div>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.sp('mt', 8),
          cm.sp('pt', 6),
          cm.textCenter,
          'border-t border-outline-variant/30',
        )}
      >
        <p
          className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant uppercase tracking-widest')}
        >
          {t(
            'knowledgeBaseDataHealthWidget.autoIndexHint',
            {},
            { defaultValue: 'New sources are indexed automatically.' },
          )}
        </p>
      </div>
    </div>
  )
}

export default KnowledgeBaseDataHealthWidget
export { KnowledgeBaseDataHealthWidget }
