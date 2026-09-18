import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Property {
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
  latitude: number
  longitude: number
  status: string
  listed_by_name?: string
}

interface SearchPropertyCardProps {
  property?: Property
  isSaved?: boolean
  onToggleSave?: (e: React.MouseEvent) => void
}

export default function SearchPropertyCard({
  property,
  isSaved,
  onToggleSave,
}: SearchPropertyCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (!property) return null

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price)
  }
  return (
    <article className={cm.cn('group relative')} data-mol-id="card-1">
      <button
        type="button"
        aria-label={`${property.address}, ${property.city}, ${property.state}`}
        className={cm.cn('absolute inset-0 z-[1]', cm.cursorPointer)}
        onClick={() => navigate(`/property/${property.id}`)}
      />
      <div
        className={cm.cn(
          'relative overflow-hidden',
          'rounded-xl',
          cm.sp('mb', 4),
          'aspect-[16/10] bg-surface-container',
        )}
      >
        <img
          alt={t('property.imageAlt', {}, { defaultValue: 'Property Image' })}
          className={cm.cn(
            cm.w('full'),
            cm.h('full'),
            'object-cover transition-transform duration-500 group-hover:scale-105',
          )}
          data-alt="modern eco-friendly house with large windows and timber cladding surrounded by lush temperate forest landscaping"
          src={property.photos?.[0] || 'https://picsum.photos/seed/SearchPropertyCard-1/1200/800'}
        />
        <div className={cm.cn('absolute top-4 left-4', cm.flex({ direction: 'col', gap: 'sm' }))}>
          {property.status === 'featured' && (
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                'bg-tertiary text-on-tertiary',
                cm.textSize('xs'),
                'rounded-md tracking-wider',
              )}
            >
              {t('property.featured', {}, { defaultValue: 'FEATURED' })}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleSave?.(e)
          }}
          className={cm.cn(
            'absolute top-4 right-4 z-[2] glass-card transition-colors shadow-sm',
            cm.w(9),
            cm.h(9),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            isSaved ? 'text-error' : 'text-primary-container hover:text-error',
          )}
          data-mol-id="fav-1"
          aria-pressed={isSaved}
          aria-label={
            isSaved
              ? t('property.unfavorite', {}, { defaultValue: 'Remove favorite' })
              : t('property.favorite', {}, { defaultValue: 'Save to favorites' })
          }
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}
          >
            favorite
          </span>
        </button>
        <div
          className={cm.cn(
            'absolute bottom-4 left-4',
            cm.sp('px', 3),
            'py-1.5 glass-card rounded-md shadow-sm',
          )}
        >
          <span
            className={cm.cn('font-headline font-extrabold', cm.textPrimary, cm.textSize('lg'))}
          >
            {formatPrice(property.price)}
          </span>
        </div>
      </div>
      <div className={cm.cn(cm.sp('px', 1))}>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 2))}>
          <div>
            <h3 className={cm.cn(cm.fontWeight('bold'), 'text-on-surface leading-tight')}>
              {property.address}, {property.city}, {property.state}
            </h3>
            <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-outline-variant')}>
              {property.title || property.property_type}
            </p>
          </div>
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.fontWeight('bold'),
              cm.sp('py', 1),
              'bg-surface-container-highest text-on-surface-variant',
              cm.textSize('xs'),
              'rounded-md',
            )}
          >
            {property.property_type?.toUpperCase()}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'md' }),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.sp('mt', 4),
            cm.sp('pt', 4),
            'text-on-surface-variant border-t border-outline-variant/10',
          )}
        >
          <span className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined opacity-60')}>
              bed
            </span>
            {t(
              'property.bedrooms',
              { count: property.bedrooms },
              { defaultValue: '{{count}} bed' },
            )}
          </span>
          <span className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined opacity-60')}>
              bathtub
            </span>
            {t(
              'property.bathrooms',
              { count: property.bathrooms },
              { defaultValue: '{{count}} bath' },
            )}
          </span>
          <span className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined opacity-60')}>
              square_foot
            </span>
            {t(
              'property.squareFeet',
              { count: property.square_feet.toLocaleString('en-US') },
              { defaultValue: '{{count}} sqft' },
            )}
          </span>
        </div>
        <div className={cm.cn(cm.sp('mt', 4), cm.flex({ align: 'center', gap: 'md' }))}>
          <img
            alt={t('property.agentImageAlt', {}, { defaultValue: 'Agent' })}
            className={cm.cn(cm.w(6), cm.h(6), cm.roundedFull, 'object-cover')}
            data-alt="portrait of a real estate agent with a friendly expression"
            src="https://picsum.photos/seed/SearchPropertyCard-2/1200/800"
          />
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              'text-[10px] text-outline uppercase tracking-widest',
            )}
          >
            {t(
              'property.listedBy',
              {
                // `name`, not `agent`: SearchPage.tsx renders this same key with
                // `{{name}}`. One key with two placeholder names means a single
                // translation can satisfy only one call site, and the other
                // renders the raw token.
                name:
                  property.listed_by_name ||
                  t('property.unknownAgent', {}, { defaultValue: 'Unknown Agent' }),
              },
              { defaultValue: 'Listed by {{name}}' },
            )}
          </span>
        </div>
      </div>
    </article>
  )
}
export { SearchPropertyCard }
