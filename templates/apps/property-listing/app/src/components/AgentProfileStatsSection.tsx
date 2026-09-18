import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { PublicAgentProfile } from '../types/agent-public.js'

export default function AgentProfileStatsSection({
  agent,
  listingsCount,
}: {
  agent: PublicAgentProfile
  listingsCount: number
}) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <>
      {/* Stats Section: Tonal Layering Cards */}
      <section className={cm.cn(cm.grid({ gap: 'lg', cols: 2 }), 'md:grid-cols-4 mb-24')}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center' }),
            cm.sp('p', 8),
            cm.textCenter,
            'bg-surface-container-lowest rounded-lg ambient-shadow',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('3xl'),
              cm.textPrimary,
              cm.sp('mb', 1),
              'font-headline font-extrabold',
            )}
          >
            {listingsCount ?? agent.stats?.totalListings ?? agent.listingsCount ?? 0}
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-label text-on-surface-variant',
            )}
          >
            {t('agentProfileStatsSection.listings', {}, { defaultValue: 'Listings' })}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center' }),
            cm.sp('p', 8),
            cm.textCenter,
            'bg-surface-container-lowest rounded-lg ambient-shadow',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('3xl'),
              cm.textPrimary,
              cm.sp('mb', 1),
              'font-headline font-extrabold',
            )}
          >
            {agent.stats?.salesThisYear || agent.salesThisYear || 18}
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-label text-on-surface-variant',
            )}
          >
            {t('agentProfileStatsSection.salesThisYear', {}, { defaultValue: 'Sales This Year' })}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center' }),
            cm.sp('p', 8),
            cm.textCenter,
            'bg-surface-container-lowest rounded-lg ambient-shadow',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('3xl'),
              cm.textPrimary,
              cm.sp('mb', 1),
              'font-headline font-extrabold',
            )}
          >
            {agent.stats?.avgSalePrice || agent.avgSalePrice || '$425K'}
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-label text-on-surface-variant',
            )}
          >
            {t('agentProfileStatsSection.avgSalePrice', {}, { defaultValue: 'Avg Sale Price' })}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center' }),
            cm.sp('p', 8),
            cm.textCenter,
            'bg-surface-container-lowest rounded-lg ambient-shadow',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('3xl'),
              cm.textPrimary,
              cm.sp('mb', 1),
              'font-headline font-extrabold',
            )}
          >
            {agent.stats?.yearsExperience || agent.yearsExperience || agent.experience || 12}
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-label text-on-surface-variant',
            )}
          >
            {t(
              'agentProfileStatsSection.yearsExperience',
              {},
              { defaultValue: 'Years Experience' },
            )}
          </span>
        </div>
      </section>
    </>
  )
}
export { AgentProfileStatsSection }
