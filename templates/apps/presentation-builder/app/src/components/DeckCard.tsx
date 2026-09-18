import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CollaboratorStack } from './CollaboratorStack.js'

/**
 * Deck grid tile — rendered on /decks. Stylised 16:9 stage thumbnail
 * (deep-navy slide canvas with title slide preview + chart) above title +
 * folder + last-edited meta with a collaborator stack pill.
 *
 * Translated from design-canvas's ProjectCard.tsx — kept the rounded-xl
 * shadow-sm card chrome + hover-lift treatment, swapped vector tools for a
 * presenter-stage preview matching Overture's brand.
 */
export interface DeckCardProps {
  deck: {
    id: string
    title: string
    folder?: string
    /** Human-readable label (e.g. "Edited 4 min ago"). */
    updatedLabel: string
    /** Number of slides in the deck. */
    slideCount: number
    /** Visibility — drives the badge in the top-right of the thumb. */
    visibility?: 'private' | 'shared' | 'public'
    /** Optional theme accent color used for the title bar in the preview. */
    themeColor?: string
    /** Status pill (Editing / Ready / Reviewing / Archived). */
    status?: 'editing' | 'ready' | 'reviewing' | 'archived'
    collaborators: Array<{
      id: string
      name: string
      avatarColor: string
      online?: boolean
    }>
  }
}

const VISIBILITY_ICONS: Record<NonNullable<DeckCardProps['deck']['visibility']>, string> = {
  private: 'lock',
  shared: 'group',
  public: 'public',
}

const STATUS_STYLE: Record<
  NonNullable<DeckCardProps['deck']['status']>,
  { bg: string; label: string }
> = {
  editing: { bg: 'bg-warning/15 text-warning', label: 'Editing' },
  ready: { bg: 'bg-tertiary/15 text-tertiary', label: 'Ready' },
  reviewing: { bg: 'bg-primary/15 text-primary', label: 'Reviewing' },
  archived: { bg: 'bg-surface-container text-on-surface-variant', label: 'Archived' },
}

export function DeckCard({ deck }: DeckCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visibilityIcon = VISIBILITY_ICONS[deck.visibility ?? 'private']
  const themeColor = deck.themeColor ?? 'var(--mol-color-primary)'
  const status = deck.status ? STATUS_STYLE[deck.status] : null

  return (
    <Link
      to={`/decks/${deck.id}/edit`}
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'group bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all duration-200',
      )}
    >
      <div
        className={cm.cn('relative overflow-hidden')}
        style={{ aspectRatio: '16 / 9', backgroundColor: 'var(--color-slide-canvas)' }}
      >
        <svg
          viewBox="0 0 320 180"
          preserveAspectRatio="xMidYMid meet"
          className={cm.cn(cm.w('full'), cm.h('full'))}
        >
          <defs>
            <pattern
              id={`dc-grid-${deck.id}`}
              x="0"
              y="0"
              width="14"
              height="14"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1.5" cy="1.5" r="0.8" fill="rgba(255,255,255,0.08)" />
            </pattern>
            <linearGradient id={`dc-stage-${deck.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-slide-canvas-deep)" />
              <stop offset="100%" stopColor="var(--color-slide-canvas)" />
            </linearGradient>
          </defs>
          <rect width="320" height="180" fill={`url(#dc-stage-${deck.id})`} />
          <rect width="320" height="180" fill={`url(#dc-grid-${deck.id})`} />
          {/* slide title */}
          <rect x="40" y="48" width="180" height="14" rx="4" fill={themeColor} />
          {/* slide subtitle */}
          <rect x="40" y="68" width="120" height="6" rx="2" fill="#ffffff" fillOpacity="0.6" />
          {/* chart */}
          <path
            d="M40 130 L75 116 L110 122 L145 100 L180 108 L215 84 L250 90 L280 70"
            stroke="var(--mol-color-secondary)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="280" cy="70" r="4" style={{ fill: 'var(--mol-color-secondary)' }} />
          {/* slide number */}
          <text
            x="280"
            y="160"
            style={{ fill: 'var(--color-slide-text-dim)' }}
            fontFamily="Inter"
            fontSize="9"
            fontWeight="600"
            textAnchor="end"
          >
            01 / {String(deck.slideCount).padStart(2, '0')}
          </text>
        </svg>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'absolute top-3 right-3 bg-surface/85 backdrop-blur-md text-on-surface uppercase tracking-widest text-[10px]',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[14px]')}>{visibilityIcon}</span>
          {t(
            `deckCard.visibility.${deck.visibility ?? 'private'}`,
            {},
            { defaultValue: deck.visibility ?? 'private' },
          )}
        </span>
        {status && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.fontWeight('bold'),
              'absolute top-3 left-3 backdrop-blur-md text-[10px] uppercase tracking-widest',
              status.bg,
            )}
          >
            <span className={cm.cn('w-1.5 h-1.5 rounded-full bg-current')}></span>
            {t(`deckCard.status.${deck.status}`, {}, { defaultValue: status.label })}
          </span>
        )}
      </div>
      <div className={cm.cn(cm.sp('p', 5), cm.stack(3))}>
        <div className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(1))}>
          {deck.folder && (
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {deck.folder}
            </span>
          )}
          <h3
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'text-on-surface tracking-tight truncate',
            )}
          >
            {deck.title}
          </h3>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <CollaboratorStack collaborators={deck.collaborators} max={4} />
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')}>schedule</span>
            {deck.updatedLabel}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default DeckCard
