import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CompanyHeaderProps {
  id: string
  name: string
  industry: string | null
  website: string | null
  address: string | null
  status: string | null
}

export default function CompanyHeaderCard({ company }: { company: CompanyHeaderProps | null }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  if (!company) return null
  const statusLabel = company.status
    ? company.status.charAt(0).toUpperCase() + company.status.slice(1).replace('_', ' ')
    : t('status.active', {}, { defaultValue: 'Active' })
  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between', align: 'start' }),
        cm.sp('p', 8),
        'bg-surface-container-lowest rounded-3xl shadow-[0px_12px_32px_rgba(19,47,106,0.06)] md:flex-row gap-6 border-none',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-6')}>
        <div
          className={cm.cn(
            cm.w(20),
            cm.h(20),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-xl bg-primary-container text-primary shadow-sm overflow-hidden',
          )}
        >
          <span className={cm.cn(cm.textSize('3xl'), 'font-extrabold text-primary')}>
            {company.name.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div>
          <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 1), 'gap-3')}>
            <h2
              className={cm.cn(
                cm.textSize('2xl'),
                'font-extrabold text-on-surface tracking-tighter',
              )}
            >
              {company.name}
            </h2>
            <span
              className={cm.cn(
                cm.roundedFull,
                cm.fontWeight('bold'),
                'px-2.5 py-0.5 bg-tertiary-container text-on-tertiary-container text-[10px] uppercase tracking-wider',
              )}
            >
              {statusLabel}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', wrap: 'wrap' }),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'gap-x-6 gap-y-2 text-on-surface-variant',
            )}
          >
            {company.industry && (
              <span className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
                <span
                  className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}
                  data-icon="category"
                >
                  category
                </span>
                {company.industry}
              </span>
            )}
            {company.website && (
              <span className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
                <span
                  className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}
                  data-icon="language"
                >
                  language
                </span>
                {company.website}
              </span>
            )}
            {company.address && (
              <span className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
                <span
                  className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}
                  data-icon="location_on"
                >
                  location_on
                </span>
                {company.address.split(',').slice(0, 2).join(',')}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className={cm.cn(cm.flex({}), 'gap-3 w-full md:w-auto')}>
        <button
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'flex-1 md:flex-none px-5 py-2.5 bg-surface-container-high text-on-surface rounded-lg hover:bg-surface-container-highest transition-colors gap-2',
          )}
          onClick={() => navigate(`/companies/${company.id}/edit`)}
        >
          <span
            className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}
            data-icon="edit"
          >
            edit
          </span>
          {t('common.edit', {}, { defaultValue: 'Edit' })}
        </button>
        <button
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'flex-1 md:flex-none px-6 py-2.5 bg-primary text-white rounded-lg shadow-sm hover:brightness-110 transition-all gap-2',
          )}
          onClick={() => navigate(`/deals/new?companyId=${company.id}`)}
        >
          <span className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')} data-icon="add">
            add
          </span>
          {t('companyHeaderCard.newDeal', {}, { defaultValue: 'New Deal' })}
        </button>
      </div>
    </section>
  )
}
export { CompanyHeaderCard }
