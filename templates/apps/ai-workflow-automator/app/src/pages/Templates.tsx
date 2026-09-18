/**
 * Templates — gallery of pre-built workflow blueprints, grouped by use-case.
 * Mini node-graph thumbnails preview the blueprint shape.
 *
 * Data source: GET /api/templates returns the blueprint catalog.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WorkflowAppShell } from '../components/WorkflowAppShell.js'

interface ThumbNode {
  kind: 'trigger' | 'condition' | 'action'
  icon: string
}

interface TemplateCard {
  id: string
  name: string
  category: string
  description: string
  installs: number
  rating: number
  badge?: 'new' | 'popular' | string
  thumb: { nodes: ThumbNode[] }
}

const ALL = 'All'

export function Templates() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [cards, setCards] = useState<TemplateCard[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<string>(ALL)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const handler = () => setCategory(ALL)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  useEffect(() => {
    let cancelled = false
    http
      .get<{ data?: TemplateCard[] }>('/api/templates')
      .then((res) => {
        if (cancelled) return
        const arr = (res.data?.data ?? []) as TemplateCard[]
        setCards(arr)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('templates.error', {}, { defaultValue: 'Could not load templates.' }),
        )
        setCards([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const c of cards ?? []) set.add(c.category)
    return [ALL, ...Array.from(set).sort()]
  }, [cards])

  const visible = useMemo(() => {
    return (cards ?? []).filter((tpl) => {
      const catOk = category === ALL || tpl.category === category
      const searchOk = !search || tpl.name.toLowerCase().includes(search.toLowerCase())
      return catOk && searchOk
    })
  }, [cards, category, search])

  return (
    <WorkflowAppShell
      pageId="templates"
      eyebrow={t('nav.library', {}, { defaultValue: 'Library' })}
      title={t('templates.title', {}, { defaultValue: 'Workflow templates' })}
      description={t(
        'templates.description',
        {},
        {
          defaultValue:
            'Pre-built blueprints for the most common automations. Fork, customize, ship.',
        },
      )}
    >
      {error && (
        <div
          role="alert"
          data-mol-id="templates-error"
          className={cm.cn(cm.sp('p', 3), cm.sp('mb', 4), cm.textSize('sm'), 'rounded-xl')}
          style={{
            background: 'var(--color-status-error-bg)',
            color: 'var(--color-status-error-fg)',
          }}
        >
          {error}
        </div>
      )}

      {/* Search + category pills */}
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), cm.sp('mb', 6))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            'rounded-full flex-shrink-0',
          )}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            minWidth: 280,
          }}
        >
          <span
            className={'material-symbols-outlined text-base'}
            style={{ color: 'var(--color-foreground-secondary)' }}
          >
            search
          </span>
          <input
            type="search"
            data-mol-id="templates-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              'templates.searchPlaceholder',
              {},
              { defaultValue: 'Search templates…' },
            )}
            className={cm.cn(
              cm.textSize('sm'),
              'bg-transparent border-0 focus:outline-none flex-1',
            )}
            style={{ color: 'var(--color-foreground)' }}
          />
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }))}>
          {categories.map((c) => {
            const active = category === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCategory(c)
                  if (typeof window !== 'undefined') {
                    window.history.replaceState(null, '', `${window.location.pathname}#cat=${c}`)
                  }
                }}
                data-mol-id={`templates-cat-${c}`}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'rounded-full uppercase tracking-widest transition-colors',
                )}
                style={
                  active
                    ? {
                        background: 'var(--color-accent-violet-strong)',
                        color: 'white',
                        border: '1px solid var(--color-accent-violet-strong)',
                      }
                    : {
                        background: 'var(--color-surface)',
                        color: 'var(--color-foreground-secondary)',
                        border: '1px solid var(--color-border)',
                      }
                }
              >
                {c}
              </button>
            )
          })}
        </div>
      </div>

      {/* Template grid */}
      {cards === null ? (
        <div
          className={cm.cn(cm.sp('p', 12), cm.textCenter, cm.textMuted)}
          data-mol-id="templates-loading"
        >
          {t('nav.loadingTemplates', {}, { defaultValue: 'Loading templates…' })}
        </div>
      ) : (
        <>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}
          >
            {visible.map((tpl) => (
              <TemplateGridCard key={tpl.id} template={tpl} />
            ))}
          </div>
          {visible.length === 0 && (
            <div
              className={cm.cn(cm.sp('p', 12), 'text-center', cm.textMuted)}
              data-mol-id="templates-empty"
            >
              {(cards ?? []).length === 0
                ? t(
                    'templates.empty.first',
                    {},
                    { defaultValue: 'No templates available right now.' },
                  )
                : t(
                    'templates.empty.filter',
                    {},
                    { defaultValue: 'No templates match your search.' },
                  )}
            </div>
          )}
        </>
      )}
    </WorkflowAppShell>
  )
}

