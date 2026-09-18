const AVATAR_COLORS = [
  'var(--mol-color-primary)',
  'var(--mol-color-error)',
  'var(--mol-color-success)',
  'var(--mol-color-secondary)',
  'var(--mol-color-warning)',
  'var(--mol-color-info)',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatRevenue(value: number | null, fallback: string): string {
  if (value == null) return fallback
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toLocaleString()}`
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  customer: {
    bg: 'var(--color-status-customer-bg)',
    color: 'var(--color-status-customer-text)',
    label: 'CUSTOMER',
  },
  prospect: {
    bg: 'var(--color-status-prospect-bg)',
    color: 'var(--color-status-prospect-text)',
    label: 'PROSPECT',
  },
  partner: {
    bg: 'var(--color-status-partner-bg)',
    color: 'var(--color-status-partner-text)',
    label: 'PARTNER',
  },
  churned: {
    bg: 'var(--color-status-churned-bg)',
    color: 'var(--color-status-churned-text)',
    label: 'CHURNED',
  },
}

interface CompanyRowProps {
  company: {
    id: string
    name: string
    domain: string | null
    industry: string | null
    size: string | null
    location: string | null
    total_revenue: number | null
    status: string | null
  }
}

import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function CompanyRow({ company }: CompanyRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const initial = company.name.charAt(0).toUpperCase()
  const avatarColor = getAvatarColor(company.name)
  const statusStyle = company.status ? STATUS_STYLES[company.status] : null
  return (
    <button
      type="button"
      className={cm.cn(
        cm.grid({ cols: 12 }),
        cm.sp('px', 6),
        cm.sp('py', 4),
        cm.cursorPointer,
        'w-full text-left items-center bg-surface-container-lowest rounded-xl hover:bg-surface-container-low transition-all duration-200 shadow-sm group',
      )}
      onClick={() => navigate(`/companies/${company.id}`)}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), 'col-span-4 gap-3')}>
        <div
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.fontWeight('bold'),
            'rounded-lg bg-surface-container group-hover:bg-surface transition-colors',
          )}
          style={{ color: avatarColor }}
        >
          {initial}
        </div>
        <div className={cm.fv92852dd5}>
          <p
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface truncate')}
          >
            {company.name}
          </p>
          <p className={cm.fvd6c0b3bf}>{company.domain ?? ''}</p>
        </div>
      </div>
      <div className={cm.cn(cm.textSize('sm'), 'col-span-2 text-on-surface-variant')}>
        {company.industry ?? t('common.noValue', {}, { defaultValue: '—' })}
      </div>
      <div className={cm.cn(cm.textRight, cm.textSize('sm'), 'col-span-1 text-on-surface')}>
        {company.size ?? t('common.noValue', {}, { defaultValue: '—' })}
      </div>
      <div
        className={cm.cn(
          cm.textRight,
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'col-span-2 text-on-surface',
        )}
      >
        {formatRevenue(company.total_revenue, t('common.noValue', {}, { defaultValue: '—' }))}
      </div>
      <div
        className={cm.cn(cm.sp('px', 4), cm.textSize('sm'), 'col-span-2 text-on-surface-variant')}
      >
        {company.location ?? t('common.noValue', {}, { defaultValue: '—' })}
      </div>
      <div className={cm.fvac1f8b5b}>
        {statusStyle ? (
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'text-[10px]',
            )}
            style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
          >
            {t(`companyRow.status.${company.status}`, {}, { defaultValue: statusStyle.label })}
          </span>
        ) : (
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'bg-success-light text-success text-[10px]',
            )}
          >
            {t('companyRow.status.active', {}, { defaultValue: 'ACTIVE' })}
          </span>
        )}
      </div>
    </button>
  )
}
export { CompanyRow }
