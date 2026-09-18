import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type VersalDocumentStatus = 'draft' | 'published' | 'archived'

export interface VersalDocument {
  id: string
  /** Document title — Charter-Georgia serif. */
  title: string
  /** First-paragraph excerpt. */
  excerpt: string
  /** Pretty timestamp, e.g. "2 hours ago". */
  updatedAtLabel: string
  /** Collection / folder this doc belongs to. */
  collection?: string
  /** Tag list. */
  tags?: ReadonlyArray<string>
  /** Word count. */
  wordCount?: number
  /** Approx. reading time in minutes. */
  readingMinutes?: number
  /** Workflow status. */
  status?: VersalDocumentStatus
  /** Pinned / favorited flag. */
  pinned?: boolean
}

interface VersalDocumentCardProps {
  doc: VersalDocument
  /** Compact mode for tighter grid layouts (Stats, sidebar). */
  density?: 'comfortable' | 'compact'
}

const STATUS_TONE: Record<VersalDocumentStatus, string> = {
  draft: 'bg-primary/10 text-primary',
  published: 'bg-emerald-500/10 text-success',
  archived: 'bg-slate-500/10 text-foreground-secondary',
}

/**
 * Editorial document card — Charter-Georgia title, body excerpt, status
 * pill, and a left "spine" accent stripe that picks up the violet brand
 * on hover.
 *
 * Translated from note-taking's VersoNoteCard (editorial typography +
 * hover spine). Used by Library (master list), Stats (per-document
 * progress) and the Editor sidebar's recent-docs rail.
 */
export function VersalDocumentCard({ doc, density = 'comfortable' }: VersalDocumentCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const compact = density === 'compact'
  const status = doc.status ?? 'draft'

  return (
    <Link
      to={`/editor/${doc.id}`}
      className={cm.cn(
        compact ? cm.sp('p', 4) : cm.sp('p', 6),
        'group relative block overflow-hidden rounded-2xl bg-surface-container-lowest border border-outline-variant/40',
        'hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md',
        'transition-all duration-200',
      )}
    >
      <span
        className={cm.cn(
          'absolute left-0 top-0 bottom-0 w-1 bg-primary/0 group-hover:bg-primary transition-colors',
        )}
        aria-hidden="true"
      />

      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 2))}>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          {doc.collection ? (
            <span
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-[0.32em] text-on-surface-variant/80',
              )}
            >
              {doc.collection}
            </span>
          ) : null}
          <span
            className={cm.cn(
              'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest',
              STATUS_TONE[status],
            )}
          >
            {t(`versalDocumentCard.status.${status}`, {}, { defaultValue: status })}
          </span>
        </div>
        {doc.pinned ? (
          <span
            className={cm.cn('material-symbols-outlined text-[16px] text-primary')}
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-label={t('versalDocumentCard.pinned', {}, { defaultValue: 'Pinned' })}
          >
            push_pin
          </span>
        ) : null}
      </div>

      <h3
        className={cm.cn(
          compact ? cm.textSize('lg') : cm.textSize('xl'),
          'font-bold tracking-tight text-on-surface leading-snug line-clamp-2',
        )}
        style={{
          fontFamily:
            'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
        }}
      >
        {doc.title}
      </h3>

      {doc.excerpt ? (
        <p
          className={cm.cn(
            compact ? 'text-[13px]' : 'text-sm',
            'mt-2 text-on-surface-variant leading-relaxed line-clamp-3',
          )}
          style={{
            fontFamily:
              'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
          }}
        >
          {doc.excerpt}
        </p>
      ) : null}

      <div
        className={cm.cn(cm.sp('mt', 4), cm.flex({ align: 'center', justify: 'between' }), 'gap-3')}
      >
        <div
          className={cm.cn(
            'flex items-center gap-2 text-[11px] text-on-surface-variant font-semibold flex-1 min-w-0',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
            schedule
          </span>
          <span className={cm.cn('truncate')}>{doc.updatedAtLabel}</span>
          {doc.wordCount && doc.wordCount > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span className={cm.cn('whitespace-nowrap')}>
                {t(
                  'common.countWords',
                  { count: doc.wordCount },
                  { defaultValue: '{{count}} words' },
                )}
              </span>
            </>
          ) : null}
          {doc.readingMinutes && doc.readingMinutes > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span className={cm.cn('whitespace-nowrap inline-flex items-center gap-1')}>
                <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                  timer
                </span>
                {t(
                  'versalDocumentCard.readingTime',
                  { minutes: doc.readingMinutes },
                  { defaultValue: '{{minutes}} min read' },
                )}
              </span>
            </>
          ) : null}
        </div>
        {doc.tags?.length ? (
          <div className={cm.cn('flex items-center gap-1 flex-wrap justify-end')}>
            {doc.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className={cm.cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary',
                )}
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  )
}

export default VersalDocumentCard
