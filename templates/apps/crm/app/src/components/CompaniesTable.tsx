import { getClassMap } from '@molecule/app-ui'

import CompaniesTableHead from './CompaniesTableHead.js'
import CompanyRow from './CompanyRow.js'

interface Company {
  id: string
  name: string
  domain: string | null
  industry: string | null
  size: string | null
  location: string | null
  total_revenue: number | null
  status: string | null
}

interface CompaniesTableProps {
  companies: Company[]
  loading: boolean
}

function CompaniesTable({ companies, loading }: CompaniesTableProps) {
  const cm = getClassMap()
  return (
    <div className={cm.w('full')}>
      <CompaniesTableHead />
      <div className={cm.cn(cm.sp('mt', 2), 'space-y-1.5')}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 4),
                  'grid grid-cols-12 items-center bg-surface-container-lowest rounded-xl shadow-sm animate-pulse',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center' }), 'col-span-4 gap-3')}>
                  <div className={cm.cn(cm.w(10), cm.h(10), 'rounded-lg bg-surface-container')} />
                  <div className={cm.cn(cm.flex1, 'space-y-1.5')}>
                    <div className={cm.cn(cm.h(3), cm.w(32), 'rounded bg-surface-container')} />
                    <div className={cm.cn(cm.h(2), cm.w(24), 'rounded bg-surface-container')} />
                  </div>
                </div>
                <div className={cm.fvac1f8b5c}>
                  <div className={cm.cn(cm.h(3), cm.w(16), 'rounded bg-surface-container')} />
                </div>
                <div className={cm.cn(cm.flex({ justify: 'end' }), 'col-span-1')}>
                  <div className={cm.cn(cm.h(3), cm.w(8), 'rounded bg-surface-container')} />
                </div>
                <div className={cm.cn(cm.flex({ justify: 'end' }), 'col-span-2')}>
                  <div className={cm.cn(cm.h(3), cm.w(12), 'rounded bg-surface-container')} />
                </div>
                <div className={cm.fvac1f8b5c}>
                  <div className={cm.cn(cm.h(3), cm.w(20), 'rounded bg-surface-container')} />
                </div>
                <div className={cm.fvac1f8b5b}>
                  <div
                    className={cm.cn(cm.h(5), cm.w(16), cm.roundedFull, 'bg-surface-container')}
                  />
                </div>
              </div>
            ))
          : companies.map((company) => <CompanyRow key={company.id} company={company} />)}
      </div>
    </div>
  )
}

export default CompaniesTable
export { CompaniesTable }
