import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Document card — file-type-coloured icon, title + uploaded date + size,
 * encryption pill (lock icon, confidential colour), and category chip.
 *
 * Translated from blog's ArticleListItem.tsx + crm/StatusPill — same
 * left-icon + content-block + trailing-meta layout, with a mandatory
 * encryption badge per DESIGN.md "Encryption badges (confidential
 * color, lock icon, pill) appear on every document card".
 */
export type DocumentCategory =
  | 'lab_report'
  | 'imaging'
  | 'discharge_summary'
  | 'referral'
  | 'insurance'
  | 'consent'
  | 'prescription'
  | 'other'

export interface EncryptedDocumentCardProps {
  title: string
  /** Display-formatted document date, e.g. "Mar 18, 2026". */
  documentDate: string
  /** Display-formatted file size, e.g. "1.4 MB". */
  fileSize: string
  /** Display-formatted MIME label, e.g. "PDF". */
  fileType: string
  category: DocumentCategory
  categoryLabel: string
  /** Provider that issued the document, optional. */
  providerName?: string
  /** Click handler (download / open). */
  onOpen?: () => void
}

const TYPE_COLOR: Record<string, string> = {
  PDF: 'var(--color-clinical-abnormal)',
  pdf: 'var(--color-clinical-abnormal)',
  IMAGE: 'var(--color-secondary)',
  image: 'var(--color-secondary)',
  default: 'var(--color-primary)',
}

const TYPE_ICON: Record<DocumentCategory, string> = {
  lab_report: 'science',
  imaging: 'image',
  discharge_summary: 'description',
  referral: 'forward_to_inbox',
  insurance: 'verified',
  consent: 'verified_user',
  prescription: 'receipt_long',
  other: 'description',
}

export function EncryptedDocumentCard({
  title,
  documentDate,
  fileSize,
  fileType,
  category,
  categoryLabel,
  providerName,
  onOpen,
}: EncryptedDocumentCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const iconColor = TYPE_COLOR[fileType] ?? TYPE_COLOR.default
  const icon = TYPE_ICON[category]

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('p', 4),
        'rounded-xl bg-surface-container-lowest hover:bg-surface-container-low shadow-sm hover:shadow-md transition-all cursor-pointer',
      )}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen?.()
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div
        className={cm.cn(
          cm.shrink0,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(10),
          cm.h(10),
          'rounded-lg',
        )}
        style={{
          backgroundColor: 'color-mix(in srgb, ' + iconColor + ' 18%, white)',
          color: iconColor,
        }}
        aria-hidden="true"
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <div className={cm.cn(cm.flex1, 'min-w-0')}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate')}>{title}</p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
          {providerName
            ? t(
                'encryptedDocumentCard.metaWithProvider',
                { date: documentDate, size: fileSize, type: fileType, provider: providerName },
                { defaultValue: '{{date}} · {{provider}} · {{type}} · {{size}}' },
              )
            : t(
                'encryptedDocumentCard.meta',
                { date: documentDate, size: fileSize, type: fileType },
                { defaultValue: '{{date}} · {{type}} · {{size}}' },
              )}
        </p>
      </div>

      <div className={cm.cn(cm.shrink0, cm.flex({ direction: 'col', align: 'end', gap: 'xs' }))}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.fontWeight('bold'),
            'px-2 py-1 text-[10px] uppercase tracking-widest rounded-full',
          )}
          style={{
            backgroundColor: 'var(--color-clinical-confidential-bg)',
            color: 'var(--color-clinical-confidential)',
          }}
        >
          <span className={cm.cn('material-symbols-outlined text-xs')} aria-hidden="true">
            lock
          </span>
          {t('encryptedDocumentCard.encrypted', {}, { defaultValue: 'Encrypted' })}
        </span>
        <span
          className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant uppercase tracking-wider')}
        >
          {categoryLabel}
        </span>
      </div>
    </div>
  )
}

export default EncryptedDocumentCard
