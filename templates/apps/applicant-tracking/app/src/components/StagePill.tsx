/**
 * Stage pill — uppercase, font-black, tracking-widest pill colored by hiring stage.
 *
 * Stage colors map to Shortlist's brand semantic tokens:
 * sourced=violet, screening=indigo, interview=teal, offer=amber, hired=green, rejected=red.
 *
 * Translated from crm's StatusPill / property-listing's status badges — same
 * uppercase 10px tracking-widest pill anatomy.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type Stage = 'sourced' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'

const STAGE_FG: Record<Stage, string> = {
  sourced: 'var(--color-stage-sourced)',
  screening: 'var(--color-stage-screening)',
  interview: 'var(--color-stage-interview)',
  offer: 'var(--color-stage-offer)',
  hired: 'var(--color-stage-hired)',
  rejected: 'var(--color-stage-rejected)',
}

const STAGE_BG: Record<Stage, string> = {
  sourced: 'var(--color-stage-sourced-bg)',
  screening: 'var(--color-stage-screening-bg)',
  interview: 'var(--color-stage-interview-bg)',
  offer: 'var(--color-stage-offer-bg)',
  hired: 'var(--color-stage-hired-bg)',
  rejected: 'var(--color-stage-rejected-bg)',
}

const STAGE_DEFAULT_LABEL: Record<Stage, string> = {
  sourced: 'Sourced',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
}

interface StagePillProps {
  stage: Stage
  size?: 'xs' | 'sm'
}

export function StagePill({ stage, size = 'sm' }: StagePillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const label = t(`stagePill.${stage}`, {}, { defaultValue: STAGE_DEFAULT_LABEL[stage] })
  return (
    <span
      className={cm.cn(
        cm.sp('px', size === 'xs' ? 2 : 3),
        cm.sp('py', 1),
        size === 'xs' ? 'text-[9px]' : 'text-[10px]',
        'inline-flex items-center font-black uppercase tracking-widest rounded-full',
      )}
      style={{ backgroundColor: STAGE_BG[stage], color: STAGE_FG[stage] }}
    >
      {label}
    </span>
  )
}
