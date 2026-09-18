import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TemplateEntry {
  id: string
  title: string
  description: string
  icon: string
  estimatedReadMin: number
}

interface TemplateCategory {
  id: string
  name: string
  blurb: string
  templates: TemplateEntry[]
}

// TODO: replace with /api/templates once backend lands
const CATEGORIES: TemplateCategory[] = [
  {
    id: 'engineering',
    name: 'Engineering',
    blurb: 'For shipping software with a paper trail.',
    templates: [
      {
        id: 'rfc',
        title: 'RFC',
        description:
          'Context, decision, consequences. The standard 4-section template every change goes through.',
        icon: 'policy',
        estimatedReadMin: 8,
      },
      {
        id: 'postmortem',
        title: 'Post-mortem',
        description:
          'Blameless write-up, timeline, contributing factors, action items with owners.',
        icon: 'troubleshoot',
        estimatedReadMin: 10,
      },
      {
        id: 'oncall-runbook',
        title: 'Oncall runbook',
        description: 'Severity table, escalation path, common alerts → playbooks.',
        icon: 'support_agent',
        estimatedReadMin: 6,
      },
    ],
  },
  {
    id: 'meetings',
    name: 'Meetings',
    blurb: 'Notes that survive the meeting.',
    templates: [
      {
        id: 'standup',
        title: 'Standup notes',
        description:
          'What we shipped, what is blocked, what is next. Three columns, no decorations.',
        icon: 'event_note',
        estimatedReadMin: 3,
      },
      {
        id: 'design-review',
        title: 'Design review',
        description:
          'Brief, hypotheses, prototypes, open questions. Round-robin feedback table at the bottom.',
        icon: 'palette',
        estimatedReadMin: 7,
      },
      {
        id: '1on1',
        title: '1:1 agenda',
        description:
          'Two-week-rolling shared doc — manager + report each add four bullets ahead of time.',
        icon: 'forum',
        estimatedReadMin: 4,
      },
    ],
  },
  {
    id: 'operations',
    name: 'Operations',
    blurb: 'For when the team is the product.',
    templates: [
      {
        id: 'decision-log',
        title: 'Decision log',
        description: 'Date, deciders, options, rationale, follow-up. Append-only, never edit.',
        icon: 'fact_check',
        estimatedReadMin: 5,
      },
      {
        id: 'launch-checklist',
        title: 'Launch checklist',
        description:
          'Pre-flight, day-of, post-mortem-prompt. The recipe for shipping nothing on fire.',
        icon: 'rocket_launch',
        estimatedReadMin: 6,
      },
      {
        id: 'okr',
        title: 'OKR draft',
        description: 'Objective, three key results, weekly check-in cadence, owner per KR.',
        icon: 'flag',
        estimatedReadMin: 5,
      },
    ],
  },
]

export function Templates() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.stack(10)}>
      <header className={cm.stack(2)}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('templates.eyebrow', {}, { defaultValue: 'Stencils for the cairn' })}
        </span>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('nav.templates', {}, { defaultValue: 'Templates' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-2xl')}>
          {t(
            'templates.subtitle',
            {},
            {
              defaultValue:
                'Start a page from a stencil, not a blank canvas. Each template hard-codes the shape so you can focus on the substance.',
            },
          )}
        </p>
      </header>

      {CATEGORIES.map((cat) => (
        <section key={cat.id} className={cm.stack(4)}>
          <div className={cm.flex({ align: 'baseline', gap: 'md' })}>
            <h2
              className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {cat.name}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant italic')}>
              {cat.blurb}
            </p>
          </div>
          <div className={cm.cn('grid gap-4 md:grid-cols-3')}>
            {cat.templates.map((tpl) => (
              <Link
                key={tpl.id}
                to={`/page/new/edit?template=${tpl.id}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.stack(3),
                  'rounded-xl bg-surface-container-lowest border border-outline-variant/40 hover:-translate-y-0.5 hover:shadow-sm hover:border-primary/40 transition-all group',
                )}
              >
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-10 w-10 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors',
                    )}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined text-[22px]')}>
                      {tpl.icon}
                    </span>
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'templates.readingTime',
                      { min: tpl.estimatedReadMin },
                      { defaultValue: '~{{min}} min' },
                    )}
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    'font-extrabold tracking-tight text-on-surface group-hover:text-primary transition-colors',
                  )}
                >
                  {tpl.title}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {tpl.description}
                </p>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'text-primary',
                  )}
                >
                  {t('common.usename', {}, { defaultValue: 'Use template' })}
                  <span
                    className={cm.cn('material-symbols-outlined text-[14px]')}
                    aria-hidden="true"
                  >
                    arrow_forward
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
