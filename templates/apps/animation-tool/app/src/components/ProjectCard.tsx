/**
 * Project card — gradient/pattern thumbnail block, duration chip, last-edited
 * stamp, status pill, animated hover reveal of a play affordance.
 *
 * Pattern source: 3d-model-viewer/ModelCard.tsx (thumbnail + meta + hover ring)
 * adapted to Vivace's dark violet/magenta palette.
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
}

interface ProjectCardProps {
  project: ProjectSummary
}

export function ProjectCard({ project }: ProjectCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const swatch =
    project.swatch ?? 'linear-gradient(135deg, var(--anim-primary) 0%, var(--anim-secondary) 100%)'

  return (
    <Link
      to={`/projects/${project.id}`}
      data-mol-id={`project-${project.id}`}
      className={cm.cn(
        'group block rounded-xl overflow-hidden transition-all hover:-translate-y-0.5',
      )}
      style={{
        backgroundColor: 'var(--anim-surface)',
        border: '1px solid var(--anim-border)',
      }}
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
          {project.icon ?? 'animation'}
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
        <div
          className={cm.cn(
            'absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent',
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
            {t('projectCard.preview', {}, { defaultValue: 'Preview loop' })}
          </span>
        </div>
      </div>

      <div className={cm.cn(cm.sp('p', 4), cm.stack(2))}>
        <div className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 2 }))}>
          <h3
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'truncate transition-colors',
            )}
            style={{ color: 'var(--anim-text)' }}
          >
            {project.name}
          </h3>
          <StatusPill status={project.status} />
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <span
            className={cm.cn(cm.textSize('xs'), 'truncate')}
            style={{ color: 'var(--anim-text-secondary)' }}
          >
            {project.client ??
              t('projectCard.untitledClient', {}, { defaultValue: 'Personal project' })}
          </span>
          <span
            className={cm.cn('font-mono text-[10px] uppercase tracking-widest shrink-0')}
            style={{ color: 'var(--anim-text-muted)' }}
          >
            {project.lastEdited}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default ProjectCard
