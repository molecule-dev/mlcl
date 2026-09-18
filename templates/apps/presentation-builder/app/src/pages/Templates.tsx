import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PresentationBuilderLayout } from '../components/PresentationBuilderLayout.js'
import { TemplateCard } from '../components/TemplateCard.js'

const TEMPLATES: Array<Parameters<typeof TemplateCard>[0]['template'] & { tag: string }> = [
  {
    id: 'pitch-aurora',
    title: 'Aurora Pitch',
    description: 'Cinematic Series-A pitch deck — problem framing, market sizing, demo, ask.',
    category: 'Pitch deck',
    accentColor: '#7c3aed',
    iconName: 'rocket_launch',
    slideCount: 14,
    usageCount: 8420,
    tag: 'pitch',
  },
  {
    id: 'investor-pulse',
    title: 'Investor Pulse',
    description: 'Quarterly investor update — KPIs, runway, milestones, asks. Tabular and crisp.',
    category: 'Investor update',
    accentColor: '#ec4899',
    iconName: 'analytics',
    slideCount: 22,
    usageCount: 5120,
    tag: 'investor',
  },
  {
    id: 'webinar-keynote',
    title: 'Webinar Keynote',
    description:
      'High-contrast keynote layout — single statement per slide, presenter timer pre-wired.',
    category: 'Webinar',
    accentColor: '#06b6d4',
    iconName: 'live_tv',
    slideCount: 18,
    usageCount: 3680,
    tag: 'webinar',
  },
  {
    id: 'sales-kickoff',
    title: 'Sales Kickoff',
    description:
      'Annual sales kickoff — territory plans, targets, comp, motion. Punchy charts throughout.',
    category: 'Sales kickoff',
    accentColor: '#f59e0b',
    iconName: 'trending_up',
    slideCount: 28,
    usageCount: 2940,
    tag: 'sales',
  },
  {
    id: 'design-review',
    title: 'Design Review',
    description: 'Internal design crit — context, options, tradeoffs, next steps. Image-heavy.',
    category: 'Design review',
    accentColor: '#10b981',
    iconName: 'palette',
    slideCount: 12,
    usageCount: 2210,
    tag: 'design',
  },
  {
    id: 'all-hands',
    title: 'Company All-Hands',
    description: 'Monthly all-hands — wins, metrics, customer stories, OKRs, Q&A. Calm rhythm.',
    category: 'All-hands',
    accentColor: '#a78bfa',
    iconName: 'campaign',
    slideCount: 16,
    usageCount: 1880,
    tag: 'internal',
  },
  {
    id: 'product-launch',
    title: 'Product Launch',
    description: 'Public launch deck — narrative arc, demo, pricing, FAQ. Built to share publicly.',
    category: 'Product launch',
    accentColor: '#dc2626',
    iconName: 'celebration',
    slideCount: 20,
    usageCount: 1560,
    tag: 'launch',
  },
  {
    id: 'workshop',
    title: 'Hands-On Workshop',
    description:
      'Workshop curriculum — exercises, prompts, breakouts, recap. Designed for facilitator pace.',
    category: 'Workshop',
    accentColor: '#7c3aed',
    iconName: 'school',
    slideCount: 24,
    usageCount: 980,
    tag: 'workshop',
  },
]

const FILTERS = [
  'all',
  'pitch',
  'investor',
  'webinar',
  'sales',
  'design',
  'internal',
  'launch',
  'workshop',
] as const

export function Templates() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all')

  const visible = filter === 'all' ? TEMPLATES : TEMPLATES.filter((tpl) => tpl.tag === filter)

  return (
    <PresentationBuilderLayout
      eyebrow={t('nav.library', {}, { defaultValue: 'Library' })!}
      title={t('nav.templates', {}, { defaultValue: 'Templates' })!}
    >
      <div className={cm.cn(cm.stack(8))}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            cm.sp('p', 10),
            cm.stack(4),
            'bg-gradient-to-br from-primary via-primary-hover to-secondary rounded-[2rem] text-white relative overflow-hidden',
          )}
        >
          <div
            className={cm.cn(
              cm.w(80),
              cm.h(80),
              cm.roundedFull,
              'absolute -right-20 -bottom-24 bg-surface/10 blur-3xl',
            )}
          ></div>
          <div className={cm.cn('relative z-10', cm.stack(2))}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-white/70',
              )}
            >
              {t('templates.hero.eyebrow', {}, { defaultValue: 'Curated stages' })}
            </span>
            <h2
              className={cm.cn(
                'text-3xl md:text-4xl font-extrabold tracking-tighter leading-[0.95]',
              )}
            >
              {t(
                'templates.hero.heading',
                {},
                { defaultValue: 'Stages built for the moment you need to land it.' },
              )}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-white/85 max-w-xl',
              )}
            >
              {t(
                'templates.hero.body',
                {},
                {
                  defaultValue:
                    'Pre-themed slide layouts with chart blocks, demo frames, presenter notes, and timer presets — every template ships ready to record.',
                },
              )}
            </p>
          </div>
        </div>

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest transition-colors',
                filter === f
                  ? 'bg-primary text-on-primary shadow-md shadow-primary/30'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
              )}
            >
              {t(`templates.filter.${f}`, {}, { defaultValue: f })}
            </button>
          ))}
        </div>

        <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))} data-testid="template-grid">
          {visible.map((tpl) => (
            <div key={tpl.id} className={cm.cn('col-span-12 sm:col-span-6 lg:col-span-4')}>
              <TemplateCard template={tpl} />
            </div>
          ))}
        </div>

        {visible.length === 0 && (
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center' }),
              cm.sp('p', 12),
              cm.stack(2),
              'bg-surface-container-low rounded-2xl text-center',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[32px] text-on-surface-variant')}
            >
              auto_awesome_mosaic
            </span>
            <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
              {t(
                'templates.empty.title',
                {},
                { defaultValue: 'No templates in this category yet' },
              )}
            </span>
            <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-md')}>
              {t(
                'templates.empty.body',
                {},
                { defaultValue: 'Try a different filter — we ship new templates every month.' },
              )}
            </span>
          </div>
        )}
      </div>
    </PresentationBuilderLayout>
  )
}

export default Templates
