import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { RushesLayout } from '../components/RushesLayout.js'

interface TemplateRow {
  id: string
  name: string
  description?: string | null
  cover_image_url?: string | null
  category?: string | null
  is_premium?: boolean | null
  project_snapshot?: { width?: number; height?: number; fps?: number; tracks?: unknown[] } | null
  created_at?: string | null
}

const SWATCHES = [
  'linear-gradient(135deg, var(--video-cta-from), var(--video-cta-to))',
  'linear-gradient(135deg, var(--mol-color-info), var(--video-cta-from))',
  'linear-gradient(135deg, var(--mol-color-primary-dark), var(--video-cta-from))',
  'linear-gradient(135deg, var(--video-cta-to), var(--mol-color-warning))',
  'linear-gradient(135deg, var(--mol-color-warning), var(--video-cta-to))',
  'linear-gradient(135deg, var(--mol-color-success), var(--mol-color-info))',
  'linear-gradient(135deg, var(--video-cta-to), var(--video-cta-from))',
  'linear-gradient(135deg, var(--video-timeline-bg), var(--video-cta-from))',
  'linear-gradient(135deg, var(--mol-color-info), var(--mol-color-success))',
]
const ICONS = [
  'movie_creation',
  'theaters',
  'celebration',
  'school',
  'event',
  'live_tv',
  'crop_square',
  'smartphone',
  'favorite',
]

function arrayFrom<T>(res: unknown): T[] {
  const d = (res as { data?: unknown })?.data
  if (Array.isArray(d)) return d as T[]
  if (Array.isArray(res)) return res as T[]
  return []
}

function aspectFromSnapshot(snap?: TemplateRow['project_snapshot']): string {
  const w = snap?.width
  const h = snap?.height
  if (!w || !h) return '16:9'
  if (w === h) return '1:1'
  if (w / h > 16 / 9 + 0.5) return '21:9'
  if (h > w) return '9:16'
  return '16:9'
}

export function Templates() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<string>('all')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await http.get('/api/templates')
        if (cancelled) return
        setTemplates(arrayFrom<TemplateRow>(res))
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load templates.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const tpl of templates) {
      if (tpl.category) set.add(tpl.category)
    }
    return ['all', ...Array.from(set).sort()]
  }, [templates])

  const filtered = useMemo(() => {
    if (category === 'all') return templates
    return templates.filter((tpl) => (tpl.category ?? '') === category)
  }, [templates, category])

  return (
    <RushesLayout
      title={t('nav.templates', {}, { defaultValue: 'Templates' })}
      breadcrumb="// templates"
    >
      <div className={cm.stack(6)}>
        <header>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'text-[var(--video-text-primary)] tracking-tight',
            )}
          >
            {t('templates.heading', {}, { defaultValue: 'Start with a template' })}
          </h2>
          <p
            data-mol-id="templates-subtitle"
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 1),
              'text-[var(--video-text-muted-alt)]',
            )}
          >
            {loading
              ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
              : t(
                  'templates.subhead',
                  { count: templates.length },
                  {
                    defaultValue:
                      '{{count}} hand-crafted shells. Apply one and start swapping clips.',
                  },
                )}
          </p>
        </header>

        {error && (
          <p
            role="alert"
            data-mol-id="templates-error"
            className={cm.cn(cm.textSize('sm'), 'text-[var(--video-error-text)] font-mono')}
          >
            {error}
          </p>
        )}

        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'flex-wrap')}>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              data-mol-id={`templates-cat-${c}`}
              aria-pressed={category === c}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'font-mono text-[10px] uppercase tracking-widest rounded-full border transition-colors',
                category === c
                  ? 'bg-[var(--video-cta-from)]/15 text-[var(--video-link)] border-[var(--video-cta-from)]/40'
                  : 'border-[var(--video-border-subtle)] text-[var(--video-text-muted-alt)] hover:border-[var(--video-cta-from)]/40 hover:text-[var(--video-link)]',
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div
            data-mol-id="templates-empty"
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              'rounded-xl border border-dashed border-[var(--video-border-subtle)] bg-[var(--video-panel-bg)]/40',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-5xl text-[var(--video-text-dim)]')}
            >
              auto_awesome
            </span>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 4),
                'text-[var(--video-text-muted-alt)]',
              )}
            >
              {templates.length === 0
                ? t('templates.empty', {}, { defaultValue: 'No templates available yet.' })
                : t(
                    'templates.emptyFiltered',
                    {},
                    { defaultValue: 'No templates match this category.' },
                  )}
            </p>
          </div>
        ) : (
          <div
            data-mol-id="templates-grid"
            className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4')}
          >
            {filtered.map((tpl, idx) => {
              const swatch = SWATCHES[idx % SWATCHES.length]
              const icon = ICONS[idx % ICONS.length]
              const aspect = aspectFromSnapshot(tpl.project_snapshot ?? undefined)
              return (
                <Link
                  key={tpl.id}
                  to={`/templates/${tpl.id}`}
                  data-mol-id={`template-${tpl.id}`}
                  className={cm.cn(
                    'group block rounded-xl border border-[var(--video-border-subtle)] bg-[var(--video-panel-bg)] overflow-hidden hover:border-[var(--video-cta-from)]/50 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_-10px_color-mix(in_srgb,var(--video-cta-from)_55%,transparent)]',
                  )}
                >
                  <div
                    className={cm.cn('relative aspect-video flex items-center justify-center')}
                    style={{ background: swatch }}
                  >
                    <div
                      className={cm.cn(
                        'absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.18)_1px,transparent_0)] [background-size:20px_20px] opacity-50',
                      )}
                    />
                    <span
                      className={cm.cn(
                        'material-symbols-outlined text-white/80 text-[44px] group-hover:scale-110 transition-transform duration-500',
                      )}
                    >
                      {icon}
                    </span>
                    <span
                      className={cm.cn(
                        'absolute top-2 left-2 font-mono text-[9px] uppercase tracking-widest text-white/90 bg-foreground/40 backdrop-blur px-1.5 py-0.5 rounded',
                      )}
                    >
                      {aspect}
                    </span>
                    {tpl.is_premium && (
                      <span
                        className={cm.cn(
                          'absolute bottom-2 right-2 font-mono text-[9px] uppercase tracking-widest text-white bg-[var(--video-link-hover)]/90 backdrop-blur px-1.5 py-0.5 rounded',
                        )}
                      >
                        {t('templates.premium', {}, { defaultValue: 'Premium' })}
                      </span>
                    )}
                    <div
                      className={cm.cn(
                        'absolute inset-0 bg-gradient-to-t from-[var(--video-panel-bg)] via-transparent to-transparent',
                      )}
                    />
                  </div>
                  <div className={cm.cn(cm.sp('p', 4), cm.stack(2))}>
                    <h3
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-[var(--video-text-primary)] truncate group-hover:text-[var(--video-link)] transition-colors',
                      )}
                    >
                      {tpl.name}
                    </h3>
                    {tpl.description && (
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-[var(--video-text-muted-alt)] line-clamp-2',
                        )}
                      >
                        {tpl.description}
                      </p>
                    )}
                    <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                      <span
                        className={cm.cn(
                          'font-mono text-[10px] text-[var(--video-link)] uppercase tracking-widest',
                        )}
                      >
                        {tpl.category ?? 'general'}
                      </span>
                      <span
                        className={cm.cn(
                          'font-mono text-[10px] text-[var(--video-text-dim)] uppercase tracking-widest',
                        )}
                      >
                        {tpl.project_snapshot?.fps ?? 30}fps
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </RushesLayout>
  )
}

export default Templates
