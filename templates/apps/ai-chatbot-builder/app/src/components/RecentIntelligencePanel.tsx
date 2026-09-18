import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import SystemHealthCard from './SystemHealthCard.js'
type RecentIntelligencePanelProps = {
  conversations?: Array<{
    id: string
    botLabel?: string
    question?: string
    answer?: string
    rating?: number | string
  }>
  loading?: boolean
}
function RecentIntelligencePanel({
  conversations = [],
  loading = false,
}: RecentIntelligencePanelProps) {
  const cm = getClassMap()
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.stack(6), 'col-span-12 lg:col-span-4')}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
        {t('recentIntelligencePanel.title', {}, { defaultValue: 'Recent Intelligence' })}
      </h2>
      <div
        className={cm.cn(
          'glass-card rounded-[2rem] border border-surface shadow-sm overflow-hidden',
        )}
      >
        {conversations.length === 0 && !loading ? (
          <div className={cm.cn(cm.sp('p', 8), cm.textCenter)}>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'recentIntelligencePanel.empty',
                {},
                { defaultValue: 'No conversations yet — test your bot to generate intelligence.' },
              )}
            </p>
          </div>
        ) : (
          conversations.slice(0, 3).map((conv, i, arr) => (
            <div
              key={conv.id}
              className={cm.cn(
                'p-4 hover:bg-surface-container-low transition-colors',
                i < arr.length - 1 && 'border-b border-surface-container-low',
              )}
            >
              <div
                className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 2))}
              >
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.sp('px', 2),
                    'text-[10px] uppercase tracking-wider text-on-surface-variant bg-surface-container py-0.5 rounded',
                  )}
                >
                  {conv.botLabel ||
                    t('recentIntelligencePanel.botFallback', {}, { defaultValue: 'Bot' })}
                </span>
                <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-0.5 text-tertiary')}>
                  <span
                    className={cm.cn('material-symbols-outlined text-[14px]')}
                    data-icon="star"
                    data-weight="fill"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'))}>
                    {String(conv.rating ?? '—')}
                  </span>
                </div>
              </div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  cm.sp('mb', 1),
                  'text-on-surface truncate',
                )}
              >
                "{conv.question || ''}"
              </p>
              <p className={cm.cn('text-[11px] text-on-surface-variant line-clamp-2 italic')}>
                "{conv.answer || ''}"
              </p>
            </div>
          ))
        )}
        <div className={cm.cn(cm.sp('p', 4), cm.textCenter, 'bg-surface-container-low')}>
          <button
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.textPrimary,
              'hover:underline',
            )}
            onClick={() => navigate('/test-chat')}
          >
            {t('recentIntelligencePanel.viewLiveFeed', {}, { defaultValue: 'View Live Feed' })}
          </button>
        </div>
      </div>
      {/* Small Confidence Chip Section */}
      <SystemHealthCard />
    </div>
  )
}
export default RecentIntelligencePanel
export { RecentIntelligencePanel }
