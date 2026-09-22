import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Gradient hero card — surfaces the most-recent design project with a frosted
 * collaborator pill, decorative blurred orbs, and a stylised vector-canvas
 * SVG (frame, ellipse, pen-tool path) over a dot grid. Echoes the Atelier
 * canvas surface.
 *
 * Translated from whiteboard's BoardHeroCard.tsx (gradient + 6xl-extrabold
 * headline + frosted pill + corner orbs) and personal-finance's
 * NetWorthCard.tsx chrome — retuned to Atelier's violet→magenta gradient and
 * a vector-tool decoration instead of sticky notes.
 */
export interface ProjectHeroCardProps {
  project: {
    id: string
    title: string
    /** Number of teammates currently editing this project. */
    activeCollaborators: number
    /** Human-readable label (e.g. "Updated 4 min ago"). */
    updatedLabel: string
    /** Brand-domain eyebrow (e.g. "BRAND · v3"). */
    projectCode?: string
    /** Tool currently selected by the user (Pen, Frame, Ellipse, …). */
    activeTool?: string
  }
}

export function ProjectHeroCard({ project }: ProjectHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <Link
      to={`/editor/${project.id}`}
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'col-span-12 min-h-[320px] lg:col-span-8 bg-gradient-to-br from-primary via-primary-hover to-secondary rounded-[2rem] text-white relative overflow-hidden hover:scale-[1.005] transition-transform',
      )}
    >
      <div className={cm.cn('relative z-10', cm.stack(3))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-white/70',
            )}
          >
            {project.projectCode ??
              t('projectHeroCard.eyebrow', {}, { defaultValue: 'Active project' })}
          </span>
          <span className={cm.cn('h-px w-8 bg-surface/30')}></span>
          <span className={cm.cn(cm.fontWeight('semibold'), cm.textSize('xs'), 'text-white/70')}>
            {project.updatedLabel}
          </span>
        </div>
        <h2
          className={cm.cn('text-5xl md:text-6xl font-extrabold tracking-tighter leading-[0.95]')}
        >
          {project.title}
        </h2>
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 2), 'flex-wrap')}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface/20 backdrop-blur-md',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>group</span>
            {t(
              'projectHeroCard.activeCollaborators',
              { count: project.activeCollaborators },
              { defaultValue: '{{count}} editing now' },
            )}
          </span>
          {project.activeTool && (
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'bg-surface/15 backdrop-blur-md text-white/90',
              )}
            >
              <span
                className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                edit
              </span>
              {project.activeTool}
            </span>
          )}
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface/10 backdrop-blur-md text-white/80',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>brush</span>
            {t('projectHeroCard.openCanvas', {}, { defaultValue: 'Open canvas' })}
          </span>
        </div>
      </div>

      <div className={cm.cn('relative z-10', cm.sp('mt', 8), cm.h(28), cm.w('full'))}>
        <svg
          viewBox="0 0 400 110"
          preserveAspectRatio="none"
          className={cm.cn(cm.w('full'), cm.h('full'), 'opacity-50')}
        >
          <defs>
            <pattern
              id="hero-dot-grid"
              x="0"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1.2" fill="white" />
            </pattern>
          </defs>
          <rect width="400" height="110" fill="url(#hero-dot-grid)" />
          {/* frame tool */}
          <rect
            x="40"
            y="20"
            width="80"
            height="55"
            rx="4"
            fill="white"
            fillOpacity="0.18"
            stroke="white"
            strokeOpacity="0.7"
            strokeWidth="2"
          />
          <rect x="46" y="14" width="68" height="6" rx="2" fill="white" fillOpacity="0.5" />
          {/* magenta accent rect */}
          <rect x="160" y="40" width="60" height="34" rx="6" fill="#fef08a" fillOpacity="0.7" />
          {/* ellipse */}
          <circle
            cx="280"
            cy="55"
            r="24"
            fill="white"
            fillOpacity="0.18"
            stroke="white"
            strokeOpacity="0.7"
            strokeWidth="2"
          />
          {/* selection handles */}
          <rect x="36" y="16" width="6" height="6" fill="white" />
          <rect x="116" y="16" width="6" height="6" fill="white" />
          <rect x="36" y="71" width="6" height="6" fill="white" />
          <rect x="116" y="71" width="6" height="6" fill="white" />
          {/* pen-tool path */}
          <path
            d="M120 80 Q160 55 220 75 Q260 90 340 60"
            stroke="white"
            strokeOpacity="0.85"
            strokeWidth="2"
            fill="none"
            strokeDasharray="4 4"
          />
          {/* anchor point */}
          <circle cx="220" cy="75" r="3.5" fill="#06b6d4" stroke="white" strokeWidth="1.5" />
        </svg>
      </div>

      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-20 -bottom-24 bg-surface/10 blur-3xl',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.w(40),
          cm.h(40),
          cm.roundedFull,
          'absolute -left-10 top-12 bg-tertiary/30 blur-3xl',
        )}
      ></div>
    </Link>
  )
}

export default ProjectHeroCard
