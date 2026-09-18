import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WhiteboardLayout } from '../components/WhiteboardLayout.js'

interface TemplateRow {
  id: string
  name: string
  description?: string
  is_system?: boolean
  user_id?: string | null
  owner_id?: string | null
  snapshot?: unknown
  created_at?: string
  updated_at?: string
}

interface BoardRow {
  id: string
}

const ACCENTS = [
  '#5b5bf7',
  '#00c4a8',
  '#a855f7',
  '#f97316',
  '#ec4899',
  '#84cc16',
  '#06b6d4',
  '#f43f5e',
]
const ICONS = [
  'pace',
  'mood',
  'route',
  'campaign',
  'rocket_launch',
  'hub',
  'flag',
  'celebration',
  'auto_awesome',
]

function accentForId(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return ACCENTS[h % ACCENTS.length]!
}

function iconForId(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 17 + id.charCodeAt(i)) >>> 0
  return ICONS[h % ICONS.length]!
}

export function Templates() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all' | 'system' | 'mine'>('all')
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await http.get<TemplateRow[]>('/api/templates')
      setTemplates(Array.isArray(res.data) ? res.data : [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!showCreate) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowCreate(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showCreate])

  const visible = useMemo(() => {
    if (filter === 'system') return templates.filter((tpl) => tpl.is_system)
    if (filter === 'mine') return templates.filter((tpl) => !tpl.is_system)
    return templates
  }, [filter, templates])

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!name.trim()) return
      setCreating(true)
      try {
        const res = await http.post<TemplateRow>('/api/templates', {
          name: name.trim(),
          description: description.trim(),
          snapshot: { elements: [] },
        })
        if (res.data?.id) {
          setTemplates((prev) => [...prev, res.data])
          setName('')
          setDescription('')
          setShowCreate(false)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setCreating(false)
      }
    },
    [description, http, name],
  )

  const handleInstantiate = useCallback(
    async (tpl: TemplateRow) => {
      try {
        const res = await http.post<BoardRow>(`/api/templates/${tpl.id}/instantiate`, {
          title: tpl.name,
        })
        if (res.data?.id) {
          navigate(`/board/${res.data.id}`)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [http, navigate],
  )

  return (
    <WhiteboardLayout
      eyebrow={t('templates.eyebrow', {}, { defaultValue: 'Workshop kits & saved templates' })}
      title={t('nav.templates', {}, { defaultValue: 'Templates' })}
      actions={
        <button
          type="button"
          data-mol-id="templates-new-template"
          onClick={() => setShowCreate(true)}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.flex({ align: 'center', gap: 'xs' }),
            'bg-gradient-to-br from-primary to-primary-hover text-white rounded-xl shadow-md shadow-primary/30 hover:scale-[1.02] transition-transform',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>add</span>
          {t('templates.createCustom', {}, { defaultValue: 'New custom template' })}
        </button>
      }
    >
      <div className={cm.stack(8)}>
        {error && (
          <div
            role="alert"
            data-mol-id="templates-error"
            className={cm.cn(
              cm.sp('p', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl bg-error-container/40 text-on-error-container',
            )}
          >
            {error}
          </div>
        )}

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          {(['all', 'system', 'mine'] as const).map((c) => (
            <button
              key={c}
              type="button"
              data-mol-id={`templates-filter-${c}`}
              onClick={() => setFilter(c)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest rounded-full transition-colors',
                filter === c
                  ? 'bg-on-surface text-surface'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
              )}
            >
              {t(
                `templates.filter.${c}`,
                {},
                {
                  defaultValue: c === 'all' ? 'All' : c === 'system' ? 'Built-in' : 'My templates',
                },
              )}
            </button>
          ))}
        </div>

        {!loading && visible.length === 0 ? (
          <div
            data-mol-id="templates-empty"
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              cm.stack(3),
              'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40 text-on-surface-variant',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[40px] text-primary')}>
              auto_awesome
            </span>
            <p className={cm.cn(cm.fontWeight('semibold'))}>
              {t('templates.empty.title', {}, { defaultValue: 'No templates yet' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'))}>
              {t(
                'templates.empty.body',
                {},
                {
                  defaultValue:
                    'Create a custom template from any board you own — open the board, save a snapshot, then save it as a reusable template here.',
                },
              )}
            </p>
          </div>
        ) : (
          <div data-mol-id="templates-grid" className={cm.cn(cm.grid({ cols: 4, gap: 'lg' }))}>
            {visible.map((tpl) => {
              const accent = accentForId(tpl.id)
              const icon = iconForId(tpl.id)
              return (
                <article
                  key={tpl.id}
                  data-mol-id={`template-card-${tpl.id}`}
                  className={cm.cn(
                    cm.sp('p', 5),
                    cm.stack(3),
                    'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:-translate-y-1 transition-transform',
                  )}
                  style={{ borderTop: `4px solid ${accent}` }}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.w(11),
                        cm.h(11),
                        cm.roundedFull,
                        'text-white',
                      )}
                      style={{ backgroundColor: accent }}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[20px]')}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {icon}
                      </span>
                    </span>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest rounded-full bg-surface-container text-on-surface-variant',
                      )}
                    >
                      {tpl.is_system
                        ? t('templates.systemBadge', {}, { defaultValue: 'Built-in' })
                        : t('templates.userBadge', {}, { defaultValue: 'Yours' })}
                    </span>
                  </div>
                  <Link
                    to={`/templates/${tpl.id}`}
                    data-mol-id={`template-detail-${tpl.id}`}
                    className={cm.cn(
                      cm.textSize('lg'),
                      'font-extrabold tracking-tight text-on-surface hover:text-primary',
                    )}
                  >
                    {tpl.name}
                  </Link>
                  {tpl.description && (
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-on-surface-variant leading-relaxed',
                      )}
                    >
                      {tpl.description}
                    </p>
                  )}
                  <button
                    type="button"
                    data-mol-id={`template-use-${tpl.id}`}
                    onClick={() => handleInstantiate(tpl)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                      'rounded-lg bg-primary text-white hover:opacity-90 mt-auto',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-[16px]')}>
                      add_circle
                    </span>
                    {t('common.usename', {}, { defaultValue: 'Use template' })}
                  </button>
                </article>
              )
            })}
          </div>
        )}

        {showCreate && (
          <div
            role="presentation"
            data-mol-id="templates-create-modal"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm',
            )}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCreate(false)
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="templates-create-title"
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(4),
                'w-full max-w-md bg-surface rounded-2xl shadow-2xl',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <h2
                  id="templates-create-title"
                  className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}
                >
                  {t('templates.createTitle', {}, { defaultValue: 'Save a custom template' })}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  aria-label={t('common.close', {}, { defaultValue: 'Close' })}
                  className={cm.cn(
                    cm.w(8),
                    cm.h(8),
                    cm.flex({ align: 'center', justify: 'center' }),
                    'rounded hover:bg-surface-container-low',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined')}>close</span>
                </button>
              </div>
              <form onSubmit={handleCreate} className={cm.stack(3)}>
                <label className={cm.stack(1)}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('templates.nameLabel', {}, { defaultValue: 'Template name' })}
                  </span>
                  <input
                    type="text"
                    required
                    data-mol-id="templates-create-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'rounded-xl border border-outline-variant/40 bg-surface-container-low focus:bg-surface focus:ring-2 focus:ring-primary/30 outline-none',
                    )}
                  />
                </label>
                <label className={cm.stack(1)}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('form.description', {}, { defaultValue: 'Description' })}
                  </span>
                  <textarea
                    rows={3}
                    data-mol-id="templates-create-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'rounded-xl border border-outline-variant/40 bg-surface-container-low focus:bg-surface focus:ring-2 focus:ring-primary/30 outline-none',
                    )}
                  />
                </label>
                <button
                  type="submit"
                  disabled={creating}
                  data-mol-id="templates-create-submit"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    'bg-primary text-white rounded-xl disabled:opacity-60',
                  )}
                >
                  {creating
                    ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                    : t('templates.createCta', {}, { defaultValue: 'Save template' })}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </WhiteboardLayout>
  )
}

export default Templates
