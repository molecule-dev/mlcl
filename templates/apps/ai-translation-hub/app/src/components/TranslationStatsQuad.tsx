import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TranslationStatsQuadProps {
  activeProjects: number
  wordsTranslated: number
  qualityScore: number
  teamMembers: number
}

function fmtCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

interface Stat {
  key: 'activeProjects' | 'words' | 'quality' | 'team'
  defaultLabel: string
  value: string
  icon: string
  tone: string
  trend?: string
}

/**
 * Four-up KPI grid — surface-container-lowest cards with corner orb
 * accent, mono-tabular value, uppercase label.
 *
 * Pattern translated from personal-finance's DashboardAccountOverview
 * triad and the dashboard fixture's `bg-gradient-to-br from-primary/5`
 * decorative corner shape.
 */
export function TranslationStatsQuad({
  activeProjects,
  wordsTranslated,
  qualityScore,
  teamMembers,
}: TranslationStatsQuadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const stats: ReadonlyArray<Stat> = [
    {
      key: 'activeProjects',
      defaultLabel: 'Active projects',
      value: String(activeProjects),
      icon: 'folder_copy',
      tone: 'text-primary',
    },
    {
      key: 'words',
      defaultLabel: 'Words translated',
      value: fmtCompactNumber(wordsTranslated),
      icon: 'translate',
      tone: 'text-secondary',
    },
    {
      key: 'quality',
      defaultLabel: 'Avg quality score',
      value: `${qualityScore}%`,
      icon: 'verified',
      tone: 'text-tertiary',
      trend: t('translationStatsQuad.qualityTrend', {}, { defaultValue: '+2.4 vs last month' }),
    },
    {
      key: 'team',
      defaultLabel: 'Team members',
      value: String(teamMembers),
      icon: 'group',
      tone: 'text-on-secondary-container',
    },
  ]

  return (
    <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>
      {stats.map((s) => (
        <div
          key={s.key}
          className={cm.cn(
            cm.sp('p', 5),
            'relative overflow-hidden bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container/50 hover:-translate-y-0.5 transition-transform',
          )}
        >
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-primary/5 to-transparent rounded-full -mr-8 -mt-8',
            )}
          />
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('mb', 3),
              'relative z-10',
            )}
          >
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(`translationStatsQuad.${s.key}`, {}, { defaultValue: s.defaultLabel })}
            </span>
            <span
              className={cm.cn('material-symbols-outlined text-[20px]', s.tone)}
              aria-hidden="true"
            >
              {s.icon}
            </span>
          </div>
          <p
            className={cm.cn(
              cm.textSize('3xl'),
              'font-extrabold tabular-nums text-on-background relative z-10',
            )}
          >
            {s.value}
          </p>
          {s.trend && (
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mt', 1),
                'text-on-surface-variant relative z-10 font-mono',
              )}
            >
              {s.trend}
            </p>
          )}
        </div>
      ))}
    </section>
  )
}
