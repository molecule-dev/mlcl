/**
 * Thin shim around @molecule/app-faceted-search-react. The shared
 * package owns the sticky bar + segmented control + filter pill
 * primitives; this shim composes them with the property-specific
 * dropdown panels (price range, beds, type, more).
 */
import { FacetedSearchBar, FilterPill, SegmentedControl } from '@molecule/app-faceted-search-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Filters {
  q: string
  type: string
  min_price: string
  max_price: string
  bedrooms: string
  bathrooms: string
  sort_by: string
}

interface SearchFilterBarProps {
  filters?: Filters
  onFilterChange?: (key: keyof Filters, value: string) => void
  listingType?: 'buy' | 'rent'
  onListingTypeChange?: (type: 'buy' | 'rent') => void
}

function SearchFilterBar({
  filters,
  onFilterChange,
  listingType = 'buy',
  onListingTypeChange,
}: SearchFilterBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const priceLabel =
    filters?.min_price || filters?.max_price
      ? t(
          'filter.priceRange',
          {
            min: filters.min_price
              ? '$' + filters.min_price
              : t('common.any', {}, { defaultValue: 'Any' }),
            max: filters.max_price
              ? '$' + filters.max_price
              : t('common.any', {}, { defaultValue: 'Any' }),
          },
          { defaultValue: 'Price: {{min}} - {{max}}' },
        )
      : t('form.price', {}, { defaultValue: 'Price' })

  const bedsLabel = filters?.bedrooms
    ? t('filter.bedsCount', { count: filters.bedrooms }, { defaultValue: 'Beds: {{count}}+' })
    : t('filter.beds', {}, { defaultValue: 'Beds' })

  const typeLabel = filters?.type
    ? t(
        `filter.types.${filters.type}`,
        {},
        { defaultValue: filters.type.charAt(0).toUpperCase() + filters.type.slice(1) },
      )
    : t('filter.homeType', {}, { defaultValue: 'Home Type' })

  return (
    <FacetedSearchBar>
      <SegmentedControl
        value={listingType}
        onChange={(v) => onListingTypeChange?.(v)}
        options={[
          {
            value: 'buy',
            label: t('filter.buy', {}, { defaultValue: 'Buy' }),
            dataMolId: 'toggle-buy',
          },
          {
            value: 'rent',
            label: t('filter.rent', {}, { defaultValue: 'Rent' }),
            dataMolId: 'toggle-rent',
          },
        ]}
      />
      <div className={cm.cn(cm.h(8), 'w-px bg-outline-variant/30 hidden md:block')}></div>
      <FilterPill
        label={priceLabel}
        active={!!(filters?.min_price || filters?.max_price)}
        dataMolId="filter-price"
      >
        <div className={cm.cn(cm.stack(3))}>
          <div>
            <label
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                cm.sp('mb', 1),
                'text-on-surface-variant block',
              )}
            >
              {t('filter.minPrice', {}, { defaultValue: 'Min Price' })}
            </label>
            <input
              type="text"
              value={filters?.min_price || ''}
              onChange={(e) => onFilterChange?.('min_price', e.target.value)}
              placeholder={t('common.any', {}, { defaultValue: 'Any' })}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.surface,
                cm.textSize('sm'),
                cm.w('full'),
                'border border-outline-variant rounded-lg',
              )}
            />
          </div>
          <div>
            <label
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                cm.sp('mb', 1),
                'text-on-surface-variant block',
              )}
            >
              {t('filter.maxPrice', {}, { defaultValue: 'Max Price' })}
            </label>
            <input
              type="text"
              value={filters?.max_price || ''}
              onChange={(e) => onFilterChange?.('max_price', e.target.value)}
              placeholder={t('common.any', {}, { defaultValue: 'Any' })}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.surface,
                cm.textSize('sm'),
                cm.w('full'),
                'border border-outline-variant rounded-lg',
              )}
            />
          </div>
        </div>
      </FilterPill>
      <FilterPill label={bedsLabel} active={!!filters?.bedrooms} dataMolId="filter-beds">
        {['1', '2', '3', '4', '5'].map((num) => (
          <button
            key={num}
            onClick={() => onFilterChange?.('bedrooms', num)}
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'text-left rounded-lg',
              filters?.bedrooms === num
                ? 'bg-primary text-on-primary'
                : 'hover:bg-surface-container',
            )}
          >
            {t('filter.bedroomCount', { count: num }, { defaultValue: '{{count}}+' })}
          </button>
        ))}
      </FilterPill>
      <FilterPill label={typeLabel} active={!!filters?.type} dataMolId="filter-type">
        {['house', 'apartment', 'condo', 'townhouse'].map((type) => (
          <button
            key={type}
            onClick={() => onFilterChange?.('type', type)}
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'text-left rounded-lg capitalize',
              filters?.type === type ? 'bg-primary text-on-primary' : 'hover:bg-surface-container',
            )}
          >
            {t(
              `filter.types.${type}`,
              {},
              { defaultValue: type.charAt(0).toUpperCase() + type.slice(1) },
            )}
          </button>
        ))}
      </FilterPill>
      <FilterPill
        leadingIcon="tune"
        hideChevron
        label={t('filter.moreFilters', {}, { defaultValue: 'Filters' })}
        panelAlign="right"
        dataMolId="filter-more"
      >
        <div className={cm.cn(cm.stack(4))}>
          <div>
            <label
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                cm.sp('mb', 2),
                'text-on-surface-variant block',
              )}
            >
              {t('filter.bathrooms', {}, { defaultValue: 'Bathrooms' })}
            </label>
            <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
              {['1', '2', '3', '4'].map((num) => (
                <button
                  key={num}
                  onClick={() => onFilterChange?.('bathrooms', num)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.roundedFull,
                    cm.textSize('xs'),
                    filters?.bathrooms === num
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface border border-outline-variant',
                  )}
                >
                  {t('filter.bathroomCount', { count: num }, { defaultValue: '{{count}}+' })}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                cm.sp('mb', 2),
                'text-on-surface-variant block',
              )}
            >
              {t('filter.sortBy', {}, { defaultValue: 'Sort By' })}
            </label>
            <select
              value={filters?.sort_by || ''}
              onChange={(e) => onFilterChange?.('sort_by', e.target.value)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.surface,
                cm.textSize('sm'),
                cm.w('full'),
                'border border-outline-variant rounded-lg',
              )}
            >
              <option value="">
                {t('filter.sortOptions.default', {}, { defaultValue: 'Default' })}
              </option>
              <option value="price_asc">
                {t('filter.sortOptions.priceAsc', {}, { defaultValue: 'Price: Low to High' })}
              </option>
              <option value="price_desc">
                {t('filter.sortOptions.priceDesc', {}, { defaultValue: 'Price: High to Low' })}
              </option>
              <option value="newest">
                {t('filter.sortOptions.newest', {}, { defaultValue: 'Newest' })}
              </option>
            </select>
          </div>
        </div>
      </FilterPill>
    </FacetedSearchBar>
  )
}

export default SearchFilterBar
export { SearchFilterBar }
