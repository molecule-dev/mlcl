import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface VersoTodayHeroProps {
  /** Pretty date string for the eyebrow. e.g. "Wednesday · April 29". */
  dateLabel: string
  /** Title of today's daily note (or empty to render the create-state). */
  noteTitle?: string
  /** First-paragraph excerpt of today's note. */
  noteExcerpt?: string
  /** Word count of today's note (display only). */
  wordCount?: number
  /** Tag list (display only). */
  tags?: ReadonlyArray<string>
  /** Streak in consecutive days (display only). */
  streakDays?: number
  /** Path to navigate to when the user wants to open today's note. */
  noteHref: string
}

/**
 * Verso's signature gradient hero — indigo→primary-container panel with
 * editorial serif headline, frosted-glass excerpt block, decorative
 * blurred orbs, and an inline streak chip.
 *
 * Translated from to-do-list's TodayHeroCard (rounded-[2rem] gradient
 * + decorative orbs + frosted-glass content) and project-management's
 * WelcomeHeader. The serif headline is the brand's editorial nod —
 * "thoughts take shape" via Georgia.
 */
export function VersoTodayHero({
  dateLabel,
  noteTitle,
  noteExcerpt,
  wordCount = 0,
  tags = [],
  streakDays = 0,
  noteHref,
}: VersoTodayHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const empty = !noteTitle

  return (
    <section
      className={cm.cn(
        cm.sp('p', 10),
        'relative overflow-hidden rounded-[2rem] text-white shadow-[0_30px_70px_-30px_rgba(59,95,192,0.55)]',
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
              {t('versoTodayHero.dailyLabel', {}, { defaultValue: 'Daily note' })}
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
                  'versoTodayHero.streak',
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
              fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
            }}
          >
            {empty
              ? t('versoTodayHero.emptyHeadline', {}, { defaultValue: 'Today is a blank page.' })
              : noteTitle}
          </h2>
          <p className={cm.cn('mt-4 text-base md:text-lg text-white/85 max-w-xl leading-relaxed')}>
            {empty
              ? t(
                  'versoTodayHero.emptySubline',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'Capture a thought, jot a meeting, or sketch tomorrow. {{appName}} keeps the structure quiet so the writing stays loud.',
                  },
                )
              : (noteExcerpt ??
                t(
                  'versoTodayHero.unwritten',
                  {},
                  { defaultValue: 'No words yet — open the note to begin.' },
                ))}
          </p>

          <div className={cm.cn(cm.sp('mt', 6), 'flex flex-wrap items-center gap-3')}>
            <Link
              to={noteHref}
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.flex({ align: 'center', gap: 'xs' }),
                'inline-flex rounded-xl text-sm font-bold bg-surface text-primary shadow-md hover:opacity-95 transition-opacity',
              )}
            >
              {empty
                ? t('versoTodayHero.createCta', {}, { defaultValue: "Start today's note" })
                : t('versoTodayHero.continueCta', {}, { defaultValue: 'Continue writing' })}
              <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
            {!empty ? (
              <span
                className={cm.cn(
                  'inline-flex items-center gap-2 text-[12px] text-white/85 font-semibold',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                  edit_note
                </span>
                {t(
                  'versoTodayHero.wordCount',
                  { count: wordCount },
                  { defaultValue: '{{count}} words today' },
                )}
              </span>
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
              {t('versoTodayHero.outlineLabel', {}, { defaultValue: "Today's outline" })}
            </p>
            <ul className={cm.cn('space-y-2.5 text-[14px] font-medium')}>
              {(tags.length ? tags : ['intro', 'detail', 'next steps']).map((tag, idx) => (
                <li key={tag + idx} className={cm.cn('flex items-center gap-3')}>
                  <span
                    className={cm.cn(
                      'w-5 h-5 rounded-full ring-2 ring-white/40 flex items-center justify-center text-[10px] font-black tabular-nums',
                    )}
                  >
                    {idx + 1}
                  </span>
                  <span className={cm.cn('truncate')}>{tag}</span>
                </li>
              ))}
            </ul>
            {tags.length > 0 ? (
              <div className={cm.cn('flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-surface/15')}>
                {tags.slice(0, 4).map((tag) => (
                  <span
                    key={`tag-${tag}`}
                    className={cm.cn(
                      'px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full bg-surface/15 text-white/85',
                    )}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

export default VersoTodayHero
