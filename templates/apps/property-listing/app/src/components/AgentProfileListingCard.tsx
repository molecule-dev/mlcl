import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { PublicListingSummary } from '../types/agent-public.js'

export function AgentProfileListingCard({ listing }: { listing: PublicListingSummary }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const price = listing?.price ? `$${Number(listing.price).toLocaleString()}` : '—'
  const address = listing?.address || listing?.title || listing?.name || '—'
  const location =
    [listing?.city, listing?.state].filter(Boolean).join(', ') ||
    listing?.neighborhood ||
    listing?.location ||
    '—'
  const beds = listing?.bedrooms ?? listing?.beds ?? '—'
  const baths = listing?.bathrooms ?? listing?.baths ?? '—'
  const sqft = listing?.squareFeet ?? listing?.sqft ?? listing?.area ?? '—'
  const photo =
    listing?.photos?.[0] ||
    listing?.image ||
    listing?.photo ||
    listing?.thumbnail ||
    'https://picsum.photos/seed/AgentProfileListingCard-1/1200/800'
  return (
    <button
      type="button"
      className={cm.cn(
        cm.cursorPointer,
        'w-full text-left group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-border transition-all',
      )}
      onClick={() => listing?.id && navigate(`/property/${listing.id}`)}
    >
      <div className={cm.cn(cm.h(72), 'relative overflow-hidden')}>
        <img
          alt={address}
          className={cm.cn(
            cm.w('full'),
            cm.h('full'),
            'object-cover transition-transform duration-500 group-hover:scale-105',
          )}
          data-alt="Modern minimalist house with large floor-to-ceiling glass windows at sunset, surrounded by pine trees."
          src={photo}
        />
        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textPrimary,
            'glass-tag absolute top-4 right-4 rounded-md font-headline',
          )}
        >
          {price}
        </div>
      </div>
      <div className={cm.sp('p', 6)}>
        <span
          className={cm.cn(
            cm.textSize('xl'),
            cm.textPrimary,
            cm.sp('mb', 1),
            'block font-headline',
            cm.fontWeight('bold'),
          )}
        >
          {address}
        </span>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
          {location}
        </p>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'md' }),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'text-outline',
          )}
        >
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')} data-icon="bed">
              bed
            </span>
            {t('agentProfileListingCard.beds', { count: beds }, { defaultValue: '{{count}} Beds' })}
          </span>
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <span
              className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
              data-icon="bathtub"
            >
              bathtub
            </span>
            {t(
              'agentProfileListingCard.baths',
              { count: baths },
              { defaultValue: '{{count}} Baths' },
            )}
          </span>
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <span
              className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
              data-icon="square_foot"
            >
              square_foot
            </span>
            {t(
              'agentProfileListingCard.squareFeet',
              { value: typeof sqft === 'number' ? sqft.toLocaleString() : sqft },
              { defaultValue: '{{value}} sqft' },
            )}
          </span>
        </div>
      </div>
    </button>
  )
}
export default AgentProfileListingCard
