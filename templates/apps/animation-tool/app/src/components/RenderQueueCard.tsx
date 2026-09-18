/**
 * Render queue progress card — list of currently-rendering exports with mono
 * timecode + gradient progress bar.
 *
 * Pattern source: ci-cd-dashboard pipeline progress + ai-data-analyst
 * job-status. Adapted to Vivace primary/secondary gradient.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface RenderJob {
  id: string
  filename: string
  /** 0–100 inclusive; null/undefined → queued. */
  progress: number | null
  /** Estimated remaining time. */
  eta?: string
}

interface RenderQueueCardProps {
  jobs: RenderJob[]
  loading?: boolean
  error?: string | null
}

export function RenderQueueCard({ jobs, loading, error }: RenderQueueCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      className={cm.cn(cm.sp('p', 5), cm.stack(4), 'rounded-xl')}
      style={{
        backgroundColor: 'var(--anim-surface)',
        border: '1px solid var(--anim-border)',
      }}
    >
      <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <h3
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
          style={{ color: 'var(--anim-text)' }}
        >
          {t('renderQueueCard.title', {}, { defaultValue: 'Active render queue' })}
        </h3>
        <span
          className={cm.cn('font-mono text-[10px] uppercase tracking-widest')}
          style={{ color: 'var(--anim-secondary)' }}
        >
          {t(
            'renderQueueCard.jobCount',
            { count: jobs.length },
            { defaultValue: '{{count}} jobs' },
          )}
        </span>
      </header>

      {loading && (
        <p
          className={cm.cn(cm.textSize('xs'), cm.textMuted, 'font-mono uppercase tracking-widest')}
        >
          {t('renderQueueCard.loading', {}, { defaultValue: 'Polling render daemon…' })}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className={cm.cn(cm.textSize('xs'), 'font-mono uppercase tracking-widest')}
          style={{ color: 'var(--anim-danger)' }}
        >
          {error}
        </p>
      )}

      {!loading && !error && jobs.length === 0 && (
        <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
          {t(
            'renderQueueCard.empty',
            {},
            { defaultValue: 'No active renders. Export a project to fill the queue.' },
          )}
        </p>
      )}

      <ul className={cm.stack(4)}>
        {jobs.map((job) => {
          const queued = job.progress == null
          const pct = queued ? 0 : Math.max(0, Math.min(100, job.progress!))
          return (
            <li key={job.id} className={cm.stack(1)}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.textSize('xs'),
                )}
              >
                <span
                  className={cm.cn('truncate pr-2 font-mono')}
                  style={{ color: 'var(--anim-text)' }}
                >
                  {job.filename}
                </span>
                <span
                  className={cm.cn('font-mono')}
                  style={{ color: 'var(--anim-text-secondary)' }}
                >
                  {queued ? t('status.queued', {}, { defaultValue: 'Queued' }) : `${pct}%`}
                </span>
              </div>
              <div
                className={cm.cn('h-1.5 w-full rounded-full overflow-hidden')}
                style={{ backgroundColor: 'var(--anim-background)' }}
              >
                <div
                  className={cm.cn('h-full rounded-full transition-[width] duration-500')}
                  style={{
                    width: `${pct}%`,
                    background:
                      'linear-gradient(90deg, var(--anim-primary) 0%, var(--anim-secondary) 100%)',
                  }}
                />
              </div>
              {job.eta && (
                <span
                  className={cm.cn('font-mono text-[10px] text-right uppercase tracking-widest')}
                  style={{ color: 'var(--anim-text-muted)' }}
                >
                  {t('renderQueueCard.eta', { eta: job.eta }, { defaultValue: 'Est. {{eta}}' })}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default RenderQueueCard
