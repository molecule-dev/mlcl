import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ApiZone {
  id: string
  name?: string
  kind?: string
  code?: string | null
  bins?: number | null
  utilization_pct?: number | null
  description?: string | null
}

const TYPE_META: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  receiving: {
    color: 'var(--color-order-picking)',
    bg: 'var(--color-order-picking-bg)',
    icon: 'move_to_inbox',
    label: 'Receiving',
  },
  storage: {
    color: 'var(--color-text-secondary)',
    bg: 'var(--color-background-secondary)',
    icon: 'inventory',
    label: 'Storage',
  },
  picking: {
    color: 'var(--color-primary)',
    bg: 'var(--color-primary-light)',
    icon: 'inventory_2',
    label: 'Picking',
  },
  packing: {
    color: 'var(--color-order-packed)',
    bg: 'var(--color-order-packed-bg)',
    icon: 'check_box',
    label: 'Packing',
  },
  shipping: {
    color: 'var(--color-order-shipped)',
    bg: 'var(--color-order-shipped-bg)',
    icon: 'local_shipping',
    label: 'Shipping',
  },
  returns: {
    color: 'var(--color-stock-out)',
    bg: 'var(--color-stock-out-bg)',
    icon: 'undo',
    label: 'Returns',
  },
}

const ZONE_KINDS = ['receiving', 'storage', 'picking', 'packing', 'shipping', 'returns'] as const

export function Locations() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [zones, setZones] = useState<ApiZone[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<(typeof ZONE_KINDS)[number]>('storage')
  const [creating, setCreating] = useState(false)

  async function refresh() {
    setLoading(true)
    try {
      const res = await http.get<ApiZone[]>('/zones')
      const data = res.data
      setZones(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await http.get<ApiZone[]>('/zones')
        if (cancelled) return
        const data = res.data
        setZones(Array.isArray(data) ? data : [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      await http.post('/zones', { name: name.trim(), kind })
      void track({ name: 'zone.created', properties: { name: name.trim(), kind } })
      setName('')
      setShowForm(false)
      await refresh()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className={cm.stack(8)} data-testid="locations-page">
      <header
        className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(1)}>
          <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
            {t('locations.eyebrow', {}, { defaultValue: 'Warehouse map' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('locations.title', {}, { defaultValue: 'Zones, aisles & bins' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'locations.subtitle',
              { count: zones.length },
              { defaultValue: '{{count}} zones across the floor' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          data-testid="locations-new-toggle"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-lg bg-primary text-on-primary shadow shadow-primary/30 hover:opacity-95',
          )}
        >
          {showForm
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('locations.new', {}, { defaultValue: 'New zone' })}
        </button>
      </header>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className={cm.cn(
            cm.sp('p', 4),
            cm.flex({ gap: 'sm' }),
            'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest items-end flex-wrap',
          )}
          data-testid="locations-new-form"
        >
          <label className={cm.cn(cm.stack(1), 'flex-1 min-w-[200px]')}>
            <span
              className={cm.cn(
                'text-[11px] font-bold uppercase tracking-wider text-on-surface-variant',
              )}
            >
              {t('form.name', {}, { defaultValue: 'Name' })}
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              data-testid="locations-name"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant bg-surface text-on-surface w-full',
              )}
            />
          </label>
          <label className={cm.stack(1)}>
            <span
              className={cm.cn(
                'text-[11px] font-bold uppercase tracking-wider text-on-surface-variant',
              )}
            >
              {t('form.kind', {}, { defaultValue: 'Kind' })}
            </span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as (typeof ZONE_KINDS)[number])}
              data-testid="locations-kind"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant bg-surface text-on-surface',
              )}
            >
              {ZONE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={creating}
            data-testid="locations-create-submit"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-lg bg-primary text-on-primary hover:opacity-95 disabled:opacity-50',
            )}
          >
            {t('locations.create', {}, { defaultValue: 'Add zone' })}
          </button>
        </form>
      )}

      <section className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4')}>
        {loading && (
          <p className={cm.cn(cm.sp('p', 6), cm.textMuted, 'text-sm sm:col-span-2 lg:col-span-3')}>
            {t('locations.loading', {}, { defaultValue: 'Loading zones…' })}
          </p>
        )}
        {!loading && zones.length === 0 && (
          <p
            className={cm.cn(cm.sp('p', 6), cm.textMuted, 'text-sm sm:col-span-2 lg:col-span-3')}
            data-testid="locations-empty"
          >
            {t('locations.empty', {}, { defaultValue: 'No zones — add one above.' })}
          </p>
        )}
        {!loading &&
          zones.map((zone) => {
            const meta = TYPE_META[zone.kind ?? 'storage'] ?? TYPE_META.storage
            const utilPct = Math.max(0, Math.min(100, Number(zone.utilization_pct ?? 0)))
            return (
              <article
                key={zone.id}
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.stack(3),
                  'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest hover:shadow-md transition-all',
                )}
                data-testid="zone-card"
              >
                <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <span
                      className={cm.cn(
                        'h-12 w-12 rounded-xl inline-flex font-mono font-extrabold text-xl',
                      )}
                      style={{ backgroundColor: meta.bg, color: meta.color }}
                    >
                      <span className={cm.cn('m-auto')}>{zone.code ?? '?'}</span>
                    </span>
                    <div className={cm.stack(0)}>
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'text-on-surface',
                        )}
                      >
                        {zone.name}
                      </p>
                      <p
                        className={cm.cn(
                          'text-[11px] uppercase tracking-wider text-on-surface-variant',
                        )}
                      >
                        {meta.label}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cm.cn('inline-flex h-8 w-8 rounded-full')}
                    style={{ backgroundColor: meta.bg, color: meta.color }}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-[16px] m-auto')}
                      data-icon={meta.icon}
                    >
                      {meta.icon}
                    </span>
                  </span>
                </header>
                <div className={cm.stack(1)}>
                  <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                    <p
                      className={cm.cn(
                        'text-[10px] uppercase tracking-wider text-on-surface-variant',
                      )}
                    >
                      {t('locations.utilization', {}, { defaultValue: 'Utilization' })}
                    </p>
                    <p className={cm.cn('font-mono font-bold tabular-nums text-on-surface')}>
                      {utilPct}%
                    </p>
                  </div>
                  <div
                    className={cm.cn('h-2 rounded-full overflow-hidden')}
                    style={{ backgroundColor: 'var(--color-background-secondary)' }}
                  >
                    <div
                      className={cm.cn('h-full rounded-full transition-all')}
                      style={{ width: `${utilPct}%`, backgroundColor: meta.color }}
                    />
                  </div>
                  <p className={cm.cn('text-[11px] text-on-surface-variant')}>
                    {t(
                      'locations.bins',
                      { count: Number(zone.bins ?? 0) },
                      { defaultValue: '{{count}} bins' },
                    )}
                  </p>
                </div>
              </article>
            )
          })}
      </section>
    </div>
  )
}

export default Locations
