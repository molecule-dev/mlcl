import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Project {
  id: string
  name: string
  color: string
  description: string
  sections?: { id: string; name: string }[]
}

interface ProjectTriadProps {
  projects: Project[]
  /** Per-project counts: total + completed. */
  taskCounts: Record<string, { total: number; completed: number }>
}

/**
 * Three-up project cards translated from banking's AccountsTriad pattern,
 * recoloured with the project's hex accent (left border + icon chip tint).
 * Shows progress bar + counts + section count.
 */
export function ProjectTriad({ projects, taskCounts }: ProjectTriadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const featured = projects.slice(0, 3)

  if (featured.length === 0) return null

  return (
    <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
      {featured.map((p) => {
        const counts = taskCounts[p.id] ?? { total: 0, completed: 0 }
        const pct = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0
        const sectionsCount = p.sections?.length ?? 0
        return (
          <Link
            key={p.id}
            to={`/projects/${p.id}`}
            className={cm.cn(
              'group block bg-surface-container-low rounded-2xl p-6 hover:bg-surface-container-lowest hover:shadow-2xl hover:shadow-on-surface/5 transition-all',
              cm.accentCard({ tone: 'custom' }),
            )}
            style={{ ['--mol-accent' as string]: p.color }}
          >
            <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
              <div
                className={cm.cn(
                  'p-3 bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                )}
                style={{ color: p.color }}
              >
                <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                  folder
                </span>
              </div>
              <span
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant tabular-nums',
                )}
              >
                {t(
                  'projectTriad.taskCount',
                  { count: counts.total },
                  { defaultValue: '{{count}} tasks' },
                )}
              </span>
            </div>

            <h3
              className={cm.cn(
                'text-lg font-extrabold tracking-tight text-on-surface line-clamp-1 group-hover:text-primary transition-colors',
              )}
            >
              {p.name}
            </h3>
            <p
              className={cm.cn('text-xs text-on-surface-variant line-clamp-2 leading-relaxed mt-1')}
            >
              {p.description}
            </p>

            <div className={cm.cn('mt-4')}>
              <div className={cm.cn('flex items-baseline justify-between mb-1.5')}>
                <span
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('nav.progress', {}, { defaultValue: 'Progress' })}
                </span>
                <span
                  className={cm.cn('text-[11px] font-extrabold tabular-nums')}
                  style={{ color: p.color }}
                >
                  {pct}%
                </span>
              </div>
              <div
                className={cm.cn('h-1.5 w-full bg-surface-container rounded-full overflow-hidden')}
              >
                <div
                  className={cm.cn('h-full rounded-full transition-all')}
                  style={{ width: `${pct}%`, backgroundColor: p.color }}
                  aria-hidden="true"
                />
              </div>
            </div>

            {sectionsCount > 0 && (
              <p
                className={cm.cn('text-[10px] font-mono text-on-surface-variant tabular-nums mt-3')}
              >
                {t(
                  'projectTriad.sections',
                  { count: sectionsCount },
                  { defaultValue: '{{count}} sections' },
                )}
              </p>
            )}
          </Link>
        )
      })}
    </section>
  )
}
