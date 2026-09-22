import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SpecsProps {
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number
  yearBuilt?: number
}

/**
 * Postgres NUMERIC columns arrive as strings ("2.0000") — normalize to a
 * number and trim trailing zeros so the UI shows "2 bath", not "2.0000 bath".
 * Non-numeric strings and nulls return null (the caller renders "—").
 */
function asSpecNumber(v: number | string | null | undefined): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function trimNum(n: number): string {
  return String(Math.round(n * 100) / 100)
}
export default function PropertySpecsRow({
  bedrooms,
  bathrooms,
  squareFeet,
  yearBuilt,
}: SpecsProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const na = t('common.notAvailable', {}, { defaultValue: '—' })
  const beds = asSpecNumber(bedrooms)
  const baths = asSpecNumber(bathrooms)
  const sqft = asSpecNumber(squareFeet)
  const year = asSpecNumber(yearBuilt)
  return (
    <div
      className={cm.cn(
        cm.grid({ cols: 2, gap: 'md' }),
        cm.sp('p', 6),
        'md:grid-cols-4 bg-surface-container-low rounded-2xl border-none',
      )}
      data-mol-id="specs-row"
    >
      <div className={cm.flex({ direction: 'col' })}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            cm.sp('mb', 1),
            'text-on-surface-variant uppercase tracking-wider',
          )}
        >
          {t('propertySpecs.bedroomsLabel', {}, { defaultValue: 'Bedrooms' })}
        </span>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span className={cm.cn(cm.textPrimary, 'material-symbols-outlined')}>bed</span>
          <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t(
              'propertySpecs.bedrooms',
              { count: beds != null ? trimNum(beds) : na },
              { defaultValue: '{{count}} bed' },
            )}
          </span>
        </div>
      </div>
      <div className={cm.flex({ direction: 'col' })}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            cm.sp('mb', 1),
            'text-on-surface-variant uppercase tracking-wider',
          )}
        >
          {t('propertySpecs.bathroomsLabel', {}, { defaultValue: 'Bathrooms' })}
        </span>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span className={cm.cn(cm.textPrimary, 'material-symbols-outlined')}>bathtub</span>
          <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t(
              'propertySpecs.bathrooms',
              { count: baths != null ? trimNum(baths) : na },
              { defaultValue: '{{count}} bath' },
            )}
          </span>
        </div>
      </div>
      <div className={cm.flex({ direction: 'col' })}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            cm.sp('mb', 1),
            'text-on-surface-variant uppercase tracking-wider',
          )}
        >
          {t('propertySpecs.squareFeetLabel', {}, { defaultValue: 'Square Feet' })}
        </span>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span className={cm.cn(cm.textPrimary, 'material-symbols-outlined')}>square_foot</span>
          <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t(
              'propertySpecs.squareFeet',
              { count: sqft != null ? sqft.toLocaleString() : na },
              { defaultValue: '{{count}} sqft' },
            )}
          </span>
        </div>
      </div>
      <div className={cm.flex({ direction: 'col' })}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            cm.sp('mb', 1),
            'text-on-surface-variant uppercase tracking-wider',
          )}
        >
          {t('propertySpecs.yearBuiltLabel', {}, { defaultValue: 'Built Year' })}
        </span>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span className={cm.cn(cm.textPrimary, 'material-symbols-outlined')}>calendar_today</span>
          <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t(
              'propertySpecs.yearBuilt',
              { year: year != null ? trimNum(year) : na },
              { defaultValue: '{{year}}' },
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
export { PropertySpecsRow }
