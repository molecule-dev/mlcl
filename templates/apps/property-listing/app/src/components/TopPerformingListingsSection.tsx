import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TopListing {
  id?: string
  title: string
  address: string
  image?: string
  views: number | string
  leads: number
  status: string
}

const STATUS_CLASS: Record<string, string> = {
  active: 'bg-primary-fixed text-on-primary-fixed-variant',
  pending: 'bg-secondary-container text-on-secondary-fixed-variant',
  sold: 'bg-surface-container-high text-on-surface-variant',
}

export default function TopPerformingListingsSection({
  listings = [],
}: {
  listings?: TopListing[]
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 10),
        'bg-surface-container-lowest rounded-lg ambient-shadow overflow-hidden',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 6))}>
        <h3
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            'font-headline text-on-surface',
          )}
        >
          {t(
            'topPerformingListingsSection.heading',
            {},
            { defaultValue: 'Top Performing Listings' },
          )}
        </h3>
        <button
          onClick={() => navigate('/admin/listings')}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'text-primary-container hover:underline underline-offset-8',
          )}
        >
          {t(
            'topPerformingListingsSection.viewFullInventory',
            {},
            { defaultValue: 'View Full Inventory' },
          )}
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
            data-icon="arrow_forward"
          >
            arrow_forward
          </span>
        </button>
      </div>
      <div className={cm.w('full')}>
        <table className={cm.cn(cm.w('full'), 'text-left border-collapse')}>
          <thead>
            <tr
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-[0.2em] text-on-surface-variant',
              )}
            >
              <th className={cm.sp('pb', 6)}>
                {t('topPerformingListingsSection.propertyHeader', {}, { defaultValue: 'Property' })}
              </th>
              <th className={cm.sp('pb', 6)}>
                {t('topPerformingListingsSection.viewsHeader', {}, { defaultValue: 'Views' })}
              </th>
              <th className={cm.sp('pb', 6)}>
                {t('topPerformingListingsSection.leadsHeader', {}, { defaultValue: 'Leads' })}
              </th>
              <th className={cm.cn(cm.sp('pb', 6), cm.textRight)}>
                {t('nav.status', {}, { defaultValue: 'Status' })}
              </th>
            </tr>
          </thead>
          <tbody className={cm.cn('divide-y divide-surface-container-low')}>
            {listings.map((listing, i) => {
              const statusKey = listing.status.toLowerCase()
              const statusClass =
                STATUS_CLASS[statusKey] ?? 'bg-surface-container-high text-on-surface-variant'
              return (
                <tr
                  key={listing.id ?? i}
                  className={cm.cn(
                    cm.cursorPointer,
                    'group hover:bg-surface-container-low transition-colors',
                  )}
                  onClick={() => listing.id && navigate(`/listings/${listing.id}`)}
                >
                  <td className={cm.cn(cm.sp('py', 6), cm.flex({ align: 'center', gap: 'md' }))}>
                    <div
                      className={cm.cn(
                        cm.w(16),
                        cm.h(16),
                        cm.shrink0,
                        'rounded-lg overflow-hidden',
                      )}
                    >
                      <img
                        className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                        src={listing.image ?? `https://picsum.photos/seed/listing-${i}/1200/800`}
                        alt={listing.title}
                      />
                    </div>
                    <div>
                      <h4 className={cm.cn(cm.fontWeight('bold'), cm.textPrimary)}>
                        {listing.title}
                      </h4>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('medium'),
                          'text-on-surface-variant',
                        )}
                      >
                        {listing.address}
                      </p>
                    </div>
                  </td>
                  <td className={cm.cn(cm.sp('py', 6), cm.textPrimary, 'font-extrabold')}>
                    {typeof listing.views === 'number'
                      ? listing.views.toLocaleString()
                      : listing.views}
                  </td>
                  <td className={cm.cn(cm.sp('py', 6), cm.textPrimary, 'font-extrabold')}>
                    {listing.leads}
                  </td>
                  <td className={cm.cn(cm.sp('py', 6), cm.textRight)}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.roundedFull,
                        `${statusClass} py-1.5 text-[10px] font-black uppercase tracking-widest`,
                      )}
                    >
                      {listing.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
export { TopPerformingListingsSection }
