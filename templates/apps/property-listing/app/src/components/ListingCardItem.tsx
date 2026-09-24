import { useState } from 'react'
import { useNavigate } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

const DEMO_LISTING_ID = 'demo-azure-sky'

export default function ListingCardItem() {
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [isDeleted, setIsDeleted] = useState(false)
  const cm = getClassMap()

  if (isDeleted) return null

  const handleDelete = async () => {
    try {
      await http.delete(`/listings/${DEMO_LISTING_ID}`)
      setIsDeleted(true)
    } catch (error: unknown) {
      logError(
        error instanceof Error ? error : 'Failed to delete listing',
        error instanceof Error ? '' : error,
      )
    }
  }

  return (
    <div
      className={cm.cn(
        'bg-surface-container-lowest rounded-xl ambient-shadow overflow-hidden group transition-all hover:-translate-y-1',
      )}
    >
      <div className={cm.cn('relative aspect-[16/9] overflow-hidden')}>
        <img
          alt={t(
            'listingCardItem.imageAlt',
            {
              description: t(
                'listingCardItem.placeholderDescription',
                {},
                { defaultValue: 'Penthouse View' },
              ),
            },
            { defaultValue: 'Property view: {{description}}' },
          )}
          className={cm.cn(
            cm.w('full'),
            cm.h('full'),
            'object-cover transition-transform duration-700 group-hover:scale-110',
          )}
          data-alt="luxury penthouse apartment interior with floor to ceiling windows overlooking a city skyline at sunset"
          src="https://picsum.photos/seed/ListingCardItem-1/1200/800"
        />
        <div
          className={cm.cn(
            'glass-price absolute top-4 right-4 rounded-lg',
            cm.sp('px', 4),
            cm.sp('py', 2),
          )}
        >
          <span className={cm.cn('text-success font-headline', cm.fontWeight('bold'))}>
            {t('listingCardItem.price', { price: '8,200,000' }, { defaultValue: '${{price}}' })}
          </span>
        </div>
        <div className={cm.cn('absolute top-4 left-4')}>
          <span
            className={cm.cn(
              'bg-tertiary-fixed text-tertiary text-[10px] uppercase tracking-widest',
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.fontWeight('bold'),
            )}
          >
            {t(
              'status.pending',
              { status: t('listingCardItem.placeholderStatus', {}, { defaultValue: 'Pending' }) },
              { defaultValue: '{{status}}' },
            )}
          </span>
        </div>
      </div>
      <div className={cm.sp('p', 6)}>
        <h3
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 1),
            'text-success group-hover:text-secondary transition-colors',
          )}
        >
          {t(
            'listingCardItem.title',
            {
              title: t(
                'listingCardItem.placeholderTitle',
                {},
                { defaultValue: 'Azure Sky Penthouse' },
              ),
            },
            { defaultValue: '{{title}}' },
          )}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 6), 'text-success/60 font-body')}>
          {t(
            'listingCardItem.address',
            {
              address: t(
                'listingCardItem.placeholderAddress',
                {},
                { defaultValue: '400 Park Avenue, Suite 62B, NY' },
              ),
            },
            { defaultValue: '{{address}}' },
          )}
        </p>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('py', 4),
            'border-t border-emerald-900/5',
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
              <span
                className={cm.cn('material-symbols-outlined text-success/40', cm.textSize('lg'))}
              >
                bed
              </span>
              <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-success')}>
                {t('listingCardItem.bedrooms', { count: 3 }, { defaultValue: '{{count}}' })}
              </span>
            </div>
            <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
              <span
                className={cm.cn('material-symbols-outlined text-success/40', cm.textSize('lg'))}
              >
                bathtub
              </span>
              <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-success')}>
                {t('listingCardItem.bathrooms', { count: 4 }, { defaultValue: '{{count}}' })}
              </span>
            </div>
            <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
              <span
                className={cm.cn('material-symbols-outlined text-success/40', cm.textSize('lg'))}
              >
                square_foot
              </span>
              <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-success')}>
                {t(
                  'listingCardItem.squareFeet',
                  { area: '4,850' },
                  { defaultValue: '{{area}} sq ft' },
                )}
              </span>
            </div>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <button
              type="button"
              aria-label={t('common.edit', {}, { defaultValue: 'Edit' })}
              className={cm.cn(
                cm.sp('p', 2),
                'text-success/40 hover:text-success hover:bg-success-light rounded-lg transition-all',
              )}
              onClick={() => navigate(`/admin/listings/${DEMO_LISTING_ID}/edit`)}
            >
              <span className={cm.cn('material-symbols-outlined')}>edit</span>
            </button>
            <ConfirmButton
              label={t('common.delete', {}, { defaultValue: 'Delete' })}
              confirmLabel={t(
                'listingCardItem.confirmDelete',
                {},
                { defaultValue: 'Are you sure you want to delete this listing?' },
              )}
              onConfirm={handleDelete}
              color="error"
              size="sm"
              disarmSeconds={5}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
export { ListingCardItem }
