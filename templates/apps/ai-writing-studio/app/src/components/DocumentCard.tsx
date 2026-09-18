import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type DocumentStatus, DocumentStatusPill } from './DocumentStatusPill.js'

/**
 * Editorial card for a single document. Top half is a Lora-serif italic
 * preview snippet on a soft purple wash with a fade-out gradient; bottom
 * half holds the title, word count, and elapsed time. Hover lifts and
 * tints the title primary.
 *
 * Translated from blog/ArticleListItem.tsx + personal-finance hover pattern.
 */
export interface DocumentCardData {
  id: string
  title: string
  excerpt: string
  status: DocumentStatus
  wordCount: number
  /** Pre-formatted relative time, e.g. "2 hrs ago" or "Yesterday". */
  updatedRelative: string
  /** Optional 0-100 SEO score, rendered as a tiny badge when present. */
  seoScore?: number
}

export interface DocumentCardProps {
  document: DocumentCardData
}

function seoTone(score: number): { label: string; classes: string } {
  if (score >= 80)
    return { label: 'EXCELLENT', classes: 'bg-success-container text-on-success-container' }
  if (score >= 60) return { label: 'GOOD', classes: 'bg-info-container text-on-info-container' }
  if (score >= 40)
    return { label: 'FAIR', classes: 'bg-secondary-container text-on-secondary-container' }
  return { label: 'POOR', classes: 'bg-error-container text-on-error-container' }
}

export function DocumentCard({ document }: DocumentCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tone = document.seoScore !== undefined ? seoTone(document.seoScore) : null
  return (
    <Link
      to={`/documents/${document.id}`}
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'group rounded-xl shadow-sm border border-outline-variant bg-surface overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-md',
      )}
    >
      <div
        className={cm.cn(
          cm.sp('p', 4),
          cm.h(32),
          'relative overflow-hidden border-b border-outline-variant bg-surface-container-low',
        )}
      >
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.textMuted,
            'font-serif italic leading-relaxed line-clamp-4',
          )}
        >
          {document.excerpt}
        </p>
        <div
          className={cm.cn(
            'absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface-container-low to-transparent',
          )}
        />
        <div className="absolute right-3 top-3">
          <DocumentStatusPill status={document.status} />
        </div>
      </div>
      <div
        className={cm.cn(
          cm.sp('p', 4),
          cm.flex({ direction: 'col', justify: 'between' }),
          cm.flex1,
        )}
      >
        <h3
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('base'),
            'font-serif text-on-surface line-clamp-2 leading-snug group-hover:text-primary transition-colors',
          )}
        >
          {document.title}
        </h3>
        <div className={cm.cn(cm.sp('mt', 4), cm.flex({ align: 'center', justify: 'between' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              cm.textMuted,
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
              format_align_left
            </span>
            {t(
              'common.countWords',
              { count: document.wordCount.toLocaleString() },
              { defaultValue: '{{count}} words' },
            )}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              cm.textMuted,
            )}
          >
            {tone ? (
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('px', 2),
                  cm.roundedFull,
                  'text-[9px] uppercase tracking-widest py-0.5',
                  tone.classes,
                )}
                title={t(
                  'documentCard.seoScoreTitle',
                  { score: document.seoScore ?? 0 },
                  { defaultValue: 'SEO score: {{score}}/100' },
                )}
              >
                {document.seoScore}
              </span>
            ) : null}
            <span>{document.updatedRelative}</span>
          </span>
        </div>
      </div>
    </Link>
  )
}

export default DocumentCard
