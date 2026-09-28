/**
 * Triad of KPI cards with a coloured left accent — quizzes played,
 * accuracy, current streak. Mirrors the polished triad used on Discover
 * and Profile.
 *
 * Translated from lms/KpiCard.tsx and crm-style left-accent KPI cards
 * (the shared inset accent bar + label in its color + extrabold value + hover lift).
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type QuizStat = {
  key: string
  label: string
  value: string
  delta?: string
  glyph: string
  accent: 'primary' | 'amber' | 'emerald'
}

export type QuizStatsRowProps = {
  stats: QuizStat[]
}

/** The color the card's accent bar and label take (`--mol-accent`). */
const ACCENT_TO_VAR: Record<QuizStat['accent'], string> = {
  primary: 'var(--color-primary)',
  amber: 'var(--color-amber-500)',
  emerald: 'var(--color-emerald-500)',
}

const ACCENT_TO_TEXT: Record<QuizStat['accent'], string> = {
  primary: 'text-primary',
  amber: 'text-warning',
  emerald: 'text-success',
}

const ACCENT_TO_BG: Record<QuizStat['accent'], string> = {
  primary: 'bg-primary-container/40',
  amber: 'bg-warning-light',
  emerald: 'bg-success-light',
}

export function QuizStatsRow({ stats }: QuizStatsRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'sm:grid-cols-2 lg:grid-cols-3')}>
      {stats.map((stat) => (
        <div
          key={stat.key}
          className={cm.cn(
            cm.sp('p', 6),
            cm.accentCard({ tone: 'custom' }),
            'group rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/10 transition-transform hover:-translate-y-0.5',
          )}
          style={{ ['--mol-accent' as string]: ACCENT_TO_VAR[stat.accent] }}
        >
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
            <span
              className={cm.cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                ACCENT_TO_BG[stat.accent],
                ACCENT_TO_TEXT[stat.accent],
              )}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined">{stat.glyph}</span>
            </span>
            {stat.delta ? (
              <span
                className={cm.cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest',
                  ACCENT_TO_BG[stat.accent],
                  ACCENT_TO_TEXT[stat.accent],
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                  trending_up
                </span>
                {stat.delta}
              </span>
            ) : null}
          </div>
          <p className={cm.cn(cm.accentCardLabel({ tone: 'custom' }), cm.sp('mb', 1))}>
            {t(`quizStatsRow.${stat.key}.label`, {}, { defaultValue: stat.label })}
          </p>
          <p className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight font-extrabold')}>
            {t(
              `quizStatsRow.${stat.key}.value`,
              { value: stat.value },
              { defaultValue: '{{value}}' },
            )}
          </p>
        </div>
      ))}
    </section>
  )
}

export default QuizStatsRow
