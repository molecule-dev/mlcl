/**
 * Project thumb card — gradient/pattern thumbnail block, duration chip,
 * last-edited stamp, status pill, animated hover reveal of a play
 * affordance. Used by Dashboard recent-projects grid and ProjectDetail.
 *
 * Pattern source: animation-tool/ProjectCard.tsx (3d-model-viewer
 * ModelCard lineage) adapted to the Rushes violet/pink palette and clip-
 * type aware swatch defaults.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type ProjectStatus, StatusPill } from './StatusPill.js'

export interface ProjectSummary {
  id: string
  name: string
  client?: string
  duration: string
  lastEdited: string
  status: ProjectStatus
  /** Visual swatch — either CSS gradient or a hex color. */
  swatch?: string
  /** Material symbol displayed if no thumbnail/swatch. */
  icon?: string
  /** Aspect ratio label (e.g. "16:9", "9:16", "1:1"). */
  aspect?: string
}

interface ProjectThumbCardProps {
  project: ProjectSummary
  /** Override the destination link. Useful on the public landing page where
   * the sample cards should drive new visitors to /signup instead of
   * deep-linking to a project the visitor doesn't own (which would bounce
   * them through AuthGuard to /login). */
  to?: string
}

export function ProjectThumbCard({ project, to }: ProjectThumbCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const swatch =
    project.swatch ?? 'linear-gradient(135deg, var(--video-cta-from) 0%, var(--video-cta-to) 100%)'

  return (
    <Link
      to={to ?? `/projects/${project.id}`}
      data-mol-id={`project-${project.id}`}
      className={cm.cn(
        'group block rounded-xl bg-[var(--video-panel-bg)] border border-[var(--video-border-subtle)] overflow-hidden hover:border-[var(--video-cta-from)]/50 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_-10px_color-mix(in_srgb,var(--video-cta-from)_55%,transparent)]',
      )}
    >
      <div className={cm.cn('relative h-[140px] overflow-hidden')} style={{ background: swatch }}>
        <div
          className={cm.cn(
            'absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.18)_1px,transparent_0)] [background-size:20px_20px] opacity-50',
          )}
        />
        <span
          className={cm.cn(
            'absolute inset-0 flex items-center justify-center text-white/70 text-5xl group-hover:scale-110 transition-transform duration-500',
            'material-symbols-outlined',
          )}
        >
          {project.icon ?? 'movie'}
        </span>
        <span
          className={cm.cn(
            cm.sp('px', 2),
            cm.sp('py', 1),
            'absolute top-2 right-2 font-mono text-[10px] tracking-widest text-white bg-foreground/60 backdrop-blur rounded',
          )}
        >
          {project.duration}
        </span>
        {project.aspect && (
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 1),
              'absolute top-2 left-2 font-mono text-[10px] tracking-widest text-white/90 bg-foreground/40 backdrop-blur rounded uppercase',
            )}
          >
            {project.aspect}
          </span>
        )}
        <div
          className={cm.cn(
            'absolute inset-0 bg-gradient-to-t from-[var(--video-panel-bg)] via-transparent to-transparent',
          )}
        />
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 1 }),
            'absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-white/90 text-[16px]')}>
            play_arrow
          </span>
          <span className={cm.cn('font-mono text-[10px] uppercase tracking-widest text-white/90')}>
            {t('projectThumbCard.preview', {}, { defaultValue: 'Open in editor' })}
          </span>
        </div>
      </div>

      <div className={cm.cn(cm.sp('p', 4), cm.stack(2))}>
        <div className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 2 }))}>
          <h3
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'text-[var(--video-text-primary)] truncate group-hover:text-[var(--video-link)] transition-colors',
            )}
          >
            {project.name}
          </h3>
          <StatusPill status={project.status} />
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <span className={cm.cn(cm.textSize('xs'), 'text-[var(--video-text-muted-alt)] truncate')}>
            {project.client ??
              t('projectThumbCard.untitledClient', {}, { defaultValue: 'Personal project' })}
          </span>
          <span
            className={cm.cn(
              'font-mono text-[10px] text-[var(--video-text-dim)] uppercase tracking-widest shrink-0',
            )}
          >
            {project.lastEdited}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default ProjectThumbCard
