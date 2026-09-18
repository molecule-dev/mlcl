import React, { useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ListingCardProps {
  id: string
  onDelete?: () => void
}

export function ListingCard({ id, onDelete }: ListingCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleEdit = () => navigate(`/listings/${id}/edit`)
  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await http.delete(`/listings/${id}`)
      onDelete?.()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      className={cm.cn(
        'bg-surface-container-lowest rounded-xl shadow-sm border border-border overflow-hidden group transition-shadow hover:shadow-md',
      )}
    >
      <div className={cm.cn('relative aspect-[16/9] overflow-hidden')}>
        <img
          alt={t(
            'listingCard.imageAlt',
            { description: 'Luxury Villa' },
            { defaultValue: '{{description}}' },
          )}
          className={cm.cn(
            cm.w('full'),
            cm.h('full'),
            'object-cover transition-transform duration-700 group-hover:scale-110',
          )}
          data-alt="ultra-modern luxury architectural home with glass walls, infinity pool, and desert landscaping at dusk"
          src="https://picsum.photos/seed/ListingCard-1/1200/800"
        />
        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            'glass-price absolute top-4 right-4 rounded-md',
          )}
        >
          <span className={cm.cn(cm.fontWeight('bold'), 'text-success font-headline')}>
            {t('listingCard.price', { amount: '12,450,000' }, { defaultValue: '${{amount}}' })}
          </span>
        </div>
        <div className={cm.cn('absolute top-4 left-4')}>
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 1),
              'rounded-md',
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'bg-success-light text-success uppercase tracking-widest',
            )}
          >
            {t('listingCard.statusBadge', { status: 'Active' }, { defaultValue: '{{status}}' })}
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
          {t('listingCard.title', { name: 'The Obsidian Estate' }, { defaultValue: '{{name}}' })}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 6), 'text-success/60 font-body')}>
          {t(
            'listingCard.address',
            { address: '742 Evergreen Terrace, Beverly Hills, CA' },
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
                className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined text-success/40')}
              >
                bed
              </span>
              <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-success')}>
                {t('listingCard.bedrooms', { count: 6 }, { defaultValue: '{{count}} beds' })}
              </span>
            </div>
            <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
              <span
                className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined text-success/40')}
              >
                bathtub
              </span>
              <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-success')}>
                {t('listingCard.bathrooms', { count: 8.5 }, { defaultValue: '{{count}} baths' })}
              </span>
            </div>
            <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
              <span
                className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined text-success/40')}
              >
                square_foot
              </span>
              <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-success')}>
                {t('listingCard.area', { area: '12,400' }, { defaultValue: '{{area}} sq ft' })}
              </span>
            </div>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <button
              onClick={handleEdit}
              aria-label={t('common.edit', {}, { defaultValue: 'Edit' })}
              className={cm.cn(
                cm.sp('p', 2),
                'text-success/40 hover:text-success hover:bg-success-light rounded-lg transition-all',
              )}
            >
              "<span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>edit</span>
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              aria-label={t('common.delete', {}, { defaultValue: 'Delete' })}
              className={cm.cn(
                cm.sp('p', 2),
                'text-emerald-800/40 hover:text-error hover:bg-error-container/20 rounded-lg transition-all',
              )}
            >
              "<span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
export default ListingCard
