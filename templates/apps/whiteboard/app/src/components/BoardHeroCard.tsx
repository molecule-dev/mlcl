import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Gradient hero card — surfaces the most-recent board with a frosted-glass
 * collaborator pill, decorative blurred orbs, and a stylised dot-grid SVG that
 * echoes the canvas surface.
 *
 * Translated from personal-finance's NetWorthCard.tsx — same `bg-gradient-to-br
 * from-primary to-primary-container rounded-[2rem]` chrome with a 6xl
 * extrabold headline and white/20 backdrop-blur pill.
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

export function BoardHeroCard({ board }: BoardHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <Link
      to={`/board/${board.id}`}
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] lg:col-span-8 bg-gradient-to-br from-primary to-primary-hover rounded-[2rem] text-white relative overflow-hidden hover:scale-[1.005] transition-transform',
      )}
    >
      <div className={cm.cn('relative z-10', cm.stack(3))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-white/70',
            )}
          >
            {board.projectCode ?? t('boardHeroCard.eyebrow', {}, { defaultValue: 'Active board' })}
          </span>
          <span className={cm.cn('h-px w-8 bg-surface/30')}></span>
          <span className={cm.cn(cm.fontWeight('semibold'), cm.textSize('xs'), 'text-white/70')}>
            {board.updatedLabel}
          </span>
        </div>
        <h2
          className={cm.cn('text-5xl md:text-6xl font-extrabold tracking-tighter leading-[0.95]')}
        >
          {board.title}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 2))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface/20 backdrop-blur-md',
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
              'bg-surface/10 backdrop-blur-md text-white/80',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              edit_square
            </span>
            {t('boardHeroCard.openCanvas', {}, { defaultValue: 'Open canvas' })}
          </span>
        </div>
      </div>

      <div className={cm.cn('relative z-10', cm.sp('mt', 8), cm.h(28), cm.w('full'))}>
        <svg
          viewBox="0 0 400 110"
          preserveAspectRatio="none"
          className={cm.cn(cm.w('full'), cm.h('full'), 'opacity-40')}
        >
          <defs>
            <pattern id="dot-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="white" />
            </pattern>
          </defs>
          <rect width="400" height="110" fill="url(#dot-grid)" />
          <rect
            x="40"
            y="20"
            width="80"
            height="50"
            rx="4"
            fill="white"
            fillOpacity="0.18"
            stroke="white"
            strokeOpacity="0.6"
            strokeWidth="2"
          />
          <rect x="160" y="40" width="60" height="30" rx="4" fill="#fef08a" fillOpacity="0.6" />
          <circle
            cx="280"
            cy="50"
            r="22"
            fill="white"
            fillOpacity="0.18"
            stroke="white"
            strokeOpacity="0.6"
            strokeWidth="2"
          />
          <path
            d="M120 45 L160 55"
            stroke="white"
            strokeOpacity="0.6"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <path d="M220 55 L258 50" stroke="white" strokeOpacity="0.6" strokeWidth="2" />
        </svg>
      </div>

      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-20 -bottom-24 bg-surface/10 blur-3xl',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.w(40),
          cm.h(40),
          cm.roundedFull,
          'absolute -left-10 top-12 bg-secondary/30 blur-3xl',
        )}
      ></div>
    </Link>
  )
}

export default BoardHeroCard
