import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LanguagePairBadge } from './LanguagePairBadge.js'
import { type ProjectStatus, ProjectStatusPill } from './ProjectStatusPill.js'

export interface TranslationProject {
  id: string
  name: string
  source_lang: string
  target_lang: string
  status: ProjectStatus
  progress: number
  word_count: number
  last_activity: string
  team: ReadonlyArray<{ id: string; initials: string; color?: string }>
  due_in_days?: number
}

interface TranslationProjectCardProps {
  project: TranslationProject
}

const TEAM_TONES = ['bg-primary', 'bg-tertiary', 'bg-secondary', 'bg-success', 'bg-warning']

/**
 * Editorial project card — language-pair chip + status pill in the
 * header, progress bar, word count, team avatar stack, optional due
 * chip in the footer. Hover-lift + group transitions.
 *
 * Translated from personal-finance's account-card pattern, with the
 * indigo language-pair chip + tertiary status accents per Rendition's
 * DESIGN.md.
 */
export function TranslationProjectCard({ project }: TranslationProjectCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isComplete = project.status === 'approved' && project.progress >= 100

  return (
    <Link
      to={`/projects/${project.id}`}
      className={cm.cn(
        cm.sp('p', 5),
        cm.flex({ direction: 'col' }),
        'h-full bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md transition-shadow group cursor-pointer border border-surface-container-lowest/50 hover:border-surface-container-highest',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'min-w-0')}>
          <h3
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('bold'),
              'text-on-background group-hover:text-primary transition-colors line-clamp-1',
            )}
          >
            {project.name}
          </h3>
          <LanguagePairBadge source={project.source_lang} target={project.target_lang} />
        </div>
        <ProjectStatusPill status={project.status} />
      </div>

      <div className={cm.cn(cm.sp('mb', 4), 'mt-auto')}>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'end' }), cm.sp('mb', 2))}>
          <span
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-on-surface-variant')}
          >
            {t('nav.progress', {}, { defaultValue: 'Progress' })}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'font-mono',
              isComplete ? 'text-success' : 'text-primary',
            )}
          >
            {project.progress}%
          </span>
        </div>
        <div
          className={cm.cn(
            cm.w('full'),
            'h-1.5 bg-surface-container-high rounded-full overflow-hidden',
          )}
        >
          <div
            className={cm.cn('h-full rounded-full', isComplete ? 'bg-success' : 'bg-primary')}
            style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }}
          />
        </div>
      </div>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('pt', 4),
          'border-t border-surface-container-high/50',
        )}
      >
        <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
          <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
            {t(
              'common.countWords',
              { count: project.word_count.toLocaleString() },
              { defaultValue: '{{count}} words' },
            )}
          </span>
          <span className={cm.cn(cm.textSize('xs'), 'text-outline')}>
            {t(
              'translationProjectCard.lastActivity',
              { when: project.last_activity },
              { defaultValue: 'Last activity {{when}}' },
            )}
          </span>
        </div>
        {project.team.length > 0 && (
          <div
            className={cm.cn('flex -space-x-2')}
            aria-label={t('translationProjectCard.teamAria', {}, { defaultValue: 'Project team' })}
          >
            {project.team.slice(0, 3).map((member, idx) => (
              <span
                key={member.id}
                className={cm.cn(
                  cm.w(6),
                  cm.h(6),
                  cm.roundedFull,
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'border-2 border-surface-container-lowest text-white',
                  member.color ?? TEAM_TONES[idx % TEAM_TONES.length],
                )}
              >
                {member.initials}
              </span>
            ))}
            {project.team.length > 3 && (
              <span
                className={cm.cn(
                  cm.w(6),
                  cm.h(6),
                  cm.roundedFull,
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'border-2 border-surface-container-lowest bg-surface-container-high text-on-surface-variant font-mono',
                )}
              >
                +{project.team.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
      {project.due_in_days !== undefined && project.due_in_days <= 7 && !isComplete && (
        <div className={cm.sp('mt', 3)}>
          <span
            className={cm.cn(
              cm.fontWeight('medium'),
              'inline-block px-2 py-1 rounded text-[10px] bg-warning-light text-warning',
            )}
          >
            {t(
              'translationProjectCard.dueIn',
              { days: project.due_in_days },
              { defaultValue: 'Due in {{days}} days' },
            )}
          </span>
        </div>
      )}
    </Link>
  )
}
