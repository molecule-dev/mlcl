import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface AmenitiesSectionProps {
  features: string[]
  onToggleFeature: (feature: string) => void
}
function ListingEditorAmenitiesSection({ features, onToggleFeature }: AmenitiesSectionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const AMENITIES = [
    { key: 'pool', icon: 'pool', label: t('amenities.pool', {}, { defaultValue: 'Pool' }) },
    { key: 'garage', icon: 'garage', label: t('amenities.garage', {}, { defaultValue: 'Garage' }) },
    {
      key: 'central_ac',
      icon: 'ac_unit',
      label: t('amenities.centralAc', {}, { defaultValue: 'Central AC' }),
    },
    {
      key: 'fireplace',
      icon: 'fireplace',
      label: t('amenities.fireplace', {}, { defaultValue: 'Fireplace' }),
    },
    {
      key: 'smart_home',
      icon: 'home_iot_device',
      label: t('amenities.smartHome', {}, { defaultValue: 'Smart Home' }),
    },
    {
      key: 'wine_cellar',
      icon: 'wine_bar',
      label: t('amenities.wineCellar', {}, { defaultValue: 'Wine Cellar' }),
    },
    {
      key: 'private_gym',
      icon: 'fitness_center',
      label: t('amenities.privateGym', {}, { defaultValue: 'Private Gym' }),
    },
  ]
  return (
    <section>
      <h3
        className={cm.cn(
          cm.textSize('xl'),
          cm.fontWeight('bold'),
          cm.sp('mb', 4),
          'font-headline text-on-surface',
        )}
      >
        {t('listingEditorAmenities.sectionTitle', {}, { defaultValue: 'Amenities & Features' })}
      </h3>
      <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'md' }))}>
        {AMENITIES.map((amenity) => {
          const isSelected = features.includes(amenity.key)
          return (
            <button
              key={amenity.key}
              onClick={() => onToggleFeature(amenity.key)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 5),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'py-2.5 uppercase tracking-wider transition-colors',
                isSelected
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-highest text-foreground-secondary hover:bg-primary-container hover:text-on-primary-container',
              )}
            >
              <span
                className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                style={isSelected ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {amenity.icon}
              </span>
              {amenity.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default ListingEditorAmenitiesSection
export { ListingEditorAmenitiesSection }
