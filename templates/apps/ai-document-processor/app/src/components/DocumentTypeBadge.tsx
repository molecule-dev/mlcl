import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type DocumentType =
  'invoice' | 'receipt' | 'contract' | 'report' | 'form' | 'letter' | 'identification' | 'other'

interface DocumentTypeBadgeProps {
  type: DocumentType
  /** Render the icon glyph alongside the label. Default true. */
  withIcon?: boolean
  /** Render the label text. Default true. When false, becomes an icon-only chip. */
  withLabel?: boolean
}

const TYPE_ICON: Record<DocumentType, string> = {
  invoice: 'receipt_long',
  receipt: 'receipt',
  contract: 'gavel',
  report: 'analytics',
  form: 'assignment',
  letter: 'mail',
  identification: 'badge',
  other: 'description',
}

const TYPE_HEX: Record<DocumentType, string> = {
  invoice: 'var(--color-type-invoice)',
  receipt: 'var(--color-type-receipt)',
  contract: 'var(--color-type-contract)',
  report: 'var(--color-type-report)',
  form: 'var(--color-type-form)',
  letter: 'var(--color-type-letter)',
  identification: 'var(--color-type-identification)',
  other: 'var(--color-type-other)',
}

const TYPE_DEFAULT_LABEL: Record<DocumentType, string> = {
  invoice: 'Invoice',
  receipt: 'Receipt',
  contract: 'Contract',
  report: 'Report',
  form: 'Form',
  letter: 'Letter',
  identification: 'ID document',
  other: 'Document',
}

/**
 * Color-coded pill for the document classification type.
 *
 * Uses the per-type hex from DESIGN.md ("Document Type Colors") at 0.12
 * opacity for the background and full opacity for the text — inline
 * styles are required because the colors are brand-specific and not in
 * the ClassMap palette.
 *
 * Translated from banking-dashboard's KIND_TINT pattern in AccountsTriad.
 */
export function DocumentTypeBadge({
  type,
  withIcon = true,
  withLabel = true,
}: DocumentTypeBadgeProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const color = TYPE_HEX[type]
  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.sp('px', 3),
        cm.sp('py', 1),
        cm.textSize('xs'),
        cm.fontWeight('semibold'),
        'rounded-full',
      )}
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
    >
      {withIcon ? (
        <span
          className={cm.cn('material-symbols-outlined')}
          style={{ fontSize: 14 }}
          aria-hidden="true"
        >
          {TYPE_ICON[type]}
        </span>
      ) : null}
      {withLabel ? (
        <span>
          {t(`documentTypeBadge.${type}`, {}, { defaultValue: TYPE_DEFAULT_LABEL[type] })}
        </span>
      ) : null}
    </span>
  )
}
