import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { MetricStatCard } from '../components/MetricStatCard.js'
import { useApi } from '../lib/useApi.js'

const PANEL_BG = 'var(--mol-color-surface)'
const PANEL_BORDER = 'var(--mol-color-border)'

interface ApiEventType {
  id: string
  user_id: string
  name: string
  description: string
  payload_schema: unknown
  created_at: string
  updated_at: string
}

interface ApiEvent {
  id: string
  user_id: string
  name: string
  category: string | null
  description: string
  payload: unknown
  delivery_status: string
  created_at: string
}

const inferCategory = (name: string): string => {
  const dot = name.indexOf('.')
  return dot > 0 ? name.slice(0, dot) : 'other'
}

const CATEGORY_COLORS: Record<string, string> = {
  orders: 'var(--mol-color-primary)',
  payments: 'var(--mol-color-secondary)',
  subscription: 'var(--mol-color-secondary)',
  invoice: 'var(--mol-color-secondary)',
  user: 'var(--mol-color-info)',
  alert: 'var(--mol-color-warning)',
  other: 'var(--mol-color-text-tertiary)',
}

const colorFor = (category: string): string =>
  CATEGORY_COLORS[category] ?? 'var(--mol-color-text-tertiary)'

interface MergedEventType {
  id: string
  name: string
  category: string
  description: string
  fired24h: number
  payload_keys: string[]
  color: string
}

const collectKeys = (obj: unknown, prefix = '', out: string[] = []): string[] => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return out
  for (const k of Object.keys(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k
    out.push(path)
    if (out.length > 6) return out
    const v = (obj as Record<string, unknown>)[k]
    if (v && typeof v === 'object' && !Array.isArray(v)) collectKeys(v, path, out)
  }
  return out
}

