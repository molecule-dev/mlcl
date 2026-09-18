import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
export default function LeadsFilterBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [activeFilter, setActiveFilter] = useState('all')
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  return (
    <section className={cm.cn(cm.flex({ wrap: 'wrap', align: 'center', gap: 'md' }))}>
      <button
        onClick={() => setActiveFilter('all')}
        className={cm.cn(
          cm.sp('px', 5),
          cm.sp('py', 2),
          cm.roundedFull,
          cm.textSize('sm'),
          'transition-all duration-300',
          activeFilter === 'all'
            ? cm.cn(cm.fontWeight('semibold'), 'bg-primary-fixed text-on-primary-fixed')
            : cm.cn(
                cm.fontWeight('medium'),
                'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest',
              ),
        )}
      >
        {t('status.all', {}, { defaultValue: 'All' })}
      </button>
      <button
        onClick={() => setActiveFilter('new')}
        className={cm.cn(
          cm.sp('px', 5),
          cm.sp('py', 2),
          cm.roundedFull,
          cm.textSize('sm'),
          'transition-all duration-300',
          activeFilter === 'new'
            ? cm.cn(cm.fontWeight('semibold'), 'bg-primary-fixed text-on-primary-fixed')
            : cm.cn(
                cm.fontWeight('medium'),
                'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest',
              ),
        )}
      >
        {t('status.new', {}, { defaultValue: 'New' })}
      </button>
      <button
        onClick={() => setActiveFilter('contacted')}
        className={cm.cn(
          cm.sp('px', 5),
          cm.sp('py', 2),
          cm.roundedFull,
          cm.textSize('sm'),
          'transition-all duration-300',
          activeFilter === 'contacted'
            ? cm.cn(cm.fontWeight('semibold'), 'bg-primary-fixed text-on-primary-fixed')
            : cm.cn(
                cm.fontWeight('medium'),
                'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest',
              ),
        )}
      >
        {t('leadsFilterBar.contacted', {}, { defaultValue: 'Contacted' })}
      </button>
      <button
        onClick={() => setActiveFilter('qualified')}
        className={cm.cn(
          cm.sp('px', 5),
          cm.sp('py', 2),
          cm.roundedFull,
          cm.textSize('sm'),
          'transition-all duration-300',
          activeFilter === 'qualified'
            ? cm.cn(cm.fontWeight('semibold'), 'bg-primary-fixed text-on-primary-fixed')
            : cm.cn(
                cm.fontWeight('medium'),
                'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest',
              ),
        )}
      >
        {t('leadsFilterBar.qualified', {}, { defaultValue: 'Qualified' })}
      </button>
      <button
        onClick={() => setActiveFilter('lost')}
        className={cm.cn(
          cm.sp('px', 5),
          cm.sp('py', 2),
          cm.roundedFull,
          cm.textSize('sm'),
          'transition-all duration-300',
          activeFilter === 'lost'
            ? cm.cn(cm.fontWeight('semibold'), 'bg-primary-fixed text-on-primary-fixed')
            : cm.cn(
                cm.fontWeight('medium'),
                'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest',
              ),
        )}
      >
        {t('leadsFilterBar.lost', {}, { defaultValue: 'Lost' })}
      </button>
      <div className={cm.cn('ml-auto', cm.flex({ align: 'center', gap: 'md' }))}>
        <button
          onClick={() => setShowMoreFilters(!showMoreFilters)}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'text-on-surface-variant hover:text-primary transition-colors',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}
            data-icon="filter_list"
          >
            filter_list
          </span>

          {t('leadsFilterBar.moreFilters', {}, { defaultValue: 'More Filters' })}
        </button>
      </div>
    </section>
  )
}
export { LeadsFilterBar }
