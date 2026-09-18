import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const FEATURE_ICONS: Record<string, string> = {
  hardwood: 'layers',
  'central a': 'ac_unit',
  'air condition': 'ac_unit',
  garage: 'garage',
  deck: 'deck',
  patio: 'deck',
  fireplace: 'fireplace',
  smart: 'home_iot_device',
  pool: 'pool',
  laundry: 'local_laundry_service',
  washer: 'local_laundry_service',
  solar: 'solar_power',
  security: 'security',
  gym: 'fitness_center',
  balcony: 'balcony',
}
function getFeatureIcon(f: string): string {
  const l = f.toLowerCase()
  for (const [k, v] of Object.entries(FEATURE_ICONS)) if (l.includes(k)) return v
  return 'check_circle'
}
interface FeaturesProps {
  features: string[] | unknown
}
function toFeatureArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as string[]) : []
    } catch (_error) {
      // JSON.parse failed — value is not a valid array string, fall back to empty
      return []
    }
  }
  return []
}
export default function PropertyFeaturesSection({ features: featuresProp }: FeaturesProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const features = toFeatureArray(featuresProp)
  if (features.length === 0) return null
  return (
    <section>
      <h2
        className={cm.cn(
          cm.textSize('2xl'),
          cm.fontWeight('bold'),
          cm.sp('mb', 6),
          'font-headline',
        )}
      >
        {t('propertyFeaturesSection.title', {}, { defaultValue: 'Home Features' })}
      </h2>
      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'sm:grid-cols-2')}>
        {features.map((feature, i) => (
          <div
            key={i}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              cm.sp('p', 4),
              'bg-surface-container-lowest rounded-lg ambient-shadow',
            )}
          >
            <span
              className={cm.cn(
                'material-symbols-outlined',
                cm.textPrimary,
                'bg-primary/10',
                cm.sp('p', 2),
                'rounded-lg',
              )}
            >
              {getFeatureIcon(feature)}
            </span>
            <span className={cm.cn(cm.fontWeight('medium'))}>{feature}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
export { PropertyFeaturesSection }