export function Events() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [category, setCategory] = useState<string>('all')

  const { data: types, loading: loadingTypes } = useApi<ApiEventType[]>('/events/types?limit=500')
  const { data: events } = useApi<ApiEvent[]>('/events?limit=500')

  const merged: MergedEventType[] = useMemo(() => {
    const typeList = types ?? []
    const eventList = events ?? []
    const knownNames = new Set(typeList.map((t) => t.name))
    // Include implicit names from emitted events (those not yet registered as types)
    for (const ev of eventList) {
      if (!knownNames.has(ev.name)) knownNames.add(ev.name)
    }
    return Array.from(knownNames).map((name): MergedEventType => {
      const cat = inferCategory(name)
      const tdef = typeList.find((t) => t.name === name)
      const examples = eventList.filter((e) => e.name === name)
      const fired = examples.length
      const payload_keys =
        tdef?.payload_schema && typeof tdef.payload_schema === 'object'
          ? collectKeys(tdef.payload_schema)
          : examples[0]
            ? collectKeys(examples[0].payload)
            : []
      return {
        id: name,
        name,
        category: tdef ? cat : `${cat} · uncatalogued`,
        description:
          tdef?.description ??
          `Implicit event — emit hasn't been registered as a catalog type yet.`,
        fired24h: fired,
        payload_keys,
        color: colorFor(cat),
      }
    })
  }, [types, events])

  const categories = useMemo(() => {
    const set = new Set<string>(['all'])
    for (const m of merged) set.add(m.category.split(' ')[0])
    return Array.from(set)
  }, [merged])

  const filtered = merged.filter((e) => category === 'all' || e.category.startsWith(category))

  const totalFired = merged.reduce((s, e) => s + e.fired24h, 0)

  return (
    <div
      className={cm.cn(cm.sp('p', 6), 'max-w-7xl mx-auto')}
      style={{ color: 'var(--mol-color-text)' }}
    >
      <div className={cm.cn('flex items-end justify-between gap-4 flex-wrap mb-6')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t('events.eyebrow', {}, { defaultValue: 'catalog · schemas' })}
          </p>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}
            style={{ color: 'var(--mol-color-text)' }}
          >
            {t('events.heading', {}, { defaultValue: 'Events' })}
          </h1>
          <p
            className={cm.cn('mt-2 text-sm max-w-xl')}
            style={{ color: 'var(--mol-color-text-secondary)' }}
          >
            {t(
              'events.body',
              {},
              {
                defaultValue:
                  'Every event your platform emits. Browse the schema, view subscriber endpoints, and copy a sample payload.',
              },
            )}
          </p>
        </div>
      </div>

      <div className={cm.cn('grid gap-4 mb-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>
        <MetricStatCard
          eyebrow={t('events.metric.total', {}, { defaultValue: 'Event types' })}
          value={String(merged.length)}
          tone="primary"
          icon="bolt"
        />
        <MetricStatCard
          eyebrow={t('events.metric.fired24h', {}, { defaultValue: 'Fired · 24h' })}
          value={String(totalFired)}
          tone="success"
          icon="trending_up"
        />
        <MetricStatCard
          eyebrow={t('events.metric.cataloged', {}, { defaultValue: 'Cataloged' })}
          value={String(types?.length ?? 0)}
          tone="info"
          icon="hub"
        />
        <MetricStatCard
          eyebrow={t('events.metric.categories', {}, { defaultValue: 'Categories' })}
          value={String(categories.length - 1)}
          tone="info"
          icon="category"
        />
      </div>

      <div
        className={cm.cn('rounded-xl p-3 mb-5 flex items-center gap-1 flex-wrap')}
        style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
      >
        {categories.map((c) => {
          const active = category === c
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cm.cn(
                'inline-flex items-center px-3 py-1.5 rounded-md font-mono text-[11px] font-bold uppercase tracking-widest transition-colors',
              )}
              style={{
                backgroundColor: active
                  ? 'color-mix(in srgb, var(--mol-color-primary) 15%, transparent)'
                  : 'transparent',
                color: active ? 'var(--mol-color-primary)' : 'var(--mol-color-text-secondary)',
                boxShadow: active
                  ? 'inset 0 0 0 1px color-mix(in srgb, var(--mol-color-primary) 35%, transparent)'
                  : undefined,
              }}
            >
              {c}
            </button>
          )
        })}
      </div>

      {loadingTypes && merged.length === 0 ? (
        <p
          className={cm.cn('font-mono text-sm')}
          style={{ color: 'var(--mol-color-text-secondary)' }}
        >
          {t('events.loading', {}, { defaultValue: 'Loading event catalog…' })}
        </p>
      ) : filtered.length === 0 ? (
        <div
          className={cm.cn('rounded-xl px-8 py-16 text-center')}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--mol-color-surface) 40%, transparent)',
            border: '1px dashed var(--mol-color-border)',
          }}
        >
          <p
            className={cm.cn('font-mono text-sm font-bold')}
            style={{ color: 'var(--mol-color-text-secondary)' }}
          >
            {t(
              'events.empty',
              {},
              {
                defaultValue:
                  'No event types in your catalog yet. Register one with POST /api/events/types.',
              },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.cn('grid gap-3 grid-cols-1 md:grid-cols-2')}>
          {filtered.map((event) => (
            <Link
              key={event.id}
              to={`/events/${encodeURIComponent(event.name)}`}
              className={cm.cn(
                'group block rounded-xl px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-lg',
              )}
              style={{
                backgroundColor: PANEL_BG,
                border: '1px solid var(--mol-color-border)',
                borderLeft: `4px solid ${event.color}`,
              }}
              data-mol-id={`event-card-${event.id}`}
            >
              <div className={cm.cn('flex items-start justify-between gap-3 flex-wrap')}>
                <div className={cm.cn('flex-1 min-w-0')}>
                  <p
                    className={cm.cn('font-mono text-sm font-extrabold')}
                    style={{ color: 'var(--mol-color-text)' }}
                  >
                    {event.name}
                  </p>
                  <p
                    className={cm.cn('mt-1 text-[10px] font-black uppercase tracking-widest')}
                    style={{ color: event.color }}
                  >
                    {event.category}
                  </p>
                </div>
              </div>
              <p
                className={cm.cn('mt-3 text-sm leading-relaxed')}
                style={{ color: 'var(--mol-color-text-secondary)' }}
              >
                {event.description}
              </p>
              {event.payload_keys.length > 0 && (
                <div className={cm.cn('mt-3 flex flex-wrap gap-1.5')}>
                  {event.payload_keys.map((k) => (
                    <span
                      key={k}
                      className={cm.cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px]',
                      )}
                      style={{
                        backgroundColor:
                          'color-mix(in srgb, var(--mol-color-background) 80%, transparent)',
                        color: 'var(--mol-color-text-secondary)',
                        border: '1px solid var(--mol-color-border)',
                      }}
                    >
                      {k}
                    </span>
                  ))}
                </div>
              )}
              <div
                className={cm.cn(
                  'mt-3 pt-3 flex items-center justify-between font-mono text-[11px]',
                )}
                style={{
                  borderTop: '1px solid var(--mol-color-border)',
                  color: 'var(--mol-color-text-secondary)',
                }}
              >
                <span>
                  <span style={{ color: 'var(--mol-color-primary)' }}>{event.fired24h}</span>{' '}
                  {t('events.fired24h', {}, { defaultValue: 'fired · 24h' })}
                </span>
                <span
                  className={cm.cn(
                    'inline-flex items-center gap-1 transition-all opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5',
                  )}
                  style={{ color: 'var(--mol-color-text-secondary)' }}
                >
                  {t('events.viewSchema', {}, { defaultValue: 'View schema' })}
                  <span
                    className={cm.cn('material-symbols-outlined text-[14px]')}
                    aria-hidden="true"
                  >
                    arrow_forward
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
