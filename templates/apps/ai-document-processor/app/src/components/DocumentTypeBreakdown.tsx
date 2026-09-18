import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { DocumentType } from './DocumentTypeBadge.js'

interface DocumentTypeBreakdownProps {
  segments: ReadonlyArray<{ type: DocumentType; count: number }>
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
  invoice: 'Invoices',
  receipt: 'Receipts',
  contract: 'Contracts',
  report: 'Reports',
  form: 'Forms',
  letter: 'Letters',
  identification: 'IDs',
  other: 'Other',
}

/**
 * Document Composition card — full-width stacked horizontal bar segmented by
 * document type, with a wrapped legend showing per-type counts and percentages.
 *
 * Translated from the Stitch dashboard mock; segment colors come from the
 * DESIGN.md "Document Type Colors" table to stay consistent with the
 * `<DocumentTypeBadge>` component.
 */
export function DocumentTypeBreakdown({ segments }: DocumentTypeBreakdownProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const total = segments.reduce((sum, s) => sum + s.count, 0)
  if (total === 0) {
    return (
      <p
        className={cm.cn(cm.textSize('sm'), cm.sp('py', 6), 'text-center text-on-surface-variant')}
      >
        {t('documentTypeBreakdown.empty', {}, { defaultValue: 'No documents processed yet.' })}
      </p>
    )
  }

  return (
    <section
      className={cm.cn(
        cm.sp('p', 8),
        'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'baseline' }), cm.sp('mb', 6))}>
        <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('documentTypeBreakdown.title', {}, { defaultValue: 'Document composition' })}
        </h3>
        <span
          className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-on-surface-variant')}
        >
          {t(
            'documentTypeBreakdown.subtitle',
            { total: total.toLocaleString() },
            { defaultValue: '{{total}} processed' },
          )}
        </span>
      </div>

      <div
        className={cm.cn(cm.w('full'), 'flex h-3 rounded-full overflow-hidden')}
        role="img"
        aria-label={t(
          'documentTypeBreakdown.barAria',
          {},
          { defaultValue: 'Document composition by type' },
        )}
      >
        {segments.map((seg) => {
          const pct = (seg.count / total) * 100
          if (pct <= 0) return null
          return (
            <div
              key={seg.type}
              style={{ width: `${pct}%`, background: TYPE_HEX[seg.type] }}
              title={`${TYPE_DEFAULT_LABEL[seg.type]} (${pct.toFixed(0)}%)`}
            />
          )
        })}
      </div>

      <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'md' }), cm.sp('mt', 6))}>
        {segments.map((seg) => {
          const pct = (seg.count / total) * 100
          return (
            <div key={seg.type} className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <span
                className={cm.cn('w-3 h-3 rounded-full')}
                style={{ background: TYPE_HEX[seg.type] }}
                aria-hidden="true"
              />
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t(
                  `documentTypeBreakdown.${seg.type}`,
                  {},
                  { defaultValue: TYPE_DEFAULT_LABEL[seg.type] },
                )}
              </span>
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant tabular-nums')}>
                {pct.toFixed(0)}%
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
