import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CompanyDeal {
  id: string
  title: string
  value: number
  stage: string
  owner_name: string | null
}

const STAGE_BADGE: Record<string, { label: string; cls: string }> = {
  closed_won: { label: 'Won', cls: 'bg-success-light text-success' },
  closed_lost: { label: 'Lost', cls: 'bg-error-light text-error' },
  negotiation: { label: 'Negotiation', cls: 'bg-primary-container text-on-primary-container' },
  proposal: { label: 'Proposal', cls: 'bg-secondary-container text-on-secondary-container' },
  qualified: { label: 'Qualified', cls: 'bg-tertiary-container text-on-tertiary-container' },
  lead: { label: 'Lead', cls: 'bg-surface-container-high text-on-surface-variant' },
}

function formatDealValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`
  return `$${v.toLocaleString()}`
}

function CompanyDealsCard({ deals }: { deals: CompanyDeal[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-3xl shadow-[0px_12px_32px_rgba(19,47,106,0.06)] border-none',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 6))}>
        <h3
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center' }),
            'text-on-surface gap-2',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined', cm.textPrimary)}
            data-icon="payments"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            payments
          </span>
          {t('companyDealsCard.heading', {}, { defaultValue: 'Recent Deals' })}
        </h3>
        <Link to="/deals" className={cm.fv6805d132}>
          {t('companyDealsCard.viewAllLink', {}, { defaultValue: 'View All Pipeline' })}
        </Link>
      </div>
      <div className={cm.stack(3)}>
        {deals.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('companyDealsCard.emptyState', {}, { defaultValue: 'No deals found.' })}
          </p>
        ) : (
          deals.map((deal) => {
            const badge = STAGE_BADGE[deal.stage] ?? {
              label: deal.stage,
              cls: 'bg-surface-container-high text-on-surface-variant',
            }
            return (
              <Link key={deal.id} to={`/deals/${deal.id}`} className={cm.fvde2f5b1a}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('p', 4),
                    'rounded-lg bg-surface-container hover:bg-surface-container-high transition-all group',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
                    <div
                      className={cm.cn(
                        cm.w(10),
                        cm.h(10),
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.textPrimary,
                        'rounded bg-primary/10',
                      )}
                    >
                      <span className={cm.fv5b245ffa} data-icon="handshake">
                        handshake
                      </span>
                    </div>
                    <div>
                      <h4
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                          'text-on-surface',
                        )}
                      >
                        {deal.title}
                      </h4>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('medium'),
                          'text-on-surface-variant',
                        )}
                      >
                        {deal.owner_name
                          ? t(
                              'companyDealsCard.ownerLabel',
                              { name: deal.owner_name },
                              { defaultValue: 'Owner: {{name}}' },
                            )
                          : ''}
                      </p>
                    </div>
                  </div>
                  <div className={cm.textRight}>
                    <p
                      className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                    >
                      {formatDealValue(deal.value)}
                    </p>
                    <span
                      className={cm.cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                        badge.cls,
                      )}
                    >
                      {t(`companyDealsCard.stage_${deal.stage}`, {}, { defaultValue: badge.label })}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}

export default CompanyDealsCard
export { CompanyDealsCard }
