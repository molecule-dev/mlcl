import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CollaboratorStack } from './CollaboratorStack.js'

/**
 * Project grid tile — rendered on /dashboard. Stylised vector-canvas
 * thumbnail (frame + ellipse + pen path over a dot-grid) above title +
 * folder + last-updated meta with a collaborator stack pill.
 *
 * Translated from whiteboard's BoardCard.tsx — kept the rounded-xl shadow-sm
 * card chrome + hover-lift treatment, swapped sticky-note shapes for vector
 * tools matching Atelier's design-tool brand.
 */
export interface ProjectCardProps {
  project: {
    id: string
    title: string
    folder?: string
    /** ISO8601 or human-readable label. */
    updatedLabel: string
    /** Soft-tinted thumbnail bg colour from the cursor palette. */
    thumbnailColor: string
    /** Visibility — drives the badge in the top-right of the thumb. */
    visibility?: 'private' | 'shared' | 'public'
    /** Tool / category icon (Material Symbols). */
    iconName?: string
    collaborators: Array<{
      id: string
      name: string
      avatarColor: string
      online?: boolean
    }>
  }
}

const VISIBILITY_ICONS: Record<NonNullable<ProjectCardProps['project']['visibility']>, string> = {
  private: 'lock',
  shared: 'group',
  public: 'public',
}

export function ProjectCard({ project }: ProjectCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visibilityIcon = VISIBILITY_ICONS[project.visibility ?? 'private']

  return (
    <Link
      to={`/editor/${project.id}`}
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'group bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all duration-200',
      )}
    >
      <div
        className={cm.cn(cm.h(40), 'relative overflow-hidden')}
        style={{ backgroundColor: project.thumbnailColor }}
      >
        <svg
          viewBox="0 0 320 160"
          preserveAspectRatio="none"
          className={cm.cn(cm.w('full'), cm.h('full'))}
        >
          <defs>
            <pattern
              id={`pc-dots-${project.id}`}
              x="0"
              y="0"
              width="16"
              height="16"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1" fill="rgba(30,21,53,0.18)" />
            </pattern>
          </defs>
          <rect width="320" height="160" fill={`url(#pc-dots-${project.id})`} />
          {/* frame */}
          <rect
            x="32"
            y="34"
            width="92"
            height="62"
            rx="6"
            fill="#ffffff"
            stroke="#7c3aed"
            strokeOpacity="0.5"
            strokeWidth="1.5"
          />
          <rect x="38" y="28" width="80" height="6" rx="2" fill="#7c3aed" fillOpacity="0.5" />
          {/* magenta rect */}
          <rect
            x="148"
            y="60"
            width="74"
            height="48"
            rx="6"
            fill="#fbcfe8"
            stroke="#ec4899"
            strokeOpacity="0.5"
            strokeWidth="1.5"
          />
          {/* cyan ellipse */}
          <circle
            cx="252"
            cy="70"
            r="22"
            fill="#cffafe"
            stroke="#06b6d4"
            strokeOpacity="0.6"
            strokeWidth="1.5"
          />
          {/* pen path */}
          <path
            d="M124 65 Q160 90 222 70"
            stroke="#7c3aed"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            strokeDasharray="3 4"
          />
          <circle cx="222" cy="70" r="3.5" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
        </svg>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'absolute top-3 right-3 bg-surface/85 backdrop-blur-md text-on-surface uppercase tracking-widest text-[10px]',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[14px]')}>{visibilityIcon}</span>
          {t(
            `projectCard.visibility.${project.visibility ?? 'private'}`,
            {},
            { defaultValue: project.visibility ?? 'private' },
          )}
        </span>
        {project.iconName && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              'absolute top-3 left-3 bg-surface/85 backdrop-blur-md text-primary',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[16px]')}>
              {project.iconName}
            </span>
          </span>
        )}
      </div>
      <div className={cm.cn(cm.sp('p', 5), cm.stack(3))}>
        <div className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(1))}>
          {project.folder && (
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {project.folder}
            </span>
          )}
          <h3
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'text-on-surface tracking-tight truncate',
            )}
          >
            {project.title}
          </h3>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <CollaboratorStack collaborators={project.collaborators} max={4} />
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')}>schedule</span>
            {project.updatedLabel}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default ProjectCard
