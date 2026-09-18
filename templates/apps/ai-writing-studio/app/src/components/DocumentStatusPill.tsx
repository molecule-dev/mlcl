import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Tiny pill badge denoting a document's lifecycle state. Three variants —
 * draft (slate), published (emerald), ai-assisted (Plume purple) — driven
 * by `status`. Always renders the 10px-uppercase-extrabold treatment from
 * the visual richness checklist.
 *
 * Translated from personal-finance/crm status-pill recipe.
 */
export type DocumentStatus = 'draft' | 'published' | 'ai-assisted' | 'archived'

export interface DocumentStatusPillProps {
  status: DocumentStatus
  /** Optional Material Symbols icon glyph rendered before the label. */
  icon?: string
}

const STATUS_TO_KEY: Record<
  DocumentStatus,
  { key: string; defaultValue: string; classes: string; icon: string }
> = {
  draft: {
    key: 'documentStatusPill.draft',
    defaultValue: 'Draft',
    classes: 'bg-surface-container text-on-surface-variant',
    icon: 'edit_note',
  },
  published: {
    key: 'documentStatusPill.published',
    defaultValue: 'Published',
    classes: 'bg-success-container text-on-success-container',
    icon: 'check_circle',
  },
  'ai-assisted': {
    key: 'documentStatusPill.aiAssisted',
    defaultValue: 'AI Assisted',
    classes: 'bg-primary-container text-on-primary-container',
    icon: 'auto_awesome',
  },
  archived: {
    key: 'documentStatusPill.archived',
    defaultValue: 'Archived',
    classes: 'bg-surface-container-high text-on-surface-variant',
    icon: 'inventory_2',
  },
}

export function DocumentStatusPill({ status, icon }: DocumentStatusPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const meta = STATUS_TO_KEY[status]
  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.sp('px', 3),
        cm.sp('py', 1),
        cm.roundedFull,
        cm.fontWeight('bold'),
        'text-[10px] uppercase tracking-widest',
        meta.classes,
      )}
    >
      <span className={cm.cn('material-symbols-outlined text-[12px]')} aria-hidden="true">
        {icon ?? meta.icon}
      </span>
      {t(meta.key, {}, { defaultValue: meta.defaultValue })}
    </span>
  )
}

export default DocumentStatusPill
