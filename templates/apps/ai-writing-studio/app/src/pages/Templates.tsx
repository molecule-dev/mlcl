import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TemplateRow {
  id: string
  name: string
  description: string
  category: string
  body_template?: string
  placeholder_vars?: string[]
}

const CATEGORY_ICON: Record<string, string> = {
  newsletter: 'mail',
  essay: 'menu_book',
  marketing: 'rocket_launch',
  review: 'reviews',
  interview: 'record_voice_over',
  changelog: 'history',
  general: 'auto_stories',
}

function previewFromBody(body: string): string {
  if (!body) return ''
  return body
    .replace(/[#*_`>~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220)
}

function iconFor(category: string): string {
  const key = category.toLowerCase()
  return CATEGORY_ICON[key] ?? 'auto_stories'
}

export function Templates() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [templates, setTemplates] = useState<TemplateRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')

  useEffect(() => {
    let cancelled = false
    http
      .get<TemplateRow[]>('/templates')
      .then((res) => {
        if (cancelled) return
        const rows = Array.isArray(res.data) ? res.data : []
        setTemplates(rows)
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setTemplates([])
        setError(t('templates.loadError', {}, { defaultValue: 'Could not load templates.' }))
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const tpl of templates ?? []) set.add(String(tpl.category || 'general'))
    return ['all', ...Array.from(set).sort()]
  }, [templates])

  const filtered = (templates ?? []).filter(
    (tpl) => activeCategory === 'all' || String(tpl.category) === activeCategory,
  )

  return (
    <div className={cm.cn(cm.sp('p', 8), 'bg-background min-h-screen')}>
      <div className={cm.cn('max-w-7xl', cm.mxAuto, cm.stack(8))}>
        <div
          className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
        >
          <div>
            <h1
              className={cm.cn(
                'text-3xl font-extrabold tracking-tight font-serif text-on-background',
              )}
            >
              {t('nav.templates', {}, { defaultValue: 'Templates' })}
            </h1>
            <p className={cm.cn(cm.sp('mt', 1), cm.textMuted)}>
              {t(
                'templates.subtitle',
                {},
                {
                  defaultValue:
                    'Start from a battle-tested editorial frame, then make it your own.',
                },
              )}
            </p>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 4),
              cm.textSize('sm'),
              'rounded-lg bg-error-container text-on-error-container',
            )}
          >
            {error}
          </div>
        ) : null}

        {categories.length > 1 ? (
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }))}>
            {categories.map((cat) => {
              const isActive = cat === activeCategory
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  aria-pressed={isActive}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.roundedFull,
                    cm.fontWeight('semibold'),
                    cm.textSize('xs'),
                    'uppercase tracking-widest border transition-colors',
                    isActive
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface text-on-surface-variant border-outline-variant hover:border-primary/30 hover:text-primary',
                  )}
                >
                  {t(`templates.category.${cat}`, {}, { defaultValue: cat })}
                </button>
              )
            })}
          </div>
        ) : null}

        {templates === null ? (
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.textCenter, cm.sp('py', 12))}>
            {t('templates.loading', {}, { defaultValue: 'Loading templates…' })}
          </p>
        ) : filtered.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('py', 16),
              cm.textCenter,
              cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
            )}
          >
            <span
              className="material-symbols-outlined text-4xl text-on-surface-variant"
              aria-hidden="true"
            >
              auto_stories
            </span>
            <p className={cm.cn(cm.textSize('lg'), cm.textMuted, 'font-serif italic')}>
              {t(
                'templates.empty',
                {},
                {
                  defaultValue:
                    'No templates match this filter. System templates seed automatically with the first run.',
                },
              )}
            </p>
          </div>
        ) : (
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}
          >
            {filtered.map((tpl) => {
              const preview = previewFromBody(String(tpl.body_template ?? ''))
              const category = String(tpl.category || 'general')
              return (
                <Link
                  key={tpl.id}
                  to={`/documents/new?template=${encodeURIComponent(tpl.id)}`}
                  className={cm.cn(
                    cm.flex({ direction: 'col' }),
                    'rounded-xl bg-surface border border-outline-variant overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all group',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.sp('p', 5),
                      cm.h(40),
                      'relative overflow-hidden border-b border-outline-variant bg-surface-container-low',
                    )}
                  >
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.textMuted,
                        'font-serif italic leading-relaxed line-clamp-5',
                      )}
                    >
                      {preview ||
                        t(
                          'templates.emptyPreview',
                          {},
                          { defaultValue: 'Open this template to see its outline.' },
                        )}
                    </p>
                    <div
                      className={cm.cn(
                        'absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface-container-low to-transparent',
                      )}
                    />
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.roundedFull,
                        cm.fontWeight('bold'),
                        'absolute right-3 top-3 text-[10px] uppercase tracking-widest bg-secondary/15 text-secondary-dark border border-secondary/20',
                      )}
                    >
                      {t(`templates.category.${category}`, {}, { defaultValue: category })}
                    </span>
                  </div>
                  <div
                    className={cm.cn(
                      cm.sp('p', 5),
                      cm.flex({ direction: 'col', gap: 'sm' }),
                      cm.flex1,
                    )}
                  >
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                      <span
                        className={cm.cn('material-symbols-outlined text-primary text-base')}
                        aria-hidden="true"
                      >
                        {iconFor(category)}
                      </span>
                      <h3
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          'font-serif text-base text-on-surface group-hover:text-primary transition-colors',
                        )}
                      >
                        {tpl.name}
                      </h3>
                    </div>
                    <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'leading-relaxed')}>
                      {tpl.description ||
                        t(
                          'templates.noDescription',
                          {},
                          { defaultValue: 'No description provided.' },
                        )}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Templates
export { Templates as TemplatesPage }
