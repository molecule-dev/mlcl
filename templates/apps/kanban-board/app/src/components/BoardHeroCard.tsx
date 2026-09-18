import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Featured-board hero card — gradient backdrop, frosted-glass progress pill,
 * decorative blurred orbs, inline SVG sparkline of the past week's
 * cards-completed cadence.
 *
 * Translated from personal-finance's NetWorthCard.tsx + project-management's
 * WelcomeHeader.tsx — uses the Driftboard primary→primary-container gradient
 * and the cards-completed metric in 6xl-extrabold.
 */
export interface BoardHeroBoard {
  id: string
  name: string
  workspace: string
  description: string
  card_count: number
  completed_count: number
  wip_total: number
  wip_limit: number
  online_count: number
  due_date: string | null
}

interface BoardHeroCardProps {
  board: BoardHeroBoard
  /** 7-point sparkline values for the past week of cards-completed. */
  weekly?: number[]
}

const FALLBACK_WEEKLY = [3, 5, 4, 7, 6, 9, 11]

export function BoardHeroCard({ board, weekly = FALLBACK_WEEKLY }: BoardHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const progress =
    board.card_count === 0 ? 0 : Math.round((board.completed_count / board.card_count) * 100)
  const wipRatio = board.wip_limit === 0 ? 0 : Math.min(1, board.wip_total / board.wip_limit)

  // Build a smooth area sparkline path scaled into 0..100 viewBox y-axis.
  const max = Math.max(1, ...weekly)
  const stepX = 100 / Math.max(1, weekly.length - 1)
  const points = weekly.map(
    (v, i) => `${(i * stepX).toFixed(2)},${(40 - (v / max) * 32).toFixed(2)}`,
  )
  const linePath = `M ${points.join(' L ')}`
  const areaPath = `${linePath} L 100,40 L 0,40 Z`

  const dueLabel = board.due_date
    ? new Date(board.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : t('boardHeroCard.noDueDate', {}, { defaultValue: 'Open horizon' })

  return (
    <Link
      to={`/boards/${board.id}`}
      className={cm.cn(
        cm.sp('p', 8),
        cm.flex({ direction: 'col' }),
        cm.stack(6),
        'relative overflow-hidden rounded-[2rem] text-white',
        'bg-gradient-to-br from-primary via-primary to-primary-container',
        'shadow-[0_24px_60px_-30px_rgba(37,99,235,0.55)] transition-transform hover:-translate-y-0.5',
      )}
    >
      <div
        className={cm.cn(
          `absolute -right-20 -bottom-24 h-72 w-72 rounded-full bg-surface/15 blur-3xl pointer-events-none`,
        )}
      />
      <div
        className={cm.cn(
          `absolute -left-16 -top-20 h-64 w-64 rounded-full bg-surface/10 blur-3xl pointer-events-none`,
        )}
      />

      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), 'relative z-10')}>
        <div>
          <p
            className={cm.cn(
              cm.sp('mb', 2),
              'text-[10px] uppercase tracking-[0.32em] text-white/70 font-black',
            )}
          >
            {board.workspace}
          </p>
          <h2
            className={cm.cn(
              cm.sp('mb', 1),
              'text-3xl md:text-4xl font-extrabold tracking-tight leading-tight',
            )}
          >
            {board.name}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-white/80 max-w-md')}>{board.description}</p>
        </div>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            'shrink-0 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest',
            'bg-surface/20 backdrop-blur-md text-white',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>bolt</span>
          {t(
            'boardHeroCard.online',
            { count: board.online_count },
            { defaultValue: '{{count}} online' },
          )}
        </span>
      </div>

      <div
        className={cm.cn(cm.flex({ justify: 'between', align: 'end', gap: 'lg' }), 'relative z-10')}
      >
        <div>
          <p className={cm.cn('text-[11px] uppercase tracking-[0.28em] text-white/70 font-black')}>
            {t('boardHeroCard.completedLabel', {}, { defaultValue: 'Cards shipped' })}
          </p>
          <p className={cm.cn(`text-6xl md:text-7xl font-extrabold tracking-tighter leading-none`)}>
            {board.completed_count}
            <span className={cm.cn(`text-2xl font-bold text-white/70 ml-1`)}>
              / {board.card_count}
            </span>
          </p>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-white/85 font-semibold')}>
            {t(
              'boardHeroCard.progressPercent',
              { value: progress },
              { defaultValue: '{{value}}% of board complete' },
            )}
          </p>
        </div>

        <svg
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          className={cm.cn(`h-20 w-44 shrink-0 opacity-90`)}
        >
          <path d={areaPath} fill="white" fillOpacity="0.18" />
          <path
            d={linePath}
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }), 'relative z-10')}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            'px-3 py-1 rounded-full text-[11px] font-bold bg-surface/15 backdrop-blur-md text-white',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>flag</span>
          {t('boardHeroCard.due', { value: dueLabel }, { defaultValue: 'Due {{value}}' })}
        </span>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            'px-3 py-1 rounded-full text-[11px] font-bold bg-surface/15 backdrop-blur-md text-white',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>speed</span>
          {t(
            'boardHeroCard.wip',
            { current: board.wip_total, limit: board.wip_limit },
            { defaultValue: 'WIP {{current}}/{{limit}}' },
          )}
        </span>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            'px-3 py-1 rounded-full text-[11px] font-bold backdrop-blur-md text-white',
            wipRatio >= 1
              ? 'bg-error/40'
              : wipRatio >= 0.85
                ? 'bg-amber-400/40'
                : 'bg-emerald-300/30',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>trending_up</span>
          {wipRatio >= 1
            ? t('boardHeroCard.wipOver', {}, { defaultValue: 'Over WIP' })
            : t('boardHeroCard.wipFlow', {}, { defaultValue: 'Healthy flow' })}
        </span>
      </div>
    </Link>
  )
}

export default BoardHeroCard
