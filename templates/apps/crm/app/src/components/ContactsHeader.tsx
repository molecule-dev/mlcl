import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type ContactFilter = 'all' | 'leads' | 'customers' | 'partners'

interface ContactsHeaderProps {
  onFilterChange?: (filter: ContactFilter) => void
}

export default function ContactsHeader({ onFilterChange }: ContactsHeaderProps = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [active, setActive] = useState<ContactFilter>('all')

  const handleFilter = (filter: ContactFilter) => {
    setActive(filter)
    onFilterChange?.(filter)
  }

  return (
    <div className={cm.cn(cm.flex({ justify: 'between', align: 'end' }), cm.sp('mb', 6))}>
      <div>
        <h2
          className={cm.cn(
            cm.textSize('3xl'),
            cm.sp('mb', 2),
            'font-extrabold text-on-surface tracking-tight',
          )}
        >
          {t('contactsHeader.title', {}, { defaultValue: 'Contacts' })}
        </h2>
        <p className={cm.cn(cm.fontWeight('medium'), 'text-on-surface-variant')}>
          {t(
            'contactsHeader.subtitle',
            {},
            {
              defaultValue:
                'Manage your relationships and track interactions across your pipeline.',
            },
          )}
        </p>
      </div>
      <div
        className={cm.cn(
          cm.flex({}),
          'gap-2 bg-surface-container-low p-1.5 rounded-xl shadow-inner',
        )}
      >
        <button
          className={
            active === 'all'
              ? 'px-5 py-2 text-sm font-semibold rounded-lg bg-surface text-blue-600 shadow-sm'
              : 'px-5 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface/50 rounded-lg transition-all'
          }
          data-mol-id="filter-all"
          onClick={() => handleFilter('all')}
        >
          {t('status.all', {}, { defaultValue: 'All' })}
        </button>
        <button
          className={
            active === 'leads'
              ? 'px-5 py-2 text-sm font-semibold rounded-lg bg-surface text-blue-600 shadow-sm'
              : 'px-5 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface/50 rounded-lg transition-all'
          }
          data-mol-id="filter-leads"
          onClick={() => handleFilter('leads')}
        >
          {t('common.leads', {}, { defaultValue: 'Leads' })}
        </button>
        <button
          className={
            active === 'customers'
              ? 'px-5 py-2 text-sm font-semibold rounded-lg bg-surface text-blue-600 shadow-sm'
              : 'px-5 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface/50 rounded-lg transition-all'
          }
          data-mol-id="filter-customers"
          onClick={() => handleFilter('customers')}
        >
          {t('common.customers', {}, { defaultValue: 'Customers' })}
        </button>
        <button
          className={
            active === 'partners'
              ? 'px-5 py-2 text-sm font-semibold rounded-lg bg-surface text-blue-600 shadow-sm'
              : 'px-5 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface/50 rounded-lg transition-all'
          }
          data-mol-id="filter-partners"
          onClick={() => handleFilter('partners')}
        >
          {t('common.partners', {}, { defaultValue: 'Partners' })}
        </button>
      </div>
    </div>
  )
}
export { ContactsHeader }
