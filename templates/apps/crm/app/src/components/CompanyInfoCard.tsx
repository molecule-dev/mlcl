import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function CompanyInfoCard({
  company,
}: {
  company: {
    address: string | null
    phone: string | null
    website: string | null
    employee_count: number | null
    notes: string | null
  } | null
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  if (!company) return null
  return (
    <>
      {/* Company Information Card */}
      <div
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-3xl shadow-[0px_12px_32px_rgba(19,47,106,0.06)] border-none',
        )}
      >
        <h3
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.sp('mb', 6),
            cm.flex({ align: 'center' }),
            'text-on-surface gap-2',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined', cm.textPrimary)}
            data-icon="info"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            info
          </span>
          {t('companyInfoCard.title', {}, { defaultValue: 'Company Information' })}
        </h3>
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'none' }), 'md:grid-cols-2 gap-x-8 gap-y-6')}>
          {company.address && (
            <div className={cm.stack(1)}>
              <label
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] text-on-surface-variant uppercase tracking-widest block',
                )}
              >
                {t('companyInfoCard.headquarters', {}, { defaultValue: 'Headquarters' })}
              </label>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
                {company.address}
              </p>
            </div>
          )}
          {company.phone && (
            <div className={cm.stack(1)}>
              <label
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] text-on-surface-variant uppercase tracking-widest block',
                )}
              >
                {t('companyInfoCard.phoneNumber', {}, { defaultValue: 'Phone Number' })}
              </label>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
                {company.phone}
              </p>
            </div>
          )}
          {company.website && (
            <div className={cm.stack(1)}>
              <label
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] text-on-surface-variant uppercase tracking-widest block',
                )}
              >
                {t('companyInfoCard.website', {}, { defaultValue: 'Website' })}
              </label>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.textPrimary)}>
                {company.website}
              </p>
            </div>
          )}
          {company.employee_count != null && (
            <div className={cm.stack(1)}>
              <label
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] text-on-surface-variant uppercase tracking-widest block',
                )}
              >
                {t('companyInfoCard.organizationSize', {}, { defaultValue: 'Organization Size' })}
              </label>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
                {t(
                  'companyInfoCard.employeeCount',
                  { count: company.employee_count.toLocaleString() },
                  { defaultValue: '{{count}} Employees' },
                )}
              </p>
            </div>
          )}
          {company.notes && (
            <div className={cm.cn(cm.stack(1), 'col-span-2')}>
              <label
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] text-on-surface-variant uppercase tracking-widest block',
                )}
              >
                {t('form.notes', {}, { defaultValue: 'Notes' })}
              </label>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
                {company.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default CompanyInfoCard
export { CompanyInfoCard }
