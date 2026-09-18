import React, { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SavedPropertiesPageCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [isFavorite, setIsFavorite] = useState(true)
  const [isRemoved, setIsRemoved] = useState(false)

  if (isRemoved) return null

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'group bg-surface rounded-xl shadow-sm border border-border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md',
      )}
      data-mol-id="prop-02"
    >
      <div className={cm.cn(cm.h(72), 'relative overflow-hidden rounded-xl')}>
        <img
          alt={t(
            'savedPropertiesPageCard.title',
            { title: 'Desert Minimalist' },
            { defaultValue: '{{title}}' },
          )}
          className={cm.cn(
            cm.w('full'),
            cm.h('full'),
            'object-cover transition-transform duration-500 group-hover:scale-105',
          )}
          data-alt="contemporary minimalist concrete home in a desert landscape with large pool and warm sunset lighting reflecting off the water"
          src="https://picsum.photos/seed/SavedPropertiesPageCard-1/1200/800"
        />
        <div className={cm.cn('absolute top-4 right-4 z-10')}>
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'glass-card text-error shadow-sm',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined filled-icon')}
              style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}
            >
              favorite
            </span>
          </button>
        </div>
        <div className={cm.cn('absolute top-4 left-4 z-10')}>
          <div className={cm.cn(cm.sp('px', 4), cm.roundedFull, 'glass-card py-1.5 shadow-sm')}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'font-headline text-on-primary-fixed-variant',
              )}
            >
              {t(
                'savedPropertiesPageCard.price',
                { price: '$3,400,000' },
                { defaultValue: '{{price}}' },
              )}
            </span>
          </div>
        </div>
      </div>
      <div className={cm.cn(cm.sp('px', 6), cm.sp('pt', 6), cm.sp('pb', 2))}>
        <h3
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 1),
            'font-headline text-on-surface',
          )}
        >
          {t(
            'savedPropertiesPageCard.title',
            { title: 'Desert Minimalist' },
            { defaultValue: '{{title}}' },
          )}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
          {t(
            'savedPropertiesPageCard.address',
            { address: '120 Canyon Ridge, Scottsdale' },
            { defaultValue: '{{address}}' },
          )}
        </p>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'md' }),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.sp('mb', 6),
            'text-on-surface-variant',
          )}
        >
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>bed</span>
            {t(
              'savedPropertiesPageCard.bedroomCount',
              { count: 5 },
              { defaultValue: '{{count}} beds' },
            )}
          </span>
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>bathtub</span>
            {t(
              'savedPropertiesPageCard.bathroomCount',
              { count: 5 },
              { defaultValue: '{{count}} baths' },
            )}
          </span>
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>
              square_foot
            </span>
            {t(
              'savedPropertiesPageCard.livingArea',
              { area: '5,100' },
              { defaultValue: '{{area}} sq ft' },
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsRemoved(true)}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            cm.w('full'),
            'bg-surface-container-high text-on-surface-variant rounded-xl hover:bg-error-container hover:text-error transition-all duration-200',
          )}
        >
          <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>delete</span>
          {t('common.remove', {}, { defaultValue: 'Remove' })}
        </button>
      </div>
    </div>
  )
}

export default SavedPropertiesPageCard
export { SavedPropertiesPageCard }
