import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CollaboratorStack } from './CollaboratorStack.js'

/**
 * Board grid tile — used on /boards. Renders a stylised canvas thumbnail
 * (sticky-note rectangles + connector arcs over a dot-grid) above title +
 * folder + last-updated meta and a collaborator stack pill.
 *
 * Translated from project-management's TaskCard.tsx + the personal-finance
 * AccountCard hover-lift treatment. Kept the rounded-xl shadow-sm card chrome
 * and added a subtle scale on hover.
 */
export interface BoardCardProps {
  board: {
    id: string
    title: string
    folder?: string
    /** ISO8601 or human-readable label. */
    updatedLabel: string
    background: string
    /** Visibility — drives the badge in the bottom-right of the thumb. */
    visibility?: 'private' | 'shared' | 'public'
    collaborators: Array<{
      id: string
      name: string
      avatarColor: string
      online?: boolean
    }>
  }
}

const VISIBILITY_LABELS: Record<NonNullable<BoardCardProps['board']['visibility']>, string> = {
  private: 'lock',
  shared: 'group',
  public: 'public',
}

export function BoardCard({ board }: BoardCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visibilityIcon = VISIBILITY_LABELS[board.visibility ?? 'private']

  return (
    <Link
      to={`/board/${board.id}`}
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'group bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all duration-200',
      )}
    >
      <div
        className={cm.cn(cm.h(40), 'relative overflow-hidden')}
        style={{ backgroundColor: board.background }}
      >
        <svg
          viewBox="0 0 320 160"
          preserveAspectRatio="none"
          className={cm.cn(cm.w('full'), cm.h('full'))}
        >
          <defs>
            <pattern
              id={`dots-${board.id}`}
              x="0"
              y="0"
              width="16"
              height="16"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1" fill="rgba(15,23,42,0.18)" />
            </pattern>
          </defs>
          <rect width="320" height="160" fill={`url(#dots-${board.id})`} />
          <rect
            x="32"
            y="34"
            width="92"
            height="62"
            rx="6"
            fill="#fef08a"
            stroke="#1e1e2e"
            strokeOpacity="0.18"
            strokeWidth="1.5"
          />
          <rect
            x="148"
            y="60"
            width="74"
            height="48"
            rx="6"
            fill="#bfdbfe"
            stroke="#1e1e2e"
            strokeOpacity="0.18"
            strokeWidth="1.5"
          />
          <circle
            cx="252"
            cy="70"
            r="22"
            fill="#fecdd3"
            stroke="#1e1e2e"
            strokeOpacity="0.18"
            strokeWidth="1.5"
          />
          <path
            d="M124 65 L148 80"
            stroke="#5b5bf7"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="3 4"
          />
          <path d="M222 84 L232 84" stroke="#5b5bf7" strokeWidth="2" strokeLinecap="round" />
          <polygon points="232,80 240,84 232,88" fill="#5b5bf7" />
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
            `boardCard.visibility.${board.visibility ?? 'private'}`,
            {},
            { defaultValue: board.visibility ?? 'private' },
          )}
        </span>
      </div>
      <div className={cm.cn(cm.sp('p', 5), cm.stack(3))}>
        <div className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(1))}>
          {board.folder && (
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {board.folder}
            </span>
          )}
          <h3
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'text-on-surface tracking-tight truncate',
            )}
          >
            {board.title}
          </h3>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <CollaboratorStack collaborators={board.collaborators} max={4} />
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')}>schedule</span>
            {board.updatedLabel}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default BoardCard
