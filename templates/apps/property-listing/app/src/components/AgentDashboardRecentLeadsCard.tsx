import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  property_title: string
  status: string
}

const LEAD_AVATAR_COLORS = [
  'bg-success-light text-success',
  'bg-secondary-container text-on-secondary-container',
  'bg-surface-secondary text-foreground',
  'bg-tertiary-container text-on-tertiary-container',
]
function getLeadStatusBadge(status: string) {
  const s = (status || '').toLowerCase().replace(/_/g, '-')
  if (s === 'new' || s === 'new-lead') return { type: 'new', cls: 'bg-success-light text-success' }
  if (s === 'follow-up' || s === 'followup')
    return { type: 'followUp', cls: 'bg-secondary-fixed text-on-secondary-fixed-variant' }
  if (s === 'negotiation')
    return { type: 'negotiation', cls: 'bg-tertiary-fixed text-on-tertiary-fixed-variant' }
  if (s === 'closed')
    return { type: 'closed', cls: 'bg-surface-container-highest text-foreground-secondary' }
  return { type: 'unknown', raw: status, cls: 'bg-surface-secondary text-foreground-secondary' }
}

function AgentDashboardRecentLeadsCard({ leads = [] }: { leads?: Lead[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [filterOpen, setFilterOpen] = useState(false)

  const statusLabels = {
    new: t('recentLeadsCard.status.new', {}, { defaultValue: 'NEW LEAD' }),
    followUp: t('recentLeadsCard.status.followUp', {}, { defaultValue: 'FOLLOW-UP' }),
    negotiation: t('recentLeadsCard.status.negotiation', {}, { defaultValue: 'NEGOTIATION' }),
    closed: t('recentLeadsCard.status.closed', {}, { defaultValue: 'CLOSED' }),
  }

  const getLeadInitials = (name: string) => {
    const fallback = t('common.unknown', {}, { defaultValue: '?' })
    return (
      (name || fallback)
        .split(' ')
        .map((w: string) => w[0] || '')
        .join('')
        .toUpperCase()
        .slice(0, 2) || fallback
    )
  }

  const handleExportCSV = () => {
    const headers = [
      t('form.name', {}, { defaultValue: 'Name' }),
      t('auth.forgotPassword.email', {}, { defaultValue: 'Email' }),
      t('form.phone', {}, { defaultValue: 'Phone' }),
      t('common.property', {}, { defaultValue: 'Property' }),
      t('nav.status', {}, { defaultValue: 'Status' }),
    ]
    const rows = leads.map((l) => [l.name, l.email, l.phone, l.property_title, l.status])
    const csv = [headers, ...rows]
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = t('recentLeadsCard.exportFilename', {}, { defaultValue: 'leads.csv' })
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleContact = () => {
    navigate('/admin/leads')
  }
  return (
    <section
      className={cm.cn(
        // min-w-0: a grid item defaults to min-width:auto, so the table's
        // intrinsic width would push this card (and the page) past 390px
        // instead of scrolling inside overflow-x-auto.
        'col-span-12 min-w-0 bg-surface-container-lowest rounded-xl shadow-sm border border-border overflow-hidden',
      )}
      data-mol-id="recent_leads_card"
    >
      <div
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 6),
          cm.flex({ align: 'center', justify: 'between' }),
          'border-b border-border',
        )}
      >
        <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-success')}>
          {t('recentLeadsCard.title', {}, { defaultValue: 'Recent Leads' })}
        </h3>
        <div className={cm.flex({ gap: 'sm' })}>
          <button
            type="button"
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen((o) => !o)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface-secondary text-foreground-secondary py-1.5 rounded-md hover:bg-border transition-colors',
            )}
          >
            {t('common.filter', {}, { defaultValue: 'Filter' })}
          </button>
          <button
            onClick={handleExportCSV}
            className={cm.cn(
              cm.sp('px', 4),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-primary text-on-primary py-1.5 rounded-md hover:opacity-90 transition-colors',
            )}
          >
            {t('common.exportCsv', {}, { defaultValue: 'Export CSV' })}
          </button>
        </div>
      </div>
      <div className={cm.cn('overflow-x-auto')}>
        <table
          className={cm.cn(cm.w('full'), 'text-left border-collapse')}
          data-mol-id="leads_table"
        >
          <thead>
            <tr className={cm.cn('bg-surface-secondary/50')}>
              <th
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 4),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-foreground-secondary uppercase tracking-wider',
                )}
              >
                {t('recentLeadsCard.columnLeadName', {}, { defaultValue: 'Lead Name' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 4),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-foreground-secondary uppercase tracking-wider',
                )}
              >
                {t(
                  'recentLeadsCard.columnPropertyInterest',
                  {},
                  { defaultValue: 'Property Interest' },
                )}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 4),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-foreground-secondary uppercase tracking-wider',
                )}
              >
                {t('recentLeadsCard.columnContactInfo', {}, { defaultValue: 'Contact Info' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'text-foreground-secondary uppercase tracking-widest',
                )}
              >
                {t('nav.status', {}, { defaultValue: 'Status' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.textRight,
                  'text-foreground-secondary uppercase tracking-widest',
                )}
              >
                {t('common.action', {}, { defaultValue: 'Action' })}
              </th>
            </tr>
          </thead>
          <tbody className={cm.cn('divide-y divide-border')}>
            {leads.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 10),
                    cm.textCenter,
                    cm.textSize('sm'),
                    'text-foreground-tertiary',
                  )}
                >
                  {t('recentLeadsCard.emptyState', {}, { defaultValue: 'No leads found' })}
                </td>
              </tr>
            ) : (
              leads.map((lead, i) => {
                const avatarCls = LEAD_AVATAR_COLORS[i % LEAD_AVATAR_COLORS.length]
                const badge = getLeadStatusBadge(lead.status)
                return (
                  <tr
                    key={lead.id}
                    className={cm.cn('hover:bg-surface-secondary/80 transition-colors')}
                  >
                    <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                      <div className={cm.flex({ align: 'center', gap: 'md' })}>
                        <div
                          className={cm.cn(
                            cm.w(8),
                            cm.h(8),
                            cm.roundedFull,
                            cm.flex({ align: 'center', justify: 'center' }),
                            cm.fontWeight('bold'),
                            cm.textSize('xs'),
                            avatarCls,
                          )}
                        >
                          {getLeadInitials(lead.name)}
                        </div>
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('bold'),
                            'text-foreground',
                          )}
                        >
                          {lead.name}
                        </span>
                      </div>
                    </td>
                    <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('medium'),
                          'text-foreground-secondary',
                        )}
                      >
                        {lead.property_title}
                      </span>
                    </td>
                    <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                      <div className={cm.flex({ direction: 'col' })}>
                        <span className={cm.cn(cm.textSize('sm'), 'text-foreground')}>
                          {lead.email}
                        </span>
                        <span className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
                          {lead.phone}
                        </span>
                      </div>
                    </td>
                    <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}>
                      <span
                        className={cm.cn(
                          cm.sp('py', 1),
                          cm.roundedFull,
                          cm.fontWeight('bold'),
                          'inline-flex items-center px-2.5 text-[10px]',
                          badge.cls,
                        )}
                      >
                        {badge.type === 'unknown'
                          ? t(
                              'recentLeadsCard.status.unknown',
                              { status: badge.raw?.toUpperCase() || '' },
                              { defaultValue: '{{status}}' },
                            )
                          : statusLabels[badge.type as keyof typeof statusLabels]}
                      </span>
                    </td>
                    <td className={cm.cn(cm.sp('px', 8), cm.sp('py', 5), cm.textRight)}>
                      <button
                        onClick={() => handleContact()}
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          cm.textSize('xs'),
                          'text-secondary hover:underline',
                        )}
                      >
                        {t('nav.contact', {}, { defaultValue: 'Contact' })}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default AgentDashboardRecentLeadsCard
export { AgentDashboardRecentLeadsCard }
