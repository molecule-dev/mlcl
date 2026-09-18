/**
 * Company profile card — gradient logo square with company initial, name in
 * 2xl-extrabold, industry / location pill, employee + active-jobs stats row,
 * description clamp. Used on the Companies list and Dashboard "featured
 * companies" section.
 *
 * Translated from personal-finance's DashboardAccountOverview triad pattern
 * + DESIGN.md "Company Profile Card" anatomy (logo square, mono stats row,
 * navy industry pill).
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface CompanyProfile {
  id: string
  name: string
  logo_url?: string | null
  description?: string
  website?: string | null
  employee_count?: number | null
  contact_email?: string | null
  location?: string | null
  industry?: string | null
  active_job_count?: number
}

interface CompanyProfileCardProps {
  company: CompanyProfile
  variant?: 'compact' | 'feature'
}

export function CompanyProfileCard({ company, variant = 'compact' }: CompanyProfileCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const initial = (company.name || '?').slice(0, 1).toUpperCase()
  const isFeature = variant === 'feature'

  return (
    <Link
      to={`/companies/${company.id}`}
      className={cm.cn(
        cm.sp('p', 6),
        'group block rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'start', gap: 'md' }))}>
        {company.logo_url ? (
          <img
            src={company.logo_url}
            alt=""
            className={cm.cn(
              'h-16 w-16 shrink-0 rounded-xl border border-outline-variant/30 object-cover',
            )}
          />
        ) : (
          <span
            aria-hidden="true"
            className={cm.cn(
              'shrink-0 grid place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary font-extrabold text-on-primary shadow-md shadow-primary/20',
              isFeature ? 'h-20 w-20 text-3xl' : 'h-16 w-16 text-2xl',
            )}
          >
            {initial}
          </span>
        )}
        <div className={cm.cn('min-w-0 flex-1')}>
          <h3
            className={cm.cn(
              'font-extrabold tracking-tight text-on-surface group-hover:text-primary transition-colors',
              isFeature ? 'text-2xl' : 'text-xl',
            )}
          >
            {company.name}
          </h3>
          <div
            className={cm.cn(
              cm.sp('mt', 2),
              cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
              cm.textSize('xs'),
            )}
          >
            {company.industry ? (
              <span
                className={cm.cn(
                  'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-on-primary',
                )}
                style={{ backgroundColor: 'var(--mol-color-secondary)' }}
              >
                {company.industry}
              </span>
            ) : null}
            {company.location ? (
              <span
                className={cm.cn(
                  'inline-flex items-center gap-1 font-semibold text-on-surface-variant',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                  place
                </span>
                {company.location}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {company.description ? (
        <p className={cm.cn('mt-4 line-clamp-3 text-sm leading-relaxed text-on-surface-variant')}>
          {company.description}
        </p>
      ) : null}

      <div
        className={cm.cn(
          'mt-5 flex items-center gap-4 text-xs font-semibold text-on-surface-variant',
        )}
      >
        {typeof company.active_job_count === 'number' ? (
          <span className={cm.cn('inline-flex items-center gap-1 tabular-nums')}>
            <span
              className={cm.cn('material-symbols-outlined text-[16px] text-primary')}
              aria-hidden="true"
            >
              work
            </span>
            {t(
              'companyProfileCard.activeJobs',
              { count: company.active_job_count },
              { defaultValue: '{{count}} open roles' },
            )}
          </span>
        ) : null}
        {company.employee_count ? (
          <>
            <span className={cm.cn('opacity-50')}>·</span>
            <span className={cm.cn('inline-flex items-center gap-1 tabular-nums')}>
              <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                groups
              </span>
              {t(
                'companyProfileCard.employees',
                { count: company.employee_count.toLocaleString() },
                { defaultValue: '{{count}} employees' },
              )}
            </span>
          </>
        ) : null}
      </div>
    </Link>
  )
}
