import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Sharing-visibility pill — Public / Restricted / Private / Draft.
 * Translated from the editorial pill treatment used across crm /
 * helpdesk-ticketing — uppercase 10px font-black tracking-widest.
 */
export type DocumentVisibility = 'draft' | 'private' | 'restricted' | 'public'

const VISIBILITY_CLASS: Record<DocumentVisibility, string> = {
  draft: 'bg-surface-container-high text-on-surface-variant',
  private: 'bg-on-surface-variant/15 text-on-surface-variant',
  restricted: 'bg-warning/15 text-warning',
  public: 'bg-info/15 text-info',
}

const DEFAULT_LABEL: Record<DocumentVisibility, string> = {
  draft: 'Draft',
  private: 'Private',
  restricted: 'Restricted',
  public: 'Public',
}

const VISIBILITY_ICON: Record<DocumentVisibility, string> = {
  draft: 'edit_note',
  private: 'lock',
  restricted: 'shield_person',
  public: 'public',
}

export interface DocumentVisibilityPillProps {
  visibility: DocumentVisibility
  size?: 'sm' | 'md'
  withIcon?: boolean
}

export function DocumentVisibilityPill({
  visibility,
  size = 'sm',
  withIcon = true,
}: DocumentVisibilityPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const label = t(
    `documentVisibilityPill.${visibility}`,
    {},
    { defaultValue: DEFAULT_LABEL[visibility] },
  )

  return (
    <span
      className={cm.cn(
        cm.fontWeight('extrabold'),
        size === 'md' ? 'px-3 py-1 text-xs gap-1.5' : 'px-2.5 py-0.5 text-[10px] gap-1',
        'inline-flex items-center rounded-full uppercase tracking-widest font-black',
        VISIBILITY_CLASS[visibility],
      )}
    >
      {withIcon ? (
        <span
          className={cm.cn('material-symbols-outlined')}
          aria-hidden="true"
          style={{ fontSize: size === 'md' ? '0.95rem' : '0.85rem' }}
        >
          {VISIBILITY_ICON[visibility]}
        </span>
      ) : null}
      {label}
    </span>
  )
}
