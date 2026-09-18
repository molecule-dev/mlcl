import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SavedProperty {
  id: string
  title: string
  address: string
  city: string
  state: string
  zip_code: string
  price: number
  bedrooms: number
  bathrooms: number
  square_feet: number
  property_type: string
  photos: string[]
  status: string
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price)
}

function SavedPropertyCard({
  property,
  onRemove,
}: {
  property: SavedProperty
  onRemove: (id: string) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.surface,
        'group rounded-xl overflow-hidden shadow-sm border border-border transition-all duration-300 hover:-translate-y-1',
      )}
      data-mol-id={`prop-${property.id}`}
    >
      <div className={cm.cn(cm.h(72), 'relative overflow-hidden rounded-xl')}>
        {property.photos?.[0] ? (
          <img
            alt={property.title}
            className={cm.cn(
              cm.w('full'),
              cm.h('full'),
              'object-cover transition-transform duration-500 group-hover:scale-105',
            )}
            src={property.photos[0]}
          />
        ) : (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w('full'),
              cm.h('full'),
              'bg-surface-variant',
            )}
          >
            <span className={cm.cn('text-on-surface-variant')}>
              {t('savedPropertyCard.noPhoto', {}, { defaultValue: 'No photo' })}
            </span>
          </div>
        )}
        <div className={cm.cn('absolute top-4 right-4 z-10')}>
          <button
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              'glass-card text-error shadow-sm',
            )}
            onClick={(e) => {
              e.stopPropagation()
              onRemove(property.id)
            }}
            aria-label={t('common.remove', {}, { defaultValue: 'Remove' })}
          >
            <span
              className={cm.cn('material-symbols-outlined filled-icon')}
              style={{ fontVariationSettings: "'FILL' 1" }}
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
              {formatPrice(property.price)}
            </span>
          </div>
        </div>
      </div>
      <div className={cm.cn(cm.sp('pt', 6), cm.sp('pb', 2))}>
        <h3
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 1),
            'font-headline text-on-surface',
          )}
        >
          {property.title}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
          {property.address}
          {property.city ? `, ${property.city}` : ''}
          {property.state ? `, ${property.state}` : ''}
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
              'savedPropertyCard.bedroomCount',
              { count: property.bedrooms },
              { defaultValue: '{{count}} beds' },
            )}
          </span>
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>bathtub</span>
            {t(
              'savedPropertyCard.bathroomCount',
              { count: property.bathrooms },
              { defaultValue: '{{count}} baths' },
            )}
          </span>
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>
              square_foot
            </span>
            {t(
              'savedPropertyCard.squareFeet',
              { area: property.square_feet.toLocaleString() },
              { defaultValue: '{{area}} sq ft' },
            )}
          </span>
        </div>
        <button
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            cm.w('full'),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'bg-surface-container-high text-on-surface-variant rounded-xl hover:bg-error-container hover:text-error transition-all duration-200',
          )}
          onClick={(e) => {
            e.stopPropagation()
            onRemove(property.id)
          }}
        >
          <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>delete</span>
          {t('common.remove', {}, { defaultValue: 'Remove' })}
        </button>
      </div>
    </div>
  )
}

export default SavedPropertyCard
export { SavedPropertyCard }
