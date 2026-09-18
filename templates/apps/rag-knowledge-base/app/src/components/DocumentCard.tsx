import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type FileType = 'pdf' | 'docx' | 'txt' | 'md' | 'csv' | 'html'
export type DocumentStatus = 'indexed' | 'indexing' | 'failed' | 'queued'

interface DocumentCardProps {
  id: string
  title: string
  fileType: FileType
  status: DocumentStatus
  pageCount?: number | null
  chunkCount?: number | null
  uploadedAt: string
  /** 0..100 \u2014 if provided, renders a thin progress bar (for indexing state). */
  indexingProgress?: number | null
}

const FILE_TYPE_HEX: Record<FileType, string> = {
  pdf: 'var(--color-error)',
  docx: 'var(--color-info)',
  txt: 'var(--color-on-surface-variant)',
  md: 'var(--color-on-surface)',
  csv: 'var(--color-success)',
  html: 'var(--color-accent)',
}

const FILE_TYPE_ICON: Record<FileType, string> = {
  pdf: 'picture_as_pdf',
  docx: 'description',
  txt: 'text_snippet',
  md: 'article',
  csv: 'table_chart',
  html: 'html',
}

const STATUS_HEX: Record<DocumentStatus, string> = {
  indexed: 'var(--color-success)',
  indexing: 'var(--color-info)',
  failed: 'var(--color-error)',
  queued: 'var(--color-on-surface-variant)',
}

const STATUS_DEFAULT: Record<DocumentStatus, string> = {
  indexed: 'Indexed',
  indexing: 'Indexing',
  failed: 'Failed',
  queued: 'Queued',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Document card \u2014 file-type-tinted left border, large icon at top, title +
 * meta row + status pill at bottom. Indexing variant shows a thin progress bar
 * along the bottom edge.
 *
 * Translated from ai-document-processor's DocumentCard pattern, adapted for
 * Engram's file-type palette (PDF red, DOCX blue, TXT gray, MD ink, CSV green,
 * HTML amber) and indexing-progress affordance.
 */
export function DocumentCard({
  id,
  title,
  fileType,
  status,
  pageCount,
  chunkCount,
  uploadedAt,
  indexingProgress,
}: DocumentCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const fileColor = FILE_TYPE_HEX[fileType]
  const statusColor = STATUS_HEX[status]

  const meta: string[] = []
  if (pageCount)
    meta.push(t('documentCard.pages', { count: pageCount }, { defaultValue: `${pageCount} pages` }))
  if (chunkCount)
    meta.push(
      t('documentCard.chunks', { count: chunkCount }, { defaultValue: `${chunkCount} chunks` }),
    )
  meta.push(fmtDate(uploadedAt))

  return (
    <Link
      to={`/documents/${id}`}
      className={cm.cn(
        cm.sp('p', 5),
        cm.flex({ direction: 'col', gap: 'sm' }),
        'block group rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all relative overflow-hidden',
      )}
      style={{ borderLeft: `4px solid ${fileColor}` }}
    >
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(10),
            cm.h(10),
            'rounded-lg shrink-0',
          )}
          style={{
            background: `color-mix(in srgb, ${fileColor} 12%, transparent)`,
            color: fileColor,
          }}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontSize: 22 }}
            aria-hidden="true"
          >
            {FILE_TYPE_ICON[fileType]}
          </span>
        </span>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'uppercase tracking-widest font-bold text-on-surface-variant',
          )}
          style={{ fontSize: 10 }}
        >
          {fileType.toUpperCase()}
        </span>
      </div>

      <p
        className={cm.cn(
          cm.textSize('base'),
          'font-semibold text-on-surface line-clamp-2 leading-snug',
        )}
      >
        {title}
      </p>
      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{meta.join(' \u00b7 ')}</p>

      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mt', 1))}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            'font-semibold',
          )}
        >
          <span
            className={cm.cn('w-2 h-2 rounded-full')}
            style={{
              background: statusColor,
              animation: status === 'indexing' ? 'pulse 1.6s ease-in-out infinite' : undefined,
            }}
            aria-hidden="true"
          />
          <span style={{ color: statusColor }}>
            {t(`documentCard.status.${status}`, {}, { defaultValue: STATUS_DEFAULT[status] })}
          </span>
        </span>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'text-on-surface-variant group-hover:text-primary transition-colors',
          )}
        >
          {t('documentCard.open', {}, { defaultValue: 'Open \u2192' })}
        </span>
      </div>

      {status === 'indexing' && typeof indexingProgress === 'number' ? (
        <div
          className={cm.cn(
            'absolute left-0 right-0 bottom-0 h-1 bg-surface-container overflow-hidden',
          )}
          role="progressbar"
          aria-valuenow={Math.round(indexingProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={'h-full rounded-r-full'}
            style={{
              width: `${Math.max(0, Math.min(100, indexingProgress))}%`,
              background: 'var(--color-info)',
            }}
          />
        </div>
      ) : null}
    </Link>
  )
}
