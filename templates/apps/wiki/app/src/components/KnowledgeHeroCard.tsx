import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Gradient hero card — Cairn's editorial rooflight on Home + Landing.
 * Indigo→amber gradient with frosted-glass meta pill, decorative blurred
 * orbs, inline SVG sparkline of weekly edits, and a 6xl page count.
 *
 * Translated from personal-finance/NetWorthCard.tsx and blog/HeroSection.tsx
 * — same anatomy (large numeric, frosted pill, decorative orbs, sparkline)
 * with editorial typography swapped in for the calm/precise voice.
 */

export interface KnowledgeHeroCardProps {
  /** Total pages across the workspace. */
  pageCount: number
  /** Active contributors over the trailing 30 days. */
  contributorCount: number
  /** Edits per day for the last 7 days, oldest → newest. */
  weeklyEdits: number[]
  /** Workspace name shown in the eyebrow. */
  workspaceName?: string
  /** Last-edited timestamp for the meta pill. */
  lastEditedLabel?: string
}

export function KnowledgeHeroCard({
  pageCount,
  contributorCount,
  weeklyEdits,
  workspaceName,
  lastEditedLabel,
}: KnowledgeHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const max = Math.max(...weeklyEdits, 1)
  const points = weeklyEdits
    .map((v, i) => `${(i / Math.max(weeklyEdits.length - 1, 1)) * 100},${40 - (v / max) * 36}`)
    .join(' ')
  const areaPath = `0,40 ${points} 100,40`

  return (
    <section
      className={cm.cn(
        cm.sp('p', 10),
        'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary to-secondary text-white shadow-md',
      )}
    >
      <div
        className={cm.cn(
          'pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-surface/15 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-surface/10 blur-3xl',
        )}
        aria-hidden="true"
      />

      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'relative z-10')}>
        <div className={cm.flex({ align: 'center', gap: 'xs' })}>
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              'rounded-full bg-surface/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest',
            )}
          >
            {t(
              'knowledgeHeroCard.eyebrow',
              { workspace: workspaceName || 'Workspace' },
              { defaultValue: '{{workspace}} · Knowledge cairn' },
            )}
          </span>
        </div>

        <h1
          className={cm.cn(cm.sp('mt', 2), 'text-6xl font-extrabold tracking-tighter leading-none')}
        >
          {pageCount.toLocaleString()}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), 'font-medium text-white/85')}>
          {t(
            'knowledgeHeroCard.subtitle',
            { contributors: contributorCount },
            {
              defaultValue:
                'Pages stacked across the workspace, tended by {{contributors}} contributors.',
            },
          )}
        </p>

        <div className={cm.cn(cm.sp('mt', 4), cm.flex({ align: 'center', gap: 'md' }))}>
          {lastEditedLabel ? (
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('sm'),
                'rounded-full bg-surface/15 backdrop-blur-md font-medium text-white/90',
              )}
            >
              <span className={cm.cn('material-symbols-outlined align-middle text-[14px] mr-1')}>
                edit_note
              </span>
              {lastEditedLabel}
            </span>
          ) : null}
          <svg viewBox="0 0 100 40" className={cm.cn('h-10 w-40')} aria-hidden="true">
            <polygon points={areaPath} fill="rgba(255,255,255,0.25)" />
            <polyline
              points={points}
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </section>
  )
}
