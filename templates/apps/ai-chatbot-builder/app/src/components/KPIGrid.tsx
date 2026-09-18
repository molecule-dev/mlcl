import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

type KPIGridProps = {
  bots?: { id: string; conversations?: number }[]
  conversations?: { id: string }[]
}
function KPIGrid({ bots = [], conversations = [] }: KPIGridProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const volumeFromBots = bots.reduce(
    (sum, b) => sum + (typeof b.conversations === 'number' ? b.conversations : 0),
    0,
  )
  const activeConversationsDisplay = volumeFromBots > 0 ? volumeFromBots : conversations.length
  return (
    <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('p', 6),
          'bg-surface rounded-xl border-t-4 border-primary shadow-sm gap-2',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-wider text-on-surface-variant',
          )}
        >
          {t('kpiGrid.totalBots', {}, { defaultValue: 'Total Bots' })}
        </span>
        <div className={cm.cn(cm.flex(), 'items-baseline gap-2')}>
          <span className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>{bots.length}</span>
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'text-warning')}>
            {t('kpiGrid.botGrowth', { count: 1 }, { defaultValue: '+{{count}} this month' })}
          </span>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('p', 6),
          'bg-surface rounded-xl border-t-4 border-primary shadow-sm gap-2',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-wider text-on-surface-variant',
          )}
        >
          {t('kpiGrid.activeConversations', {}, { defaultValue: 'Active Conversations' })}
        </span>
        <div className={cm.cn(cm.flex(), 'items-baseline gap-2')}>
          <span className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {activeConversationsDisplay}
          </span>
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'text-success')}>
            {t('kpiGrid.growthRate', { percent: 14 }, { defaultValue: '↑ {{percent}}%' })}
          </span>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('p', 6),
          'bg-surface rounded-xl border-t-4 border-primary shadow-sm gap-2',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-wider text-on-surface-variant',
          )}
        >
          {t('kpiGrid.avgSatisfaction', {}, { defaultValue: 'Avg Satisfaction' })}
        </span>
        <div className={cm.cn(cm.flex(), 'items-baseline gap-2')}>
          <span className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            4.3
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {t('kpiGrid.satisfactionScale', {}, { defaultValue: '/5' })}
            </span>
          </span>
          <div className={cm.cn(cm.flex(), 'gap-0.5 text-tertiary text-[14px]')}>
            <span
              className={cm.cn('material-symbols-outlined')}
              data-icon="star"
              data-weight="fill"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
          </div>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('p', 6),
          'bg-surface rounded-xl border-t-4 border-primary shadow-sm gap-2',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-wider text-on-surface-variant',
          )}
        >
          {t('kpiGrid.resolutionRate', {}, { defaultValue: 'Resolution Rate' })}
        </span>
        <div className={cm.cn(cm.flex(), 'items-baseline gap-2')}>
          <span className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>82%</span>
          <div
            className={cm.cn(
              cm.flex1,
              cm.h(1.5),
              cm.roundedFull,
              cm.sp('ml', 4),
              'bg-surface-container overflow-hidden',
            )}
          >
            <div className={cm.cn(cm.h('full'), 'bg-primary w-[82%]')}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KPIGrid
export { KPIGrid }
