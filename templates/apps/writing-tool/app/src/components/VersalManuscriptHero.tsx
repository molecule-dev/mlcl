import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface VersalManuscriptHeroProps {
  /** Pretty date label for the eyebrow. e.g. "Wednesday · April 29". */
  dateLabel: string
  /** Title of the active manuscript or daily session. */
  manuscriptTitle: string
  /** Excerpt or last-line preview shown beneath the title. */
  manuscriptExcerpt?: string
  /** Today's word count toward the daily goal. */
  wordsToday: number
  /** Daily word goal (display only). */
  dailyGoal: number
  /** Streak in consecutive writing days (display only). */
  streakDays?: number
  /** Tag list — chapter, project, etc. */
  tags?: ReadonlyArray<string>
  /** Path the primary CTA navigates to (typically the editor). */
  ctaHref: string
}

/**
 * Versal's signature gradient hero — violet panel with Charter-Georgia
 * editorial headline, frosted-glass progress block, decorative blurred
 * orbs, and an inline streak chip.
 *
 * Translated from note-taking's VersoTodayHero (rounded-[2rem] gradient
 * + decorative orbs + frosted-glass content card). Adapted for Versal:
 * the inner card holds today's word-goal progress and a "last line"
 * teaser instead of a numbered outline — the writer's analogue of a
 * dashboard balance.
 */
export function VersalManuscriptHero({
  dateLabel,
  manuscriptTitle,
  manuscriptExcerpt,
  wordsToday,
  dailyGoal,
  streakDays = 0,
  tags = [],
  ctaHref,
}: VersalManuscriptHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const goal = Math.max(dailyGoal, 1)
  const progress = Math.min(100, Math.round((wordsToday / goal) * 100))
  const goalMet = wordsToday >= dailyGoal

  return (
    <section
      className={cm.cn(
        cm.sp('p', 10),
        'relative overflow-hidden rounded-[2rem] text-white shadow-[0_30px_70px_-30px_rgba(124,58,237,0.55)]',
        'bg-gradient-to-br from-primary via-primary to-primary-container',
      )}
    >
      <div
        className={cm.cn(
          'absolute -right-24 -bottom-28 h-80 w-80 rounded-full bg-surface/15 blur-3xl pointer-events-none',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute -left-20 -top-24 h-72 w-72 rounded-full bg-surface/10 blur-3xl pointer-events-none',
        )}
        aria-hidden="true"
      />

      <div className={cm.cn('relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center')}>
        <div className={cm.cn('lg:col-span-7')}>
          <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            <span
              className={cm.cn(
                'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface/20 backdrop-blur-md',
              )}
            >
              {t('versalManuscriptHero.todayLabel', {}, { defaultValue: 'Writing today' })}
            </span>
            <span
              className={cm.cn('text-[11px] font-semibold uppercase tracking-widest text-white/75')}
            >
              {dateLabel}
            </span>
            {streakDays > 0 ? (
              <span
                className={cm.cn(
                  'ml-auto inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-300/30 backdrop-blur-md text-amber-50',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                  local_fire_department
                </span>
                {t(
                  'versalManuscriptHero.streak',
                  { count: streakDays },
                  { defaultValue: '{{count}}-day streak' },
                )}
              </span>
            ) : null}
          </div>

          <h2
            className={cm.cn(
              'mt-6 text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]',
            )}
            style={{
              fontFamily:
                'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
            }}
          >
            {manuscriptTitle}
          </h2>
          {manuscriptExcerpt ? (
            <p
              className={cm.cn('mt-4 text-base md:text-lg text-white/85 max-w-xl leading-relaxed')}
              style={{
                fontFamily:
                  'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
              }}
            >
              {manuscriptExcerpt}
            </p>
          ) : null}

          <div className={cm.cn(cm.sp('mt', 6), 'flex flex-wrap items-center gap-3')}>
            <Link
              to={ctaHref}
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.flex({ align: 'center', gap: 'xs' }),
                'inline-flex rounded-xl text-sm font-bold bg-surface text-primary shadow-md hover:opacity-95 transition-opacity',
              )}
            >
              {t('versalManuscriptHero.cta', {}, { defaultValue: 'Continue writing' })}
              <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
            {tags.length ? (
              <div className={cm.cn('flex items-center gap-1.5')}>
                {tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className={cm.cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface/15 text-white/85',
                    )}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className={cm.cn('lg:col-span-5')}>
          <div
            className={cm.cn('rounded-2xl bg-surface/15 backdrop-blur-md p-5 text-white shadow-lg')}
          >
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-[0.32em] text-white/70 mb-3',
              )}
            >
              {t('versalManuscriptHero.goalLabel', {}, { defaultValue: "Today's word goal" })}
            </p>
            <div className={cm.cn('flex items-baseline gap-2')}>
              <span
                className={cm.cn('text-5xl font-extrabold tracking-tighter tabular-nums')}
                style={{
                  fontFamily:
                    'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                }}
              >
                {wordsToday.toLocaleString()}
              </span>
              <span className={cm.cn('text-sm font-semibold text-white/75 tabular-nums')}>
                / {dailyGoal.toLocaleString()}
              </span>
            </div>
            <div className={cm.cn('mt-4 h-2 rounded-full bg-surface/15 overflow-hidden')}>
              <div
                className={cm.cn(
                  'h-full rounded-full transition-[width] duration-500',
                  goalMet ? 'bg-emerald-300' : 'bg-surface',
                )}
                style={{ width: `${progress}%` }}
                aria-hidden="true"
              />
            </div>
            <div
              className={cm.cn(
                'mt-4 pt-4 border-t border-surface/15 grid grid-cols-3 gap-3 text-[11px] font-semibold',
              )}
            >
              <div>
                <p
                  className={cm.cn('text-white/60 uppercase tracking-widest text-[9px] font-black')}
                >
                  {t('nav.progress', {}, { defaultValue: 'Progress' })}
                </p>
                <p className={cm.cn('mt-0.5 text-base font-extrabold tabular-nums')}>{progress}%</p>
              </div>
              <div>
                <p
                  className={cm.cn('text-white/60 uppercase tracking-widest text-[9px] font-black')}
                >
                  {t('versalManuscriptHero.kpi.streak', {}, { defaultValue: 'Streak' })}
                </p>
                <p className={cm.cn('mt-0.5 text-base font-extrabold tabular-nums')}>
                  {streakDays} d
                </p>
              </div>
              <div>
                <p
                  className={cm.cn('text-white/60 uppercase tracking-widest text-[9px] font-black')}
                >
                  {t('nav.status', {}, { defaultValue: 'Status' })}
                </p>
                <p className={cm.cn('mt-0.5 text-base font-extrabold')}>
                  {goalMet
                    ? t('versalManuscriptHero.met', {}, { defaultValue: 'Met' })
                    : t('versalManuscriptHero.inProgress', {}, { defaultValue: 'On track' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default VersalManuscriptHero
