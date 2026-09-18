import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface PipelineItem {
  id: string
  stage: string
  value: number
  [key: string]: unknown
}

interface ReportsDealPipelineCardProps {
  pipeline: PipelineItem[]
}

const SAMPLE_STAGES = [
  { stage: 'discovery', value: 1200000 },
  { stage: 'qualified', value: 840000 },
  { stage: 'proposal', value: 420000 },
  { stage: 'negotiation', value: 190000 },
]

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

export default function ReportsDealPipelineCard({ pipeline }: ReportsDealPipelineCardProps) {
  const { t } = useTranslation()
  const cm = getClassMap()

  const stageLabels: Record<string, string> = {
    discovery: t('reportsDealPipelineCard.stageDiscovery', {}, { defaultValue: 'Discovery' }),
    qualified: t('reportsDealPipelineCard.stageQualified', {}, { defaultValue: 'Qualified' }),
    proposal: t('reportsDealPipelineCard.stageProposal', {}, { defaultValue: 'Proposal' }),
    negotiation: t('reportsDealPipelineCard.stageNegotiation', {}, { defaultValue: 'Negotiation' }),
    contacted: t('reportsDealPipelineCard.stageContacted', {}, { defaultValue: 'Contacted' }),
    lead: t('reportsDealPipelineCard.stageLead', {}, { defaultValue: 'Lead' }),
    closed_won: t('reportsDealPipelineCard.stageClosedWon', {}, { defaultValue: 'Closed Won' }),
  }

  const stageOrder = ['discovery', 'qualified', 'proposal', 'negotiation']

  let stages: { stage: string; value: number }[]
  if (pipeline.length) {
    const stageMap = pipeline.reduce<Record<string, number>>((acc, item) => {
      const s = item.stage || 'unknown'
      acc[s] = (acc[s] || 0) + (Number(item.value) || 0)
      return acc
    }, {})
    const filtered = stageOrder
      .filter((s) => stageMap[s])
      .map((s) => ({ stage: s, value: stageMap[s] }))
    stages = filtered.length ? filtered : SAMPLE_STAGES
  } else {
    stages = SAMPLE_STAGES
  }

  const maxValue = Math.max(...stages.map((s) => s.value), 1)
  const total = stages.reduce((sum, s) => sum + s.value, 0)

  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-3xl architectural-shadow',
      )}
    >
      <h3
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          cm.sp('mb', 6),
          'tracking-wider text-on-surface uppercase opacity-80',
        )}
      >
        {t('reportsDealPipelineCard.title', {}, { defaultValue: 'Deal Pipeline' })}
      </h3>
      <div className={cm.stack(5)}>
        {stages.map((s) => (
          <div key={s.stage} className={cm.fv4f3df6dd}>
            <div
              className={cm.cn(
                cm.flex({ justify: 'between' }),
                cm.textSize('xs'),
                cm.fontWeight('medium'),
              )}
            >
              <span>{stageLabels[s.stage] || s.stage}</span>
              <span className={cm.fveccdb3a2}>{formatCurrency(s.value)}</span>
            </div>
            <div
              className={cm.cn(
                cm.h(2),
                cm.w('full'),
                'bg-surface-container-low rounded-full overflow-hidden',
              )}
            >
              <div
                className={cm.cn(cm.h('full'), 'bg-primary-container')}
                style={{ width: `${Math.round((s.value / maxValue) * 100)}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      <div className={cm.cn(cm.sp('mt', 8), cm.sp('pt', 6), 'border-t border-outline-variant/10')}>
        <div className={cm.textCenter}>
          <p className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.textPrimary)}>
            {formatCurrency(total)}
          </p>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'text-[10px] text-outline uppercase tracking-widest',
            )}
          >
            {t(
              'reportsDealPipelineCard.totalPipelineValue',
              {},
              { defaultValue: 'Total Pipeline Value' },
            )}
          </p>
        </div>
      </div>
    </section>
  )
}
export { ReportsDealPipelineCard }
