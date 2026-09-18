import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

function DealDetailHeader({
  deal,
}: {
  deal: {
    id: string
    title: string
    value: number
    stage: string
    probability: number | null
    expected_close_date: string | null
  } | null
}) {
  const cm = getClassMap()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { t } = useTranslation()
  const [markingWon, setMarkingWon] = useState(false)

  const handleMarkAsWon = async () => {
    if (!deal?.id || markingWon) return
    setMarkingWon(true)
    try {
      await http.patch(`/api/deals/${deal.id}`, { stage: 'closed_won' })
    } finally {
      setMarkingWon(false)
    }
  }

  return (
    <section className={cm.cn(cm.sp('px', 8), cm.sp('pt', 8), cm.sp('pb', 6))}>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between' }),
          'md:flex-row md:items-end gap-6',
        )}
      >
        <div>
          <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 2), 'gap-3')}>
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.fontWeight('bold'),
                'py-0.5 bg-blue-50 text-blue-700 text-[10px] uppercase tracking-widest rounded-md',
              )}
            >
              {t('dealDetailHeader.dealType', {}, { defaultValue: 'Enterprise Deal' })}
            </span>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'dealDetailHeader.dealId',
                { id: deal?.id ?? 'CRM-94202' },
                { defaultValue: 'ID: {{id}}' },
              )}
            </span>
          </div>
          <h2
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {deal?.title ??
              t(
                'dealDetailHeader.fallbackTitle',
                {},
                { defaultValue: 'Enterprise Cloud Migration' },
              )}
          </h2>
          <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mt', 4), 'gap-6')}>
            <div>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('mb', 1),
                  'text-[10px] text-outline uppercase tracking-widest',
                )}
              >
                {t('dealDetailHeader.valueHeading', {}, { defaultValue: 'Deal Value' })}
              </p>
              <p className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.textPrimary)}>
                {deal
                  ? formatCurrency(deal.value)
                  : t('dealDetailHeader.fallbackValue', {}, { defaultValue: '$245,000' })}
              </p>
            </div>
            <div className={cm.cn(cm.h(10), 'w-px shrink-0', 'bg-outline-variant/30')}></div>
            <div>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('mb', 1),
                  'text-[10px] text-outline uppercase tracking-widest',
                )}
              >
                {t('dealDetailHeader.closeDateHeading', {}, { defaultValue: 'Expected Close' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
                {deal?.expected_close_date
                  ? new Date(deal.expected_close_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : t('dealDetailHeader.fallbackCloseDate', {}, { defaultValue: 'Nov 15, 2024' })}
              </p>
            </div>
            <div className={cm.cn(cm.h(10), 'w-px shrink-0', 'bg-outline-variant/30')}></div>
            <div>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('mb', 1),
                  'text-[10px] text-outline uppercase tracking-widest',
                )}
              >
                {t('dealDetailHeader.probabilityHeading', {}, { defaultValue: 'Probability' })}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
                <p
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
                >
                  {deal?.probability != null
                    ? `${deal.probability}%`
                    : t('dealDetailHeader.fallbackProbability', {}, { defaultValue: '75%' })}
                </p>
                <div
                  className={cm.cn(
                    cm.w(16),
                    cm.roundedFull,
                    'h-1.5 bg-surface-container-high overflow-hidden',
                  )}
                >
                  <div
                    className={cm.cn(cm.h('full'), 'bg-secondary')}
                    style={{ width: deal?.probability != null ? `${deal.probability}%` : '75%' }}
                  ></div>
                </div>
              </div>
            </div>
            <div className={cm.sp('ml', 4)}>
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'bg-secondary text-white',
                )}
              >
                {deal?.stage ??
                  t('dealDetailHeader.negotiationStage', {}, { defaultValue: 'Negotiation' })}
              </span>
            </div>
          </div>
        </div>
        <div className={cm.cn(cm.flex({}), 'gap-3')}>
          <button
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'bg-surface-container-high text-on-surface rounded-lg hover:bg-surface-container-highest transition-colors',
            )}
            onClick={() => navigate(`/deals/${deal?.id}/edit`)}
          >
            {t('common.edit', {}, { defaultValue: 'Edit' })}
          </button>
          <button
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-lg shadow-md hover:opacity-95 active:scale-95 transition-all',
            )}
            onClick={handleMarkAsWon}
            disabled={markingWon}
          >
            {markingWon
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('dealDetailHeader.markAsWon', {}, { defaultValue: 'Mark as Won' })}
          </button>
        </div>
      </div>
      {/* Progress Bar Section */}
      <div className={cm.cn(cm.sp('mt', 10), 'relative')}>
        <div
          className={cm.cn(
            cm.w('full'),
            'absolute top-1/2 left-0 h-1 bg-surface-container-high -translate-y-1/2 z-0',
          )}
        ></div>
        <div className={cm.cn(cm.flex({ justify: 'between' }), 'relative z-10')}>
          {/* Qualification */}
          <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), 'group')}>
            <div
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                cm.sp('mb', 2),
                'bg-primary text-white shadow-lg',
              )}
            >
              <span
                className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check
              </span>
            </div>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-on-surface uppercase tracking-widest',
              )}
            >
              {t('dealDetailHeader.qualificationStage', {}, { defaultValue: 'Qualification' })}
            </span>
          </div>
          {/* Discovery */}
          <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), 'group')}>
            <div
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                cm.sp('mb', 2),
                'bg-primary text-white shadow-lg',
              )}
            >
              <span
                className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check
              </span>
            </div>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-on-surface uppercase tracking-widest',
              )}
            >
              {t('dealDetailHeader.discoveryStage', {}, { defaultValue: 'Discovery' })}
            </span>
          </div>
          {/* Proposal */}
          <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), 'group')}>
            <div
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                cm.sp('mb', 2),
                'bg-primary text-white shadow-lg',
              )}
            >
              <span
                className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check
              </span>
            </div>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-on-surface uppercase tracking-widest',
              )}
            >
              {t('dealDetailHeader.proposalStage', {}, { defaultValue: 'Proposal' })}
            </span>
          </div>
          {/* Negotiation (Current) */}
          <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), 'group')}>
            <div
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                '-mt-1 bg-surface border-4 border-secondary text-secondary mb-1.5 shadow-xl',
              )}
            >
              <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined animate-pulse')}>
                handshake
              </span>
            </div>
            <span className={cm.fv28eb3af4}>
              {t('dealDetailHeader.negotiationStage', {}, { defaultValue: 'Negotiation' })}
            </span>
          </div>
          {/* Closed Won */}
          <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), 'group')}>
            <div
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                cm.sp('mb', 2),
                'bg-surface-container-highest border border-outline-variant text-outline-variant',
              )}
            >
              <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>flag</span>
            </div>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-outline uppercase tracking-widest',
              )}
            >
              {t('dealDetailHeader.closedWonStage', {}, { defaultValue: 'Closed Won' })}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default DealDetailHeader
export { DealDetailHeader }
