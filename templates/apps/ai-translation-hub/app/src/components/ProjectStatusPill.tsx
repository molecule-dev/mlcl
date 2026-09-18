import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type ProjectStatus =
  'draft' | 'in_progress' | 'in_review' | 'approved' | 'archived' | 'pending'

interface ProjectStatusPillProps {
  status: ProjectStatus
}

const TONE: Record<ProjectStatus, string> = {
  draft: 'bg-surface-container-high text-on-surface-variant',
  in_progress: 'bg-primary-fixed/50 text-on-primary-fixed',
  in_review: 'bg-tertiary-container/15 text-tertiary',
  approved: 'bg-success-light text-success',
  archived: 'bg-surface-variant text-on-surface-variant',
  pending: 'bg-warning-light text-warning',
}

const DEFAULTS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  in_progress: 'In progress',
  in_review: 'In review',
  approved: 'Approved',
  archived: 'Archived',
  pending: 'Pending',
}

/**
 * Uppercase 10px bold pill — the canonical "status badge" treatment
 * lifted from polished-app catalog §1 (KPI cards). Color tokens
 * intentionally stay inside the indigo + tertiary palette so the pill
 * doesn't fight Rendition's brand.
 */
export function ProjectStatusPill({ status }: ProjectStatusPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <span
      className={cm.cn(
        cm.fontWeight('bold'),
        'inline-flex items-center px-2 py-1 rounded text-[10px] uppercase tracking-widest',
        TONE[status],
      )}
    >
      {t(`projectStatusPill.${status}`, {}, { defaultValue: DEFAULTS[status] })}
    </span>
  )
}
