import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface MapTemplate {
  id: string
  owner_id: string | null
  name: string
  description: string
  is_system: boolean
  snapshot: { nodes?: unknown[]; connections?: unknown[] } | string
}

const PALETTES = [
  'from-primary to-primary-container',
  'from-tertiary to-tertiary-container',
  'from-secondary to-secondary-container',
  'from-primary-container to-tertiary',
] as const

const TABS = ['all', 'system', 'mine'] as const
type Tab = (typeof TABS)[number]

const parseSnapshot = (
  snap: MapTemplate['snapshot'],
): { nodes: unknown[]; connections: unknown[] } => {
  const obj = typeof snap === 'string' ? JSON.parse(snap) : snap
  return {
    nodes: Array.isArray(obj?.nodes) ? obj.nodes : [],
    connections: Array.isArray(obj?.connections) ? obj.connections : [],
  }
}

const iconFor = (name: string): string => {
  const lower = name.toLowerCase()
  if (lower.includes('swot')) return 'grid_view'
  if (lower.includes('brainstorm')) return 'lightbulb'
  if (lower.includes('persona')) return 'person'
  if (lower.includes('retro')) return 'history_toggle_off'
  if (lower.includes('journey')) return 'route'
  if (lower.includes('okr') || lower.includes('goal')) return 'flag'
  return 'account_tree'
}

export function Templates() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [templates, setTemplates] = useState<MapTemplate[]>([])
  const [tab, setTab] = useState<Tab>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<MapTemplate[]>('/templates')
      .then((res) => {
        if (cancelled) return
        setTemplates(res?.data ?? [])
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setError(t('templates.loadError', {}, { defaultValue: 'Could not load templates.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = useMemo(() => {
    if (tab === 'system') return templates.filter((tpl) => tpl.is_system)
    if (tab === 'mine') return templates.filter((tpl) => !tpl.is_system)
    return templates
  }, [templates, tab])

  const tabLabels: Record<Tab, string> = {
    all: t('status.all', {}, { defaultValue: 'All' }),
    system: t('templates.tab.system', {}, { defaultValue: 'Built-in' }),
    mine: t('templates.tab.mine', {}, { defaultValue: 'My templates' }),
  }

  return (
    <div className={cm.stack(8)}>
      <header className={cm.stack(2)}>
        <span className={cm.cn('text-[10px] uppercase tracking-widest font-bold text-primary')}>
          {t('templates.eyebrow', {}, { defaultValue: 'Start faster' })}
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
                'Hand-picked starting points. Pick one — every template is fully editable.',
            },
          )}
        </p>
      </header>

      <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
        {TABS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setTab(c)}
            data-mol-id={`templates-tab-${c}`}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest rounded-full transition-colors',
              tab === c
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
            )}
          >
            {tabLabels[c]}
          </button>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'rounded-xl bg-error-container/30 text-on-error-container border border-error/30',
          )}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.textCenter, cm.sp('py', 12))}>
          {t('nav.loadingTemplates', {}, { defaultValue: 'Loading templates…' })}
        </p>
      ) : filtered.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 12),
            cm.stack(3),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('3xl'),
              'material-symbols-outlined text-on-surface-variant/60',
            )}
          >
            collections_bookmark
          </span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('templates.empty.title', {}, { defaultValue: 'No templates here yet' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'templates.empty.body',
              {},
              {
                defaultValue:
                  'Save any map as a template from the editor toolbar to start your library.',
              },
            )}
          </p>
        </div>
      ) : (
        <div
          className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'sm:grid-cols-2 lg:grid-cols-3')}
          data-mol-id="templates-grid"
        >
          {filtered.map((tpl, idx) => {
            const palette = PALETTES[idx % PALETTES.length]
            const summary = parseSnapshot(tpl.snapshot)
            return (
              <Link
                key={tpl.id}
                to={`/templates/${tpl.id}`}
                data-mol-id="templates-card"
                data-template-id={tpl.id}
                className={cm.cn(
                  cm.flex({ direction: 'col' }),
                  'rounded-2xl overflow-hidden bg-surface-container-lowest shadow-sm border border-outline-variant/30 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200',
                )}
              >
                <div
                  className={cm.cn(
                    cm.h(36),
                    cm.flex({ align: 'center', justify: 'center' }),
                    'relative bg-gradient-to-br',
                    palette,
                  )}
                >
                  <div
                    className={cm.cn(
                      'absolute -right-10 -top-10 w-32 h-32 rounded-full bg-surface/15 blur-2xl',
                    )}
                    aria-hidden
                  />
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(16),
                      cm.h(16),
                      'relative rounded-2xl bg-surface/25 backdrop-blur-md text-on-primary',
                    )}
                  >
                    <span
                      className={cm.cn('text-3xl material-symbols-outlined')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {iconFor(tpl.name)}
                    </span>
                  </span>
                  {tpl.is_system && (
                    <span
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.fontWeight('bold'),
                        'absolute top-3 right-3 bg-surface/25 backdrop-blur-md text-on-primary text-[10px] uppercase tracking-widest rounded-full',
                      )}
                    >
                      {t('templates.systemBadge', {}, { defaultValue: 'Built-in' })}
                    </span>
                  )}
                </div>
                <div className={cm.cn(cm.sp('p', 5), cm.stack(2))}>
                  <div className={cm.flex({ justify: 'between', align: 'center' })}>
                    <h3
                      className={cm.cn(
                        cm.textSize('lg'),
                        'font-extrabold tracking-tight text-on-surface',
                      )}
                    >
                      {tpl.name}
                    </h3>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest rounded-full bg-primary-fixed text-on-primary-fixed',
                      )}
                    >
                      {t(
                        'templates.nodes',
                        { count: summary.nodes.length },
                        { defaultValue: '{{count}} nodes' },
                      )}
                    </span>
                  </div>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {tpl.description}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Templates
