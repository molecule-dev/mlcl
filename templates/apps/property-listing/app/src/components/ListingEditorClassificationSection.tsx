import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ClassificationSectionProps {
  propertyType: string
  listingStatus: string
  onPropertyTypeChange: (v: string) => void
  onListingStatusChange: (v: string) => void
}
export default function ListingEditorClassificationSection({
  propertyType,
  listingStatus,
  onPropertyTypeChange,
  onListingStatusChange,
}: ClassificationSectionProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <section>
      <h3
        className={cm.cn(
          'font-headline text-on-surface',
          cm.textSize('xl'),
          cm.fontWeight('bold'),
          cm.sp('mb', 4),
        )}
      >
        {t('listingEditor.classification.title', {}, { defaultValue: 'Classification' })}
      </h3>
      <div className={cm.stack(4)}>
        <div>
          <label
            className={cm.cn(
              'block text-[10px] uppercase tracking-widest text-foreground-secondary',
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              cm.sp('px', 1),
            )}
          >
            {t(
              'listingEditor.classification.propertyTypeLabel',
              {},
              { defaultValue: 'Property Type' },
            )}
          </label>
          <div className={cm.grid({ cols: 3, gap: 'md' })}>
            {(
              [
                ['house', t('propertyType.house', {}, { defaultValue: 'House' })],
                ['condo', t('propertyType.condo', {}, { defaultValue: 'Condo / Loft' })],
                ['townhouse', t('propertyType.townhouse', {}, { defaultValue: 'Townhouse' })],
                ['apartment', t('propertyType.apartment', {}, { defaultValue: 'Apartment' })],
                ['land', t('propertyType.land', {}, { defaultValue: 'Land' })],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onPropertyTypeChange(value)}
                className={cm.cn(
                  cm.sp('py', 3),
                  cm.sp('px', 4),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-xl',
                  propertyType === value
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-highest text-foreground-secondary hover:bg-surface-container-high',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label
            className={cm.cn(
              'block text-[10px] uppercase tracking-widest text-foreground-secondary',
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              cm.sp('px', 1),
            )}
          >
            {t(
              'listingEditor.classification.listingStatusLabel',
              {},
              { defaultValue: 'Listing Status' },
            )}
          </label>
          <select
            className={cm.cn(
              'bg-surface-container-low border-0 rounded-xl text-on-surface appearance-none',
              cm.w('full'),
              cm.sp('py', 4),
              cm.sp('px', 6),
              cm.fontWeight('medium'),
            )}
            value={listingStatus}
            onChange={(e) => onListingStatusChange(e.target.value)}
          >
            <option value="active">{t('status.active', {}, { defaultValue: 'Active' })}</option>
            <option value="pending">{t('status.pending', {}, { defaultValue: 'Pending' })}</option>
            <option value="sold">{t('listingStatus.sold', {}, { defaultValue: 'Sold' })}</option>
            <option value="inactive">
              {t('listingStatus.inactive', {}, { defaultValue: 'Inactive' })}
            </option>
          </select>
        </div>
      </div>
    </section>
  )
}
export { ListingEditorClassificationSection }