function TemplateGridCard({ template }: { template: TemplateCard }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Link
      to={`/templates/${template.id}`}
      className={cm.cn(
        cm.sp('p', 5),
        'rounded-2xl block transition-all hover:-translate-y-0.5 hover:shadow-lg group',
      )}
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {/* Thumb row */}
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
          cm.sp('p', 4),
          cm.sp('mb', 4),
          'rounded-xl',
        )}
        style={{
          backgroundImage: 'radial-gradient(var(--color-canvas-dot) 1px, transparent 1px)',
          backgroundSize: '12px 12px',
          background: 'var(--color-background-secondary)',
          minHeight: 100,
        }}
      >
        {(template.thumb?.nodes ?? []).map((n, i) => (
          <div key={i} className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'rounded-lg shadow-sm',
              )}
              style={{
                width: 32,
                height: 32,
                background:
                  n.kind === 'trigger'
                    ? 'var(--color-node-trigger)'
                    : n.kind === 'condition'
                      ? 'var(--color-node-condition)'
                      : 'var(--color-node-action)',
              }}
            >
              <span
                className={'material-symbols-outlined text-base'}
                style={{ color: 'white', fontVariationSettings: "'FILL' 1" }}
              >
                {n.icon}
              </span>
            </div>
            {i < (template.thumb?.nodes?.length ?? 0) - 1 && (
              <span style={{ color: 'var(--color-accent-violet-light)', fontSize: 16 }}>›</span>
            )}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 2))}>
        <span
          className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'uppercase tracking-widest')}
          style={{ color: 'var(--color-node-condition)' }}
        >
          {template.category}
        </span>
        {template.badge && (
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest rounded-full',
            )}
            style={{
              background:
                template.badge === 'new'
                  ? 'var(--color-status-success-bg)'
                  : 'var(--color-primary-light)',
              color:
                template.badge === 'new'
                  ? 'var(--color-status-success-fg)'
                  : 'var(--color-status-warning-fg)',
              padding: '2px 8px',
            }}
          >
            {template.badge === 'new'
              ? t('status.new', {}, { defaultValue: 'New' })
              : t('templates.popular', {}, { defaultValue: 'Popular' })}
          </span>
        )}
      </div>
      <h3
        className={cm.cn(
          cm.textSize('base'),
          cm.fontWeight('bold'),
          'tracking-tight group-hover:text-primary transition-colors',
          cm.sp('mb', 2),
        )}
      >
        {template.name}
      </h3>
      <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mb', 4), 'line-clamp-2')}>
        {template.description}
      </p>

      {/* Footer */}
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('xs'),
            cm.textMuted,
          )}
        >
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <span
              className={'material-symbols-outlined text-sm'}
              style={{ color: 'var(--color-primary)', fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            <span className={cm.fontWeight('semibold')}>{template.rating}</span>
          </span>
          <span>·</span>
          <span>
            {template.installs.toLocaleString()}{' '}
            {t('templates.installs', {}, { defaultValue: 'installs' })}
          </span>
        </div>
        <span
          className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'uppercase tracking-widest')}
          style={{ color: 'var(--color-accent-violet)' }}
        >
          {t('templates.use', {}, { defaultValue: 'Use →' })}
        </span>
      </div>
    </Link>
  )
}

export default Templates
