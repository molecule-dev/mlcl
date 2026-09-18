import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface PropertyDetailsSectionProps {
  price: string
  bedrooms: string
  bathrooms: string
  squareFeet: string
  lotSize: string
  yearBuilt: string
  style: string
  onChange: (key: string, value: string) => void
}
export default function ListingEditorPropertyDetailsSection({
  price,
  bedrooms,
  bathrooms,
  squareFeet,
  lotSize,
  yearBuilt,
  style,
  onChange,
}: PropertyDetailsSectionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
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
        {t('listingEditorPropertyDetailsSection.title', {}, { defaultValue: 'Property Details' })}
      </h3>
      <div className={cm.cn(cm.grid({ cols: 3, gap: 'lg' }))}>
        <div
          className={cm.cn(cm.sp('p', 6), cm.stack(4), 'bg-surface-container-lowest rounded-xl')}
        >
          <div>
            <label
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                cm.sp('px', 1),
                'block text-[10px] uppercase tracking-widest text-foreground-secondary',
              )}
            >
              {t(
                'listingEditorPropertyDetailsSection.priceLabel',
                {},
                { defaultValue: 'Price ($)' },
              )}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 3),
                cm.sp('px', 4),
                cm.fontWeight('semibold'),
                cm.textSize('lg'),
                'bg-surface-container-low border-0 rounded-xl text-on-surface',
              )}
              placeholder={t(
                'listingEditorPropertyDetailsSection.pricePlaceholder',
                {},
                { defaultValue: '12,500,000' },
              )}
              type="number"
              value={price}
              onChange={(e) => onChange('price', e.target.value)}
            />
          </div>
          <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
            <div>
              <label
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('mb', 2),
                  cm.sp('px', 1),
                  'block text-[10px] uppercase tracking-widest text-foreground-secondary',
                )}
              >
                {t(
                  'listingEditorPropertyDetailsSection.bedroomsLabel',
                  {},
                  { defaultValue: 'Bedrooms' },
                )}
              </label>
              <input
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('py', 3),
                  cm.sp('px', 4),
                  'bg-surface-container-low border-0 rounded-xl text-on-surface',
                )}
                placeholder={t(
                  'listingEditorPropertyDetailsSection.bedroomsPlaceholder',
                  {},
                  { defaultValue: '6' },
                )}
                type="number"
                value={bedrooms}
                onChange={(e) => onChange('bedrooms', e.target.value)}
              />
            </div>
            <div>
              <label
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('mb', 2),
                  cm.sp('px', 1),
                  'block text-[10px] uppercase tracking-widest text-foreground-secondary',
                )}
              >
                {t(
                  'listingEditorPropertyDetailsSection.bathroomsLabel',
                  {},
                  { defaultValue: 'Bathrooms' },
                )}
              </label>
              <input
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('py', 3),
                  cm.sp('px', 4),
                  'bg-surface-container-low border-0 rounded-xl text-on-surface',
                )}
                placeholder={t(
                  'listingEditorPropertyDetailsSection.bathroomsPlaceholder',
                  {},
                  { defaultValue: '8' },
                )}
                type="number"
                value={bathrooms}
                onChange={(e) => onChange('bathrooms', e.target.value)}
              />
            </div>
          </div>
        </div>
        <div
          className={cm.cn(cm.sp('p', 6), cm.stack(4), 'bg-surface-container-lowest rounded-xl')}
        >
          <div>
            <label
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                cm.sp('px', 1),
                'block text-[10px] uppercase tracking-widest text-foreground-secondary',
              )}
            >
              {t(
                'listingEditorPropertyDetailsSection.squareFeetLabel',
                {},
                { defaultValue: 'Square Feet' },
              )}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 3),
                cm.sp('px', 4),
                'bg-surface-container-low border-0 rounded-xl text-on-surface',
              )}
              placeholder={t(
                'listingEditorPropertyDetailsSection.squareFeetPlaceholder',
                {},
                { defaultValue: '10,250' },
              )}
              type="number"
              value={squareFeet}
              onChange={(e) => onChange('square_feet', e.target.value)}
            />
          </div>
          <div>
            <label
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                cm.sp('px', 1),
                'block text-[10px] uppercase tracking-widest text-foreground-secondary',
              )}
            >
              {t(
                'listingEditorPropertyDetailsSection.lotSizeLabel',
                {},
                { defaultValue: 'Lot Size (acres)' },
              )}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 3),
                cm.sp('px', 4),
                'bg-surface-container-low border-0 rounded-xl text-on-surface',
              )}
              placeholder={t(
                'listingEditorPropertyDetailsSection.lotSizePlaceholder',
                {},
                { defaultValue: '2.4' },
              )}
              type="number"
              value={lotSize}
              onChange={(e) => onChange('lot_size', e.target.value)}
            />
          </div>
        </div>
        <div
          className={cm.cn(cm.sp('p', 6), cm.stack(4), 'bg-surface-container-lowest rounded-xl')}
        >
          <div>
            <label
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                cm.sp('px', 1),
                'block text-[10px] uppercase tracking-widest text-foreground-secondary',
              )}
            >
              {t(
                'listingEditorPropertyDetailsSection.yearBuiltLabel',
                {},
                { defaultValue: 'Year Built' },
              )}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 3),
                cm.sp('px', 4),
                'bg-surface-container-low border-0 rounded-xl text-on-surface',
              )}
              placeholder={t(
                'listingEditorPropertyDetailsSection.yearBuiltPlaceholder',
                {},
                { defaultValue: '2024' },
              )}
              type="number"
              value={yearBuilt}
              onChange={(e) => onChange('year_built', e.target.value)}
            />
          </div>
          <div className={cm.sp('pt', 2)}>
            <label
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                cm.sp('px', 1),
                'block text-[10px] uppercase tracking-widest text-foreground-secondary',
              )}
            >
              {t(
                'listingEditorPropertyDetailsSection.styleLabel',
                {},
                { defaultValue: 'Architectural Style' },
              )}
            </label>
            <select
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 3),
                cm.sp('px', 4),
                cm.fontWeight('medium'),
                'bg-surface-container-low border-0 rounded-xl text-on-surface appearance-none',
              )}
              value={style}
              onChange={(e) => onChange('style', e.target.value)}
            >
              <option>
                {t(
                  'listingEditorPropertyDetailsSection.styleContemporary',
                  {},
                  { defaultValue: 'Contemporary' },
                )}
              </option>
              <option>
                {t(
                  'listingEditorPropertyDetailsSection.styleMidCentury',
                  {},
                  { defaultValue: 'Mid-Century' },
                )}
              </option>
              <option>
                {t(
                  'listingEditorPropertyDetailsSection.styleMediterranean',
                  {},
                  { defaultValue: 'Mediterranean' },
                )}
              </option>
              <option>
                {t('listingEditorPropertyDetailsSection.styleTudor', {}, { defaultValue: 'Tudor' })}
              </option>
            </select>
          </div>
        </div>
      </div>
    </section>
  )
}
export { ListingEditorPropertyDetailsSection }
