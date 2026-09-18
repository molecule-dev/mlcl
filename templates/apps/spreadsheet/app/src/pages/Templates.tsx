import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WorkbenchLayout } from '../components/WorkbenchLayout.js'

interface TemplateRow {
  id: string
  owner_id: string | null
  name: string
  description: string | null
  category: string | null
  is_system: boolean
  snapshot: Record<string, unknown>
  updated_at: string
}

const CATEGORY_TINT: Record<string, { ring: string; chip: string; text: string; glyph: string }> = {
  finance: {
    ring: 'border-emerald-500',
    chip: 'bg-emerald-500/15 text-success',
    text: 'text-success',
    glyph: 'trending_up',
  },
  ops: {
    ring: 'border-amber-500',
    chip: 'bg-amber-500/15 text-warning',
    text: 'text-warning',
    glyph: 'crisis_alert',
  },
  people: {
    ring: 'border-violet-500',
    chip: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
    text: 'text-violet-600',
    glyph: 'flag',
  },
  product: {
    ring: 'border-primary',
    chip: 'bg-primary-fixed text-primary',
    text: 'text-primary',
    glyph: 'inventory_2',
  },
  marketing: {
    ring: 'border-pink-500',
    chip: 'bg-pink-500/15 text-pink-600 dark:text-pink-300',
    text: 'text-pink-600',
    glyph: 'campaign',
  },
  other: {
    ring: 'border-outline-variant',
    chip: 'bg-surface-container-high text-on-surface-variant',
    text: 'text-on-surface-variant',
    glyph: 'grid_on',
  },
}

function tintFor(category: string | null) {
  return CATEGORY_TINT[(category ?? 'other').toLowerCase()] ?? CATEGORY_TINT.other!
}

interface FilterChip {
  id: 'all' | 'mine' | 'system'
  label: string
}

const FILTERS: FilterChip[] = [
  { id: 'all', label: 'All' },
  { id: 'system', label: 'System' },
  { id: 'mine', label: 'Mine' },
]

export function Templates() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [items, setItems] = useState<TemplateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterChip['id']>('all')
  const [creating, setCreating] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [systemRes, mineRes] = await Promise.all([
          http.get<TemplateRow[]>('/spreadsheet-templates?system=true'),
          http.get<TemplateRow[]>('/spreadsheet-templates'),
        ])
        if (cancelled) return
        const map = new Map<string, TemplateRow>()
        for (const tpl of [
          ...(Array.isArray(systemRes.data) ? systemRes.data : []),
          ...(Array.isArray(mineRes.data) ? mineRes.data : []),
        ]) {
          map.set(tpl.id, tpl)
        }
        setItems(Array.from(map.values()))
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  const visible = useMemo(
    () =>
      items.filter((tpl) => {
        if (filter === 'system') return tpl.is_system
        if (filter === 'mine') return !tpl.is_system
        return true
      }),
    [items, filter],
  )

  async function instantiate(tpl: TemplateRow) {
    setCreating(tpl.id)
    setError(null)
    try {
      const title = `${tpl.name} — copy`
      const res = await http.post<{ id: string; title: string }>(
        `/spreadsheet-templates/${tpl.id}/instantiate`,
        { title },
      )
      const created = res.data
      if (created?.id) {
        navigate(`/workbooks/${created.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setCreating(null)
    }
  }

  return (
    <WorkbenchLayout>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <p className={cm.cn('text-[10px] uppercase tracking-[0.25em] font-bold text-primary')}>
          {t('templates.eyebrow', {}, { defaultValue: 'Curated by analysts who use them daily' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('nav.templates', {}, { defaultValue: 'Templates' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-2xl')}>
          {t(
            'templates.subhead',
            {},
            {
              defaultValue:
                'Battle-tested workbooks. Every formula and view preserved. Click any tile to spin a new copy you own.',
            },
          )}
        </p>
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }))}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              'text-xs font-bold uppercase tracking-widest rounded-full transition-colors',
              filter === f.id
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container',
            )}
          >
            {t(`templates.filter.${f.id}`, {}, { defaultValue: f.label })}
          </button>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className={cm.cn('p-4 rounded-2xl text-sm bg-error-container/40 text-error')}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('templates.loading', {}, { defaultValue: 'Loading templates…' })}
        </div>
      ) : visible.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.stack(3))}>
          <p className={cm.cn(cm.textSize('lg'), 'font-bold text-on-surface')}>
            {items.length === 0
              ? t('templates.empty.headline', {}, { defaultValue: 'No templates yet.' })
              : t('templates.emptyFilter', {}, { defaultValue: 'Nothing matches this filter.' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'templates.empty.hint',
              {},
              {
                defaultValue:
                  'Save any workbook as a template from its options menu, or browse the system gallery once it’s seeded.',
              },
            )}
          </p>
          <Link
            to="/workbooks"
            className={
              'inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-primary rounded-full bg-primary-fixed hover:opacity-90 transition-opacity self-center'
            }
          >
            {t('templates.empty.cta', {}, { defaultValue: 'Back to workbooks' })}
          </Link>
        </div>
      ) : (
        <div className={cm.cn(cm.grid({ cols: 3, gap: 'lg' }))}>
          {visible.map((tpl) => {
            const tint = tintFor(tpl.category)
            const busy = creating === tpl.id
            return (
              <article
                key={tpl.id}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'md' }),
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl border-t-4 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden',
                  tint.ring,
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(11),
                      cm.h(11),
                      'rounded-xl text-xl',
                      tint.chip,
                    )}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">{tint.glyph}</span>
                  </span>
                  {tpl.is_system && (
                    <span
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        'rounded-full text-[10px] font-black uppercase tracking-widest bg-warning-light text-warning',
                      )}
                    >
                      {t('templates.system', {}, { defaultValue: 'System' })}
                    </span>
                  )}
                </div>
                <div>
                  <h3
                    className={cm.cn(
                      cm.textSize('lg'),
                      'font-extrabold tracking-tight text-on-surface',
                    )}
                  >
                    {tpl.name}
                  </h3>
                  {tpl.description && (
                    <p
                      className={cm.cn(
                        cm.sp('mt', 1),
                        cm.textSize('sm'),
                        'text-on-surface-variant leading-relaxed',
                      )}
                    >
                      {tpl.description}
                    </p>
                  )}
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    'mt-auto pt-3 border-t border-outline-variant/40',
                  )}
                >
                  <span
                    className={cm.cn('text-[10px] font-bold uppercase tracking-widest', tint.text)}
                  >
                    {t(
                      `templates.category.${tpl.category ?? 'other'}`,
                      {},
                      { defaultValue: tpl.category ?? 'other' },
                    )}
                  </span>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <Link
                      to={`/templates/${tpl.id}`}
                      className={
                        'text-xs font-bold text-on-surface-variant hover:text-primary transition-colors'
                      }
                    >
                      {t('templates.preview', {}, { defaultValue: 'Preview' })}
                    </Link>
                    <button
                      type="button"
                      onClick={() => instantiate(tpl)}
                      disabled={busy}
                      className={
                        'inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-on-primary rounded-full bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50'
                      }
                    >
                      {busy
                        ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                        : t('common.usename', {}, { defaultValue: 'Use template' })}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </WorkbenchLayout>
  )
}

export default Templates
