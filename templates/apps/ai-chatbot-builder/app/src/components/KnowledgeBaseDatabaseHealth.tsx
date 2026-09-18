import { useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function KnowledgeBaseDatabaseHealth() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [loading, setLoading] = useState(false)

  async function handleReindex() {
    setLoading(true)
    try {
      await http.post('/knowledge-base/reindex')
    } finally {
      setLoading(false)
    }
  }

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
        {t('knowledgeBaseDatabaseHealth.title', {}, { defaultValue: 'Database Health' })}
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
                'knowledgeBaseDatabaseHealth.processingPowerLabel',
                {},
                { defaultValue: 'Processing Power' },
              )}
            </span>
            <span className={cm.textPrimary}>
              {t(
                'knowledgeBaseDatabaseHealth.processingPowerValue',
                { percentage: 82 },
                { defaultValue: '{{percentage}}%' },
              )}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.roundedFull,
              'h-1.5 w-full bg-surface-container-high overflow-hidden',
            )}
          >
            <div className={cm.cn(cm.roundedFull, 'h-full bg-primary w-[82%]')}></div>
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
                'knowledgeBaseDatabaseHealth.vectorDensityLabel',
                {},
                { defaultValue: 'Vector Density' },
              )}
            </span>
            <span className={cm.textPrimary}>
              {t(
                'knowledgeBaseDatabaseHealth.vectorDensityValue',
                { percentage: 64 },
                { defaultValue: '{{percentage}}%' },
              )}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.roundedFull,
              'h-1.5 w-full bg-surface-container-high overflow-hidden',
            )}
          >
            <div className={cm.cn(cm.roundedFull, 'h-full bg-primary w-[64%]')}></div>
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
        <button
          className={cm.cn(
            cm.textPrimary,
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest hover:underline',
          )}
          onClick={handleReindex}
          disabled={loading}
        >
          {loading
            ? t('knowledgeBaseDatabaseHealth.reindexing', {}, { defaultValue: 'Re-indexing…' })
            : t(
                'knowledgeBaseDatabaseHealth.reindexAllSources',
                {},
                { defaultValue: 'Re-index all sources' },
              )}
        </button>
      </div>
    </div>
  )
}
export default KnowledgeBaseDatabaseHealth
export { KnowledgeBaseDatabaseHealth }
