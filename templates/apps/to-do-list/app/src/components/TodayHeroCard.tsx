import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TodayHeroCardProps {
  totalTasks: number
  completedTasks: number
  overdueTasks: number
  streakDays: number
  /** Pretty date string for the eyebrow. */
  dateLabel?: string
}

/**
 * Productivity-flair gradient hero — indigo-violet panel with massive
 * progress ring, big completion count, streak flame chip, and a soft
 * "you've got this" subhead. Translated from banking's BalanceHeroCard
 * and project-management's WelcomeHeader patterns.
 */
export function TodayHeroCard({
  totalTasks,
  completedTasks,
  overdueTasks,
  streakDays,
  dateLabel,
}: TodayHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const remaining = Math.max(0, totalTasks - completedTasks)
  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Progress ring math: r=44, c=2*pi*r ~= 276
  const r = 44
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct / 100)

  return (
    <section
      className={cm.cn(
        'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-primary/20',
      )}
      style={{
        background:
          'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #be185d 100%)' /* #ec4899 was 3.53:1 (FAIL); #be185d = 6.04:1 */,
        minHeight: '320px',
      }}
    >
      {/* Decorative orbs */}
      <div
        className={cm.cn(
          'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn('absolute right-12 top-12 w-20 h-20 rounded-full bg-pink-400/40 blur-2xl')}
        aria-hidden="true"
      />

      {/* Floating dot motifs */}
      {[
        { x: 18, y: 26, c: 'rgba(255,255,255,0.45)' },
        { x: 28, y: 70, c: 'rgba(255,255,255,0.25)' },
        { x: 50, y: 22, c: 'rgba(255,255,255,0.35)' },
        { x: 64, y: 60, c: 'rgba(255,255,255,0.20)' },
        { x: 82, y: 32, c: 'rgba(255,255,255,0.30)' },
        { x: 90, y: 70, c: 'rgba(255,255,255,0.25)' },
      ].map((d, i) => (
        <span
          key={i}
          className={cm.cn('absolute rounded-full')}
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: '8px',
            height: '8px',
            backgroundColor: d.c,
            boxShadow: `0 0 0 6px ${d.c.replace('0.', '0.05')}`,
          }}
          aria-hidden="true"
        />
      ))}

      <div
        className={cm.cn(
          'relative z-10 p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center min-h-[320px]',
        )}
      >
        <div className={cm.cn('lg:col-span-7')}>
          <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            <span
              className={cm.cn(
                'px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-surface/20 backdrop-blur-md',
              )}
            >
              {dateLabel ?? t('status.today', {}, { defaultValue: 'Today' })}
            </span>
            {streakDays > 0 && (
              <span
                className={cm.cn(
                  'inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-400/30 backdrop-blur-md text-amber-100',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                  local_fire_department
                </span>
                {t(
                  'todayHeroCard.streak',
                  { count: streakDays },
                  { defaultValue: '{{count}}-day streak' },
                )}
              </span>
            )}
          </div>

          <p
            className={cm.cn(
              'text-[11px] font-bold uppercase tracking-widest text-white/80 mt-4 mb-2',
            )}
          >
            {t('todayHeroCard.eyebrow', {}, { defaultValue: "You've got this" })}
          </p>
          <h2
            className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]')}
          >
            {remaining === 0
              ? t(
                  'todayHeroCard.allDoneHeadline',
                  {},
                  { defaultValue: 'All clear · take a breath' },
                )
              : t(
                  'todayHeroCard.headline',
                  { count: remaining },
                  { defaultValue: '{{count}} tasks left today' },
                )}
          </h2>
          <p className={cm.cn('text-sm md:text-base text-white/85 mt-3 max-w-md')}>
            {overdueTasks > 0
              ? t(
                  'todayHeroCard.overdueSubline',
                  { count: overdueTasks },
                  { defaultValue: "{{count}} overdue · let's knock those out first" },
                )
              : t(
                  'todayHeroCard.subline',
                  {},
                  { defaultValue: 'Master your momentum — one focused stretch at a time.' },
                )}
          </p>

          <div className={cm.cn('mt-6 grid grid-cols-3 gap-3 max-w-md')}>
            <div className={cm.cn('bg-surface/10 backdrop-blur-md rounded-xl p-3')}>
              <p className={cm.cn('text-[9px] font-bold uppercase tracking-widest text-white/60')}>
                {t('todayHeroCard.done', {}, { defaultValue: 'Done' })}
              </p>
              <p className={cm.cn('text-2xl font-extrabold tabular-nums mt-1')}>{completedTasks}</p>
            </div>
            <div className={cm.cn('bg-surface/10 backdrop-blur-md rounded-xl p-3')}>
              <p className={cm.cn('text-[9px] font-bold uppercase tracking-widest text-white/60')}>
                {t('todayHeroCard.left', {}, { defaultValue: 'Left' })}
              </p>
              <p className={cm.cn('text-2xl font-extrabold tabular-nums mt-1')}>{remaining}</p>
            </div>
            <div className={cm.cn('bg-surface/10 backdrop-blur-md rounded-xl p-3')}>
              <p className={cm.cn('text-[9px] font-bold uppercase tracking-widest text-white/60')}>
                {t('status.overdue', {}, { defaultValue: 'Overdue' })}
              </p>
              <p
                className={cm.cn(
                  'text-2xl font-extrabold tabular-nums mt-1',
                  overdueTasks > 0 ? 'text-amber-200' : '',
                )}
              >
                {overdueTasks}
              </p>
            </div>
          </div>
        </div>

        {/* Progress ring */}
        <div className={cm.cn('lg:col-span-5 flex items-center justify-center')}>
          <div className={cm.cn('relative w-44 h-44 lg:w-56 lg:h-56')}>
            <svg
              className={cm.cn('w-full h-full -rotate-90')}
              viewBox="0 0 100 100"
              aria-hidden="true"
            >
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 600ms ease' }}
              />
            </svg>
            <div className={cm.cn('absolute inset-0 flex flex-col items-center justify-center')}>
              <p className={cm.cn('text-5xl font-extrabold tabular-nums')}>{pct}%</p>
              <p
                className={cm.cn(
                  'text-[11px] font-bold uppercase tracking-widest text-white/70 mt-1',
                )}
              >
                {t('common.completed', {}, { defaultValue: 'Completed' })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
