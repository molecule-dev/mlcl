import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface VersoNote {
  id: string
  /** Note title — rendered with the editorial serif. */
  title: string
  /** First-paragraph excerpt. */
  excerpt: string
  /** Pretty timestamp, e.g. "2 hours ago". */
  updatedAtLabel: string
  /** Notebook the note belongs to (sidebar parent). */
  notebook?: string
  /** Tag list. */
  tags?: ReadonlyArray<string>
  /** Inbound link / backlink count. */
  backlinkCount?: number
  /** Word count. */
  wordCount?: number
  /** Pinned / favorited flag. */
  pinned?: boolean
}

interface VersoNoteCardProps {
  note: VersoNote
  /** Compact mode — used for grids/lists where vertical room is tight. */
  density?: 'comfortable' | 'compact'
}

/**
 * Editorial note card — serif title, body excerpt, tag chips, and a
 * left "spine" accent stripe that picks up the brand indigo on hover.
 *
 * Translated from blog/ArticleListItem (editorial typography) and
 * personal-finance/ActivityRow (hover lift + accent stripe). Built
 * for grids on Home/Notes/Tags, and the master list on the editor
 * shell middle pane.
 */
export function VersoNoteCard({ note, density = 'comfortable' }: VersoNoteCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const compact = density === 'compact'

  return (
    <Link
      to={`/notes/${note.id}`}
      className={cm.cn(
        compact ? cm.sp('p', 4) : cm.sp('p', 6),
        'group relative block overflow-hidden rounded-2xl bg-surface-container-lowest border border-outline-variant/40',
        'hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md',
        'transition-all duration-200',
      )}
    >
      {/* Spine */}
      <span
        className={cm.cn(
          'absolute left-0 top-0 bottom-0 w-1 bg-primary/0 group-hover:bg-primary transition-colors',
        )}
        aria-hidden="true"
      />

      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 2))}>
        {note.notebook ? (
          <span
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-[0.32em] text-on-surface-variant/80',
            )}
          >
            {note.notebook}
          </span>
        ) : (
          <span aria-hidden="true" />
        )}
        {note.pinned ? (
          <span
            className={cm.cn('material-symbols-outlined text-[16px] text-primary')}
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-label={t('versoNoteCard.pinned', {}, { defaultValue: 'Pinned' })}
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
          fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
        }}
      >
        {note.title}
      </h3>

      {note.excerpt ? (
        <p
          className={cm.cn(
            compact ? 'text-[13px]' : 'text-sm',
            'mt-2 text-on-surface-variant leading-relaxed line-clamp-3',
          )}
        >
          {note.excerpt}
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
          <span className={cm.cn('truncate')}>{note.updatedAtLabel}</span>
          {note.wordCount && note.wordCount > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span className={cm.cn('whitespace-nowrap')}>
                {t(
                  'common.countWords',
                  { count: note.wordCount },
                  { defaultValue: '{{count}} words' },
                )}
              </span>
            </>
          ) : null}
          {(note.backlinkCount ?? 0) > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span className={cm.cn('whitespace-nowrap inline-flex items-center gap-1')}>
                <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                  link
                </span>
                {note.backlinkCount}
              </span>
            </>
          ) : null}
        </div>
        {note.tags?.length ? (
          <div className={cm.cn('flex items-center gap-1 flex-wrap justify-end')}>
            {note.tags.slice(0, 3).map((tag) => (
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

export default VersoNoteCard
