import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface FirmwareCampaign {
  id: string
  version: string
  channel: 'stable' | 'beta' | 'canary'
  status: 'current' | 'pending' | 'failed' | 'rolling'
  total_devices: number
  completed_devices: number
  failed_devices: number
  released_at?: string
}

interface FirmwareCampaignCardProps {
  campaign: FirmwareCampaign
}

const STATUS_ACCENT: Record<FirmwareCampaign['status'], string> = {
  current: 'border-success',
  pending: 'border-warning',
  rolling: 'border-primary',
  failed: 'border-error',
}

const STATUS_LABEL_TONE: Record<FirmwareCampaign['status'], string> = {
  current: 'text-success',
  pending: 'text-warning',
  rolling: 'text-primary',
  failed: 'text-error',
}

const CHANNEL_PILL: Record<FirmwareCampaign['channel'], string> = {
  stable: 'bg-success/10 text-success',
  beta: 'bg-secondary/10 text-secondary',
  canary: 'bg-warning/10 text-warning',
}

/**
 * Firmware-rollout card translated from project-management's StatsRow +
 * the §3 progress-bar pattern from POLISHED-PATTERN-CATALOG. Border-l-4
 * stage accent per DESIGN.md "Firmware Update Card", mono version
 * number, animated progress bar, completion ratio.
 */
export function FirmwareCampaignCard({ campaign }: FirmwareCampaignCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const completion =
    campaign.total_devices > 0
      ? Math.round((campaign.completed_devices / campaign.total_devices) * 100)
      : 0
  const failurePct =
    campaign.total_devices > 0
      ? Math.round((campaign.failed_devices / campaign.total_devices) * 100)
      : 0

  return (
    <article
      className={cm.cn(
        cm.sp('p', 5),
        'bg-surface-container-lowest rounded-xl border-l-4 shadow-sm hover:shadow-md transition-shadow',
        STATUS_ACCENT[campaign.status],
      )}
    >
      <div className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span className={cm.cn('text-lg font-extrabold font-mono text-on-surface')}>
            v{campaign.version}
          </span>
          <span
            className={cm.cn(
              'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest',
              CHANNEL_PILL[campaign.channel],
            )}
          >
            {t(
              `firmwareCampaignCard.channel.${campaign.channel}`,
              {},
              { defaultValue: campaign.channel },
            )}
          </span>
        </div>
        <span
          className={cm.cn(
            'text-[11px] font-bold uppercase tracking-widest',
            STATUS_LABEL_TONE[campaign.status],
          )}
        >
          {t(
            `firmwareCampaignCard.status.${campaign.status}`,
            {},
            { defaultValue: campaign.status },
          )}
        </span>
      </div>

      <div className={cm.sp('mt', 4)}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <span
            className={cm.cn(
              'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('firmwareCampaignCard.rollout', {}, { defaultValue: 'Rollout' })}
          </span>
          <span className={cm.cn('text-sm font-extrabold font-mono tabular-nums text-on-surface')}>
            {completion}%
          </span>
        </div>
        <div
          className={cm.cn('mt-2 h-1.5 rounded-full bg-surface-container overflow-hidden')}
          aria-hidden="true"
        >
          <div
            className={cm.cn('h-full rounded-full transition-all')}
            style={{
              width: `${Math.min(100, Math.max(2, completion))}%`,
              background:
                'linear-gradient(90deg, var(--color-primary) 0%, var(--color-accent) 100%)',
            }}
          />
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mt', 2))}>
          <span className={cm.cn('text-[10px] text-on-surface-variant font-mono')}>
            {t(
              'firmwareCampaignCard.completedRatio',
              { done: campaign.completed_devices, total: campaign.total_devices },
              { defaultValue: '{{done}} / {{total}} devices' },
            )}
          </span>
          {failurePct > 0 && (
            <span className={cm.cn('text-[10px] font-bold text-error tabular-nums')}>
              {t(
                'firmwareCampaignCard.failedPct',
                { pct: failurePct },
                { defaultValue: '{{pct}}% failed' },
              )}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
