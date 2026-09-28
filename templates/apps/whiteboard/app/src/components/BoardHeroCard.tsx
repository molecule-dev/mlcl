import type { ReactNode } from 'react'

import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Live board preview — the hero graphic from the Stitch design: a white
 * infinite-canvas surface with a dot grid, a floating tool toolbar, pastel
 * sticky notes annotated in the handwriting font, and multiplayer cursors
 * with name tags. The board's real data (project code, updated label, title,
 * active collaborators) rides in a frosted bar along the bottom edge.
 *
 * Colors come exclusively from theme.css tokens (--color-sticky-*,
 * --color-cursor-*, --color-canvas-*, brand colors) referenced via Tailwind
 * utilities or var() inside the SVG doodles — never hardcoded hex.
 */
export interface BoardHeroCardProps {
  board: {
    id: string
    title: string
    /** Number of collaborators currently active on this board. */
    activeCollaborators: number
    /** Human-readable label (e.g. "Updated 12 min ago"). */
    updatedLabel: string
    /** Three-letter project code shown as eyebrow. */
    projectCode?: string
  }
}

/** A multiplayer cursor: pointer arrow + name tag, one hue per teammate. */
function LiveCursor({
  color,
  name,
  className,
}: {
  color: string
  name: string
  className: string
}) {
  return (
    <div className={`absolute flex items-center gap-1 ${className}`} aria-hidden="true">
      <svg className="w-5 h-5" viewBox="0 0 24 24" style={{ fill: `var(${color})` }}>
        <path d="M7 2l12 11.2-5.8.5 3.3 7.3-2.2.9-3.2-7.4-4.4 5.2z" />
      </svg>
      <span
        className="text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-sm"
        style={{ backgroundColor: `var(${color})` }}
      >
        {name}
      </span>
    </div>
  )
}

/** Handwriting note on a pastel sticky, slightly rotated like a real board. */
function StickyNote({
  color,
  rotate,
  className,
  children,
}: {
  color: string
  rotate: string
  className: string
  children: ReactNode
}) {
  return (
    <div
      className={`absolute aspect-square shadow-md p-4 rounded-sm ${rotate} ${className}`}
      style={{ backgroundColor: `var(${color})` }}
    >
      <p className="font-handwriting text-on-surface text-xl leading-tight">{children}</p>
    </div>
  )
}

export function BoardHeroCard({ board }: BoardHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <Link
      to={`/board/${board.id}`}
      aria-label={board.title}
      className={cm.cn(
        'group relative flex flex-col w-full overflow-hidden bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-2xl hover:shadow-xl transition-shadow',
      )}
      style={{ aspectRatio: '4 / 3' }}
    >
      {/* Dot-grid canvas surface */}
      <div
        aria-hidden="true"
        className={cm.cn(cm.inset0, cm.position('absolute'), 'dot-grid opacity-60')}
      ></div>

      {/* Floating tool toolbar */}
      <div
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.position('absolute'),
          'top-4 left-1/2 -translate-x-1/2 z-20 bg-surface/90 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-outline-variant/30',
        )}
      >
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-8 h-8 rounded bg-surface-container-high text-on-surface-variant',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>near_me</span>
        </span>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-8 h-8 rounded bg-primary text-white shadow-sm',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
            sticky_note_2
          </span>
        </span>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-8 h-8 rounded bg-surface-container-high text-on-surface-variant',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>edit</span>
        </span>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-8 h-8 rounded bg-surface-container-high text-on-surface-variant',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>title</span>
        </span>
      </div>

      {/* Sticky notes */}
      <StickyNote
        color="--color-sticky-yellow"
        rotate="-rotate-3"
        className="top-10 left-8 w-36 md:w-40"
      >
        {t('boardHeroCard.noteYellow', {}, { defaultValue: 'Redesign landing page header' })}
      </StickyNote>
      <StickyNote
        color="--color-sticky-pink"
        rotate="rotate-3"
        className="top-1/3 right-8 w-36 md:w-44"
      >
        {t('boardHeroCard.notePink', {}, { defaultValue: 'Need more contrast here!' })}
      </StickyNote>
      <StickyNote
        color="--color-sticky-blue"
        rotate="-rotate-1"
        className="bottom-28 left-16 md:left-24 w-32 md:w-36"
      >
        {t('boardHeroCard.noteBlue', {}, { defaultValue: 'Add animation' })}
      </StickyNote>

      {/* Hand-drawn connectors + shapes */}
      <svg
        aria-hidden="true"
        className={cm.cn(cm.inset0, cm.position('absolute'), 'w-full h-full pointer-events-none')}
        viewBox="0 0 400 300"
        preserveAspectRatio="none"
      >
        <path
          d="M 180 120 Q 250 80 320 150"
          fill="none"
          stroke="var(--color-secondary)"
          strokeDasharray="5,5"
          strokeWidth="3"
        />
        <polygon fill="var(--color-secondary)" points="315,145 325,155 310,160" />
        <circle
          cx="280"
          cy="220"
          r="40"
          fill="none"
          stroke="var(--color-canvas-accent)"
          strokeWidth="4"
          opacity="0.5"
        />
      </svg>
      <div
        aria-hidden="true"
        className={cm.cn(
          'font-handwriting text-canvas-accent text-3xl font-bold -rotate-12 absolute top-2/5 left-2/5',
        )}
      >
        {t('boardHeroCard.bigIdea', {}, { defaultValue: 'Big Idea!' })}
      </div>

      {/* Multiplayer cursors */}
      <LiveCursor color="--color-cursor-pink" name="Ari" className="bottom-2/3 right-4 z-10" />
      <LiveCursor color="--color-cursor-cyan" name="Jin" className="bottom-40 left-10 z-10" />
      <LiveCursor color="--color-cursor-orange" name="Maya" className="top-1/2 left-1/2 z-10" />

      {/* Board data bar — the real, linkable payload */}
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          cm.position('absolute'),
          'bottom-4 left-4 right-4 z-20 bg-surface/85 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-outline-variant/30 shadow-sm',
        )}
      >
        <div className="flex flex-col min-w-0">
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs'))}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.uppercase,
                cm.trackingWide,
                'text-on-surface-variant',
              )}
            >
              {board.projectCode ??
                t('boardHeroCard.eyebrow', {}, { defaultValue: 'Active board' })}
            </span>
            <span className={cm.cn('h-px w-6 bg-outline-variant/40')} aria-hidden="true"></span>
            <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface-variant truncate')}>
              {board.updatedLabel}
            </span>
          </span>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('base'),
              'text-on-surface truncate',
            )}
          >
            {board.title}
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0')}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-primary text-white',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>group</span>
            {t(
              'boardHeroCard.activeCollaborators',
              { count: board.activeCollaborators },
              { defaultValue: '{{count}} active' },
            )}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface-container-high text-on-surface-variant hidden sm:flex',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              edit_square
            </span>
            {t('boardHeroCard.openCanvas', {}, { defaultValue: 'Open canvas' })}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default BoardHeroCard
