import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Article status pill — Published / Draft / Archived / Restricted /
 * Bookmarked. Each tone matches the semantic token defined in
 * app/DESIGN.md (published teal, draft slate, archived muted, restricted
 * red, bookmarked amber, recent violet).
 *
 * Translated from document-collaboration/DocumentVisibilityPill.tsx and
 * the generic editorial pill treatment used across crm /
 * helpdesk-ticketing — uppercase 10px font-black tracking-widest.
 */
export type CairnArticleStatus =
  'published' | 'draft' | 'archived' | 'restricted' | 'bookmarked' | 'recent'

const STATUS_CLASS: Record<CairnArticleStatus, string> = {
  published: 'bg-primary/15 text-primary',
  draft: 'bg-surface-container-high text-on-surface-variant',
  archived: 'bg-on-surface-variant/15 text-on-surface-variant',
  restricted: 'bg-error/15 text-error',
  bookmarked: 'bg-secondary/15 text-secondary',
  recent: 'bg-info/15 text-info',
}

const STATUS_ICON: Record<CairnArticleStatus, string> = {
  published: 'task_alt',
  draft: 'edit_note',
  archived: 'inventory_2',
  restricted: 'shield_person',
  bookmarked: 'bookmark',
  recent: 'auto_awesome',
}

const DEFAULT_LABEL: Record<CairnArticleStatus, string> = {
  published: 'Published',
  draft: 'Draft',
  archived: 'Archived',
  restricted: 'Restricted',
  bookmarked: 'Bookmarked',
  recent: 'Just updated',
}

export interface CairnArticleStatusPillProps {
  status: CairnArticleStatus
  size?: 'sm' | 'md'
  withIcon?: boolean
}

export function CairnArticleStatusPill({
  status,
  size = 'sm',
  withIcon = true,
}: CairnArticleStatusPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const label = t(`cairnArticleStatusPill.${status}`, {}, { defaultValue: DEFAULT_LABEL[status] })

  return (
    <span
      className={cm.cn(
        cm.fontWeight('extrabold'),
        size === 'md' ? 'px-3 py-1 text-xs gap-1.5' : 'px-2.5 py-0.5 text-[10px] gap-1',
        'inline-flex items-center rounded-full uppercase tracking-widest font-black',
        STATUS_CLASS[status],
      )}
    >
      {withIcon ? (
        <span
          className={cm.cn('material-symbols-outlined')}
          aria-hidden="true"
          style={{ fontSize: size === 'md' ? '0.95rem' : '0.85rem' }}
        >
          {STATUS_ICON[status]}
        </span>
      ) : null}
      {label}
    </span>
  )
}
