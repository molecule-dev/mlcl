/**
 * Render queue card — list of currently-rendering exports with mono
 * timecode + violet→pink gradient progress bar.
 *
 * Pattern source: animation-tool/RenderQueueCard.tsx; structurally identical
 * but tuned to Rushes' palette and "render daemon" voice.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface RenderJob {
  id: string
  filename: string
  /** 0–100 inclusive; null/undefined → queued. */
  progress: number | null
  /** Estimated remaining time. */
  eta?: string
  /** Optional preset label ("4K · H.264", "1080p · ProRes"). */
  preset?: string
}

interface RenderJobCardProps {
  jobs: RenderJob[]
  loading?: boolean
  error?: string | null
  /** Hide the trailing "View all" link (used inside the export queue page). */
  hideViewAll?: boolean
}

export function RenderJobCard({ jobs, loading, error, hideViewAll = false }: RenderJobCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      className={cm.cn(
        cm.sp('p', 5),
        cm.stack(4),
        'rounded-xl bg-[var(--video-panel-bg)] border border-[var(--video-border-subtle)]',
      )}
    >
      <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <h3
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-[var(--video-text-primary)]',
          )}
        >
          {t('renderJobCard.title', {}, { defaultValue: 'Render queue' })}
        </h3>
        <span
          className={cm.cn(
            'font-mono text-[10px] uppercase tracking-widest text-[var(--video-link-hover)]',
          )}
        >
          {t(
            'renderJobCard.jobCount',
            { count: jobs.length },
            { defaultValue: '{{count}} active' },
          )}
        </span>
      </header>

      {loading && (
        <p
          className={cm.cn(cm.textSize('xs'), cm.textMuted, 'font-mono uppercase tracking-widest')}
        >
          {t('renderJobCard.loading', {}, { defaultValue: 'Polling render daemon…' })}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className={cm.cn(
            cm.textSize('xs'),
            'text-[var(--video-error-text)] font-mono uppercase tracking-widest',
          )}
        >
          {error}
        </p>
      )}

      {!loading && !error && jobs.length === 0 && (
        <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
          {t(
            'renderJobCard.empty',
            {},
            { defaultValue: 'Queue is clear. Export a project to start a new render.' },
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
                <span className={cm.cn('text-[var(--video-text-primary)] truncate pr-2 font-mono')}>
                  {job.filename}
                </span>
                <span className={cm.cn('font-mono text-[var(--video-text-muted-alt)]')}>
                  {queued ? t('status.queued', {}, { defaultValue: 'Queued' }) : `${pct}%`}
                </span>
              </div>
              <div
                className={cm.cn(
                  'h-1.5 w-full bg-[var(--video-input-bg)] rounded-full overflow-hidden',
                )}
              >
                <div
                  className={cm.cn(
                    'h-full rounded-full bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] transition-[width] duration-500',
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                {job.preset && (
                  <span
                    className={cm.cn(
                      'font-mono text-[10px] text-[var(--video-text-dim)] uppercase tracking-widest',
                    )}
                  >
                    {job.preset}
                  </span>
                )}
                {job.eta && (
                  <span
                    className={cm.cn(
                      'font-mono text-[10px] text-[var(--video-text-dim)] uppercase tracking-widest ml-auto',
                    )}
                  >
                    {t('renderJobCard.eta', { eta: job.eta }, { defaultValue: 'Est. {{eta}}' })}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {!hideViewAll && jobs.length > 0 && (
        <Link
          to="/export"
          className={cm.cn(
            'inline-block py-2 font-mono text-[10px] uppercase tracking-widest text-[var(--video-link)] hover:text-[var(--video-link-hover)] transition-colors text-center',
          )}
        >
          {t('renderJobCard.viewAll', {}, { defaultValue: 'Open export queue →' })}
        </Link>
      )}
    </section>
  )
}

export default RenderJobCard
