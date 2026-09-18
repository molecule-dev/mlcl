import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ConfidencePill } from './ConfidencePill.js'
import { type DocumentType, DocumentTypeBadge } from './DocumentTypeBadge.js'

export type ProcessingStatus =
  'pending' | 'processing' | 'extracted' | 'classified' | 'complete' | 'error'

interface DocumentCardProps {
  id: string
  filename: string
  type: DocumentType | null
  status: ProcessingStatus
  /** Confidence 0..1 or 0..100. */
  confidence?: number | null
  pageCount?: number | null
  fileSize?: number | null
  uploadedAt: string
}

const STATUS_HEX: Record<ProcessingStatus, string> = {
  pending: 'var(--color-on-surface-variant)',
  processing: 'var(--color-primary)',
  extracted: 'var(--color-secondary)',
  classified: 'var(--color-info)',
  complete: 'var(--color-success)',
  error: 'var(--color-error)',
}

const STATUS_DEFAULT: Record<ProcessingStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  extracted: 'Extracted',
  classified: 'Classified',
  complete: 'Filed',
  error: 'Error',
}

function fmtSize(bytes?: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Document card — placeholder thumbnail with the type badge floating top-left,
 * filename + meta, status dot + confidence pill at the bottom.
 *
 * Translated from banking-dashboard's AccountsTriad card pattern, with a faux
 * paper-stack thumbnail standing in for the document preview until backend
 * thumbnails are wired.
 */
export function DocumentCard({
  id,
  filename,
  type,
  status,
  confidence,
  pageCount,
  fileSize,
  uploadedAt,
}: DocumentCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const meta: string[] = []
  if (pageCount)
    meta.push(t('documentCard.pages', { count: pageCount }, { defaultValue: `${pageCount} pages` }))
  if (fileSize) meta.push(fmtSize(fileSize))
  meta.push(fmtDate(uploadedAt))

  return (
    <Link
      to={`/documents/${id}`}
      className={cm.cn(
        'block group rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          'relative h-40 bg-surface-container flex items-center justify-center overflow-hidden',
        )}
      >
        {/* Faux paper stack thumbnail */}
        <div
          className={cm.cn('absolute inset-0 opacity-60')}
          style={{
            background:
              'repeating-linear-gradient(180deg, var(--color-surface) 0 14px, var(--color-surface-container-low) 14px 16px)',
          }}
        />
        <div className={cm.cn('relative flex flex-col items-center gap-1 text-on-surface-variant')}>
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontSize: 48 }}
            aria-hidden="true"
          >
            description
          </span>
          {pageCount ? (
            <span className={cm.cn('text-[10px] font-bold uppercase tracking-widest')}>
              {t(
                'documentCard.pageBadge',
                { count: pageCount },
                { defaultValue: `${pageCount} pp` },
              )}
            </span>
          ) : null}
        </div>
        {type ? (
          <div className={cm.cn('absolute top-3 left-3')}>
            <DocumentTypeBadge type={type} />
          </div>
        ) : null}
      </div>
      <div className={cm.cn(cm.sp('p', 4), cm.flex({ direction: 'col', gap: 'xs' }))}>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-on-surface line-clamp-1',
          )}
        >
          {filename}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant line-clamp-1')}>
          {meta.join(' · ')}
        </p>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mt', 2))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
            )}
          >
            <span
              className={cm.cn('w-2 h-2 rounded-full')}
              style={{ background: STATUS_HEX[status] }}
              aria-hidden="true"
            />
            <span style={{ color: STATUS_HEX[status] }}>
              {t(`documentCard.status.${status}`, {}, { defaultValue: STATUS_DEFAULT[status] })}
            </span>
          </span>
          {typeof confidence === 'number' ? <ConfidencePill value={confidence} /> : null}
        </div>
      </div>
    </Link>
  )
}
