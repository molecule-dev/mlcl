import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PhotoEditorLayout } from '../components/PhotoEditorLayout.js'
import { PresetTile } from '../components/PresetTile.js'
import { type ApiPreset, presetToSamplePreset } from '../lib/image-adapter.js'

const CATEGORIES = [
  { id: 'all', icon: 'all_inclusive', defaultLabel: 'All packs' },
  { id: 'mood', icon: 'auto_awesome', defaultLabel: 'Mood' },
  { id: 'cinema', icon: 'theaters', defaultLabel: 'Cinema' },
  { id: 'studio', icon: 'lightbulb', defaultLabel: 'Studio' },
  { id: 'street', icon: 'streetview', defaultLabel: 'Street' },
  { id: 'mono', icon: 'monochrome_photos', defaultLabel: 'Mono' },
] as const

type CategoryId = (typeof CATEGORIES)[number]['id']

export function Presets() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [category, setCategory] = useState<CategoryId>('all')
  const [activePresetId, setActivePresetId] = useState<string | null>(null)
  const [presets, setPresets] = useState<ApiPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<ApiPreset[]>('/filters/presets')
      .then((res) => {
        if (cancelled) return
        setPresets(Array.isArray(res.data) ? res.data : [])
        setLoadError(null)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setLoadError(err.message ?? 'Could not load presets.')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const samplePresets = useMemo(() => presets.map(presetToSamplePreset), [presets])

  const visible =
    category === 'all' ? samplePresets : samplePresets.filter((p) => p.category === category)

  return (
    <PhotoEditorLayout
      title={t('presets.title', {}, { defaultValue: 'Presets' })}
      breadcrumb={t('presets.breadcrumb', {}, { defaultValue: '// presets › library' })}
    >
      {/* Hero band */}
      <section
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] border border-[var(--photo-border)] mb-8',
        )}
        style={{
          background:
            'linear-gradient(135deg, var(--photo-hero-from) 0%, var(--photo-hero-via) 50%, var(--photo-hero-to) 130%)',
        }}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-[var(--photo-accent)]/35 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'absolute -left-10 -top-10 w-48 h-48 rounded-full bg-[var(--photo-danger)]/25 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 p-8 lg:p-10 items-center',
          )}
        >
          <div className={cm.cn('md:col-span-7')}>
            <p
              className={cm.cn(
                'text-[10px] font-mono font-bold uppercase tracking-widest text-white/75',
              )}
            >
              {t('presets.hero.eyebrow', {}, { defaultValue: 'Preset library' })}
            </p>
            <h2
              className={cm.cn(
                'text-4xl md:text-5xl font-extrabold tracking-tighter leading-[1.02] text-white mt-2',
              )}
            >
              {t('presets.hero.headline', {}, { defaultValue: 'A pack for every shoot' })}
            </h2>
            <p className={cm.cn('text-base text-white/85 mt-3 max-w-md leading-relaxed')}>
              {t(
                'presets.hero.body',
                {},
                {
                  defaultValue:
                    'Hand-tuned LUTs and parametric stacks. One click to preview, two to commit on the active frame.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn('md:col-span-5 grid grid-cols-2 gap-3')}>
            <PresetStat
              value={String(samplePresets.length)}
              labelKey="presets.hero.statTotal"
              defaultLabel="Curated"
              accent="#a78bfa"
            />
            <PresetStat
              value="32-bit"
              labelKey="presets.hero.statDepth"
              defaultLabel="Float depth"
              accent="#22d3ee"
            />
            <PresetStat
              value="100%"
              labelKey="presets.hero.statReversible"
              defaultLabel="Reversible"
              accent="#34d399"
            />
            <PresetStat
              value="∞"
              labelKey="presets.hero.statStack"
              defaultLabel="Stack depth"
              accent="#f472b6"
            />
          </div>
        </div>
      </section>

      {/* Category chip rail */}
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap mb-6')}>
        {CATEGORIES.map((c) => {
          const active = category === c.id
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              data-mol-id={`presets-cat-${c.id}`}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                'rounded-full text-[11px] font-mono font-bold uppercase tracking-widest border transition-colors',
                active
                  ? 'bg-[var(--photo-accent)]/20 text-[var(--photo-panel-text-highlight)] border-[var(--photo-accent)]/60'
                  : 'bg-transparent text-[var(--photo-text-muted)] border-[var(--photo-border)] hover:text-[var(--photo-text)] hover:border-[var(--photo-accent)]/40',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                {c.icon}
              </span>
              {t(`presets.category.${c.id}`, {}, { defaultValue: c.defaultLabel })}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div
          className={cm.cn(
            cm.sp('py', 16),
            cm.textCenter,
            'rounded-2xl border border-[var(--photo-border)] bg-[var(--photo-surface)]',
          )}
          data-mol-id="presets-loading"
        >
          <p className={cm.cn('text-sm italic text-[var(--photo-text-muted)]')}>
            {t('presets.loading', {}, { defaultValue: 'Loading presets…' })}
          </p>
        </div>
      ) : loadError ? (
        <div
          className={cm.cn(
            cm.sp('py', 16),
            cm.textCenter,
            'rounded-2xl border border-[var(--photo-border)] bg-[var(--photo-surface)]',
          )}
          data-mol-id="presets-error"
        >
          <p className={cm.cn('text-sm italic text-[var(--mol-color-error)]')}>
            {t(
              'presets.error',
              { error: loadError },
              { defaultValue: 'Could not load presets: {{error}}' },
            )}
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('py', 16),
            cm.textCenter,
            'rounded-2xl border border-[var(--photo-border)] bg-[var(--photo-surface)]',
          )}
          data-mol-id="presets-empty"
        >
          <span
            className={cm.cn(
              'material-symbols-outlined text-[48px] text-[var(--photo-text-muted)]',
            )}
            aria-hidden="true"
          >
            palette
          </span>
          <p className={cm.cn('text-sm italic text-[var(--photo-text-muted)] mt-3')}>
            {t('presets.empty', {}, { defaultValue: 'No presets in this category yet.' })}
          </p>
        </div>
      ) : (
        <div
          className={cm.cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4')}
          data-mol-id="presets-grid"
        >
          {visible.map((preset) => (
            <PresetTile
              key={preset.id}
              preset={preset}
              active={activePresetId === preset.id}
              onApply={(id) => setActivePresetId(id === activePresetId ? null : id)}
            />
          ))}
        </div>
      )}
    </PhotoEditorLayout>
  )
}

interface PresetStatProps {
  value: string
  labelKey: string
  defaultLabel: string
  accent: string
}

function PresetStat({ value, labelKey, defaultLabel, accent }: PresetStatProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        'rounded-xl bg-surface/5 backdrop-blur border border-surface/10 p-3 hover:-translate-y-0.5 transition-transform',
      )}
    >
      <p
        className={cm.cn('text-2xl font-extrabold tabular-nums tracking-tight')}
        style={{ color: accent }}
      >
        {value}
      </p>
      <p
        className={cm.cn(
          'text-[10px] font-mono font-bold uppercase tracking-widest text-white/70 mt-1',
        )}
      >
        {t(labelKey, {}, { defaultValue: defaultLabel })}
      </p>
    </div>
  )
}

export default Presets
