import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ForjaTopBar } from '../components/ForjaTopBar.js'
import { type StatItem, StatsTriad } from '../components/StatsTriad.js'

interface ApiMeasurement {
  id: string
  recorded_at: string
  weight_kg?: number | string | null
  body_fat_pct?: number | string | null
  chest_cm?: number | string | null
  waist_cm?: number | string | null
  hips_cm?: number | string | null
  thigh_cm?: number | string | null
  bicep_cm?: number | string | null
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function fmtNum(v: unknown, suffix = ''): string {
  const n = num(v)
  return n === null ? '—' : `${Math.round(n * 10) / 10}${suffix}`
}

function fmtDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
}

const FIELDS: Array<{ name: keyof ApiMeasurement; label: string; suffix: string }> = [
  { name: 'weight_kg', label: 'Bodyweight', suffix: 'kg' },
  { name: 'chest_cm', label: 'Chest', suffix: 'cm' },
  { name: 'waist_cm', label: 'Waist', suffix: 'cm' },
  { name: 'hips_cm', label: 'Hips', suffix: 'cm' },
  { name: 'bicep_cm', label: 'Biceps', suffix: 'cm' },
  { name: 'thigh_cm', label: 'Thigh', suffix: 'cm' },
]

export function BodyMeasurements() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<ApiMeasurement[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const data = (await http.get<ApiMeasurement[]>('/measurements')).data ?? []
      setItems(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    const body: Record<string, unknown> = {}
    let any = false
    for (const f of FIELDS) {
      const v = draft[f.name]
      if (v != null && v !== '') {
        const n = Number(v)
        if (!Number.isFinite(n)) {
          setCreateError(
            t(
              'forja.measurements.create.error.number',
              {},
              { defaultValue: 'All values must be numbers.' },
            ),
          )
          return
        }
        body[f.name as string] = n
        any = true
      }
    }
    if (!any) {
      setCreateError(
        t(
          'forja.measurements.create.error.empty',
          {},
          { defaultValue: 'Enter at least one measurement.' },
        ),
      )
      return
    }
    setCreating(true)
    try {
      await http.post('/measurements', body)
      setDraft({})
      setShowCreate(false)
      await load()
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : t(
              'forja.measurements.create.error.generic',
              {},
              { defaultValue: 'Could not save check-in.' },
            ),
      )
    } finally {
      setCreating(false)
    }
  }

  const latest = items[0]
  const earliest = items[items.length - 1]

  function delta(field: keyof ApiMeasurement): number | null {
    if (!latest || !earliest) return null
    const a = num(latest[field])
    const b = num(earliest[field])
    if (a === null || b === null) return null
    return a - b
  }

  const stats: StatItem[] = [
    {
      key: 'bodyweight',
      icon: 'monitor_weight',
      tone: 'primary',
      label: t('forja.measurements.bodyweight', {}, { defaultValue: 'Bodyweight' }),
      value: fmtNum(latest?.weight_kg, ' kg'),
      caption:
        delta('weight_kg') == null
          ? t(
              'forja.measurements.noTrend',
              {},
              { defaultValue: 'Log another check-in for a trend.' },
            )
          : t(
              'forja.measurements.weightDelta',
              { delta: (delta('weight_kg') ?? 0).toFixed(1) },
              { defaultValue: '{{delta}} kg vs first check-in' },
            ),
      trend:
        delta('weight_kg') == null
          ? undefined
          : {
              value: `${(delta('weight_kg') ?? 0).toFixed(1)}kg`,
              direction: (delta('weight_kg') ?? 0) >= 0 ? 'up' : 'down',
            },
    },
    {
      key: 'chest',
      icon: 'expand',
      tone: 'volume-up',
      label: t('forja.measurements.chest', {}, { defaultValue: 'Chest' }),
      value: fmtNum(latest?.chest_cm, ' cm'),
      caption:
        delta('chest_cm') == null
          ? t(
              'forja.measurements.noTrend',
              {},
              { defaultValue: 'Log another check-in for a trend.' },
            )
          : t(
              'forja.measurements.cmChange',
              { delta: (delta('chest_cm') ?? 0).toFixed(1) },
              { defaultValue: '{{delta}} cm change' },
            ),
      trend:
        delta('chest_cm') == null
          ? undefined
          : {
              value: `${(delta('chest_cm') ?? 0).toFixed(1)}cm`,
              direction: (delta('chest_cm') ?? 0) >= 0 ? 'up' : 'down',
            },
    },
    {
      key: 'waist',
      icon: 'compress',
      tone: 'rest-timer',
      label: t('forja.measurements.waist', {}, { defaultValue: 'Waist' }),
      value: fmtNum(latest?.waist_cm, ' cm'),
      caption:
        delta('waist_cm') == null
          ? t(
              'forja.measurements.noTrend',
              {},
              { defaultValue: 'Log another check-in for a trend.' },
            )
          : t(
              'forja.measurements.cmChange',
              { delta: (delta('waist_cm') ?? 0).toFixed(1) },
              { defaultValue: '{{delta}} cm change' },
            ),
      trend:
        delta('waist_cm') == null
          ? undefined
          : {
              value: `${(delta('waist_cm') ?? 0).toFixed(1)}cm`,
              direction: (delta('waist_cm') ?? 0) >= 0 ? 'up' : 'down',
            },
    },
  ]

  return (
    <>
      <ForjaTopBar
        title={t('forja.measurements.title', {}, { defaultValue: 'Body measurements' })}
        eyebrow={
          <span>
            {t(
              'forja.measurements.eyebrow',
              { count: items.length },
              { defaultValue: '{{count}} check-ins logged' },
            )}
          </span>
        }
        actions={
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-full bg-primary text-on-primary hover:bg-primary-light transition-colors uppercase tracking-wide',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
              add
            </span>
            {t('forja.measurements.add', {}, { defaultValue: 'Add check-in' })}
          </button>
        }
      />

      {showCreate ? (
        <form
          onSubmit={handleCreate}
          aria-label={t('forja.measurements.add', {}, { defaultValue: 'Add check-in' })}
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            cm.sp('p', 5),
            'rounded-2xl bg-surface border border-outline/60 shadow-sm',
          )}
        >
          <div className={cm.cn('grid grid-cols-2 md:grid-cols-3 gap-3')}>
            {FIELDS.map((f) => (
              <label key={f.name as string} className={cm.flex({ direction: 'col', gap: 'xs' })}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-on-surface',
                  )}
                >
                  {f.label}
                </span>
                <input
                  value={draft[f.name as string] ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.name as string]: e.target.value }))}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  placeholder={f.suffix}
                  className={cm.cn(
                    cm.sp('px', 4),
                    'h-12 rounded-lg border border-outline bg-surface text-on-surface',
                  )}
                  aria-label={f.label}
                />
              </label>
            ))}
          </div>
          {createError ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
              {createError}
            </p>
          ) : null}
          <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
            <button
              type="submit"
              disabled={creating}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-full bg-primary text-on-primary hover:bg-primary-light transition-colors uppercase tracking-wide disabled:opacity-50',
              )}
            >
              {creating
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('forja.measurements.create.submit', {}, { defaultValue: 'Save check-in' })}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false)
                setCreateError('')
              }}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-full bg-surface text-on-surface border border-outline hover:bg-surface-variant transition-colors uppercase tracking-wide',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      ) : null}

      <StatsTriad items={stats} />

      <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <h2 className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface')}>
          {t('forja.measurements.history.title', {}, { defaultValue: 'Measurement history' })}
        </h2>
        {loading ? (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 5),
              'rounded-xl bg-surface border border-outline/40 text-on-surface-variant',
            )}
          >
            {t('forja.measurements.loading', {}, { defaultValue: 'Loading measurements…' })}
          </p>
        ) : items.length === 0 ? (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 5),
              'rounded-xl border border-dashed border-outline text-on-surface-variant text-center',
            )}
          >
            {t(
              'forja.measurements.empty',
              {},
              { defaultValue: 'No check-ins yet — log your first to track progress.' },
            )}
          </p>
        ) : (
          <div className={cm.cn('overflow-x-auto rounded-xl bg-surface border border-outline/40')}>
            <table className={cm.cn('w-full text-sm')}>
              <thead>
                <tr className={cm.cn('text-on-surface-variant text-left')}>
                  <th
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 3),
                      'text-[10px] font-black uppercase tracking-widest',
                    )}
                  >
                    Date
                  </th>
                  {FIELDS.map((f) => (
                    <th
                      key={f.name as string}
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 3),
                        'text-[10px] font-black uppercase tracking-widest text-right',
                      )}
                    >
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={cm.cn('divide-y divide-outline/40')}>
                {items.map((m) => (
                  <tr key={m.id} className={cm.cn('hover:bg-surface-variant/40 transition-colors')}>
                    <td
                      className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), 'font-bold text-on-surface')}
                    >
                      {fmtDate(m.recorded_at)}
                    </td>
                    {FIELDS.map((f) => (
                      <td
                        key={f.name as string}
                        className={cm.cn(
                          cm.sp('px', 5),
                          cm.sp('py', 3),
                          'text-right text-on-surface tabular-nums',
                        )}
                      >
                        {fmtNum(m[f.name], ` ${f.suffix}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
