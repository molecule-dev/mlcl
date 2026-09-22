import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatTriad } from '../components/StatTriad.js'

interface TrainingModuleApi {
  id: string
  title: string
  description?: string | null
  duration_minutes?: number | null
}

interface TrainingProgressApi {
  id: string
  module_id: string
  started_at?: string | null
  completed_at?: string | null
  quiz_score?: number | null
}

// Accent colours that also render as TEXT on a wash of themselves, so each is
// the readable step of its hue rather than the 500/600 fill shade. The originals
// measured 2.16-3.55:1 against those washes; these clear 4.5:1 on white and on
// the wash. Verified with scripts/contrast.mjs.
const COLORS = ['#b91c1c', '#0f766e', '#6d28d9', '#92400e', '#166534']
const ICONS = [
  'shield_lock',
  'engineering',
  // `palette`, not `product_design`: the shared Material Symbols subset has no
  // `product_design` ligature, and a missing ligature renders the RAW name as
  // giant unstyled text across the card (seen at 390px).
  'palette',
  'campaign',
  'sentiment_very_satisfied',
]

function colorFor(idx: number): string {
  return COLORS[idx % COLORS.length]
}

function iconFor(idx: number): string {
  return ICONS[idx % ICONS.length]
}

export function Training() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [modules, setModules] = useState<TrainingModuleApi[]>([])
  const [progress, setProgress] = useState<TrainingProgressApi[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!http) return
    setLoading(true)
    Promise.all([
      http
        .get<TrainingModuleApi[]>('/api/training-modules')
        .then((r) => r.data ?? [])
        .catch(() => []),
      http
        .get<TrainingProgressApi[]>('/api/training-progress')
        .then((r) => r.data ?? [])
        .catch(() => []),
    ]).then(([m, p]) => {
      setModules(m)
      setProgress(p)
      setLoading(false)
    })
  }, [http])

  const progressByModule = useMemo(() => {
    const map = new Map<string, TrainingProgressApi>()
    for (const p of progress) map.set(p.module_id, p)
    return map
  }, [progress])

  const decorated = useMemo(() => {
    return modules.map((m, idx) => {
      const p = progressByModule.get(m.id)
      let pct = 0
      let badge: string = t('training.badge.notStarted', {}, { defaultValue: 'Not started' })
      if (p?.completed_at) {
        pct = 100
        badge = t('common.complete', {}, { defaultValue: 'Complete' })
      } else if (p?.started_at) {
        pct = 50
        badge = t('status.inProgress', {}, { defaultValue: 'In progress' })
      }
      const color = colorFor(idx)
      const icon = iconFor(idx)
      return { module: m, color, icon, pct, badge }
    })
  }, [modules, progressByModule, t])

  const inProgress = decorated.filter((d) => d.pct > 0 && d.pct < 100).length
  const complete = decorated.filter((d) => d.pct >= 100).length

  return (
    <div data-mol-id="page-training" className={cm.flex({ direction: 'col', gap: 'lg' })}>
      <header>
        <p
          className="text-[11px] font-black uppercase tracking-[0.3em]"
          style={{ color: 'var(--mol-color-secondary)' }}
        >
          {t('training.eyebrow', {}, { defaultValue: 'Onboarding · Training' })}
        </p>
        <h1 className={cm.cn(cm.fontWeight('bold'), cm.sp('mt', 2), 'text-3xl tracking-tight')}>
          {t('training.title', {}, { defaultValue: 'Skills, tools, and stories — at your pace.' })}
        </h1>
        <p className={cm.cn(cm.textMuted, cm.sp('mt', 2), 'max-w-2xl')}>
          {t(
            'training.subtitle',
            {},
            {
              defaultValue:
                'Modules unlock at 30/60/90 to match your role. Required ones come first.',
            },
          )}
        </p>
      </header>

      <StatTriad
        items={[
          {
            id: 'all',
            label: t('training.stat.all', {}, { defaultValue: 'Modules assigned' }),
            value: String(decorated.length),
            icon: 'school',
            accent: '#0f766e',
          },
          {
            id: 'inprog',
            label: t('status.inProgress', {}, { defaultValue: 'In progress' }),
            value: String(inProgress),
            icon: 'pending',
            accent: '#92400e',
          },
          {
            id: 'done',
            label: t('common.completed', {}, { defaultValue: 'Completed' }),
            value: String(complete),
            icon: 'verified',
            accent: '#166534',
          },
        ]}
      />

      {loading ? (
        <p className={cm.textMuted}>
          {t('training.loading', {}, { defaultValue: 'Loading modules…' })}
        </p>
      ) : decorated.length === 0 ? (
        <p className={cm.textMuted}>
          {t('training.empty', {}, { defaultValue: 'No training modules yet.' })}
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
          }}
        >
          {decorated.map(({ module, color, icon, pct, badge }) => (
            <Link
              key={module.id}
              to={`/training/${module.id}`}
              data-mol-id={`training-card-${module.id}`}
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.sp('p', 6),
                'transition-all duration-200 hover:-translate-y-1 hover:shadow-md',
              )}
              style={{
                background: 'var(--color-surface, var(--mol-color-surface))',
                borderRadius: '16px',
                border: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
                borderTop: `3px solid ${color}`,
              }}
            >
              <div className={cm.cn(cm.flex({ align: 'start', justify: 'between' }))}>
                <div
                  className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: `color-mix(in srgb, ${color} 14%, transparent)`,
                    color,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                    {icon}
                  </span>
                </div>
                <span
                  className="text-[10px] font-black uppercase tracking-[0.18em]"
                  style={{
                    color,
                    background: `color-mix(in srgb, ${color} 14%, transparent)`,
                    padding: '4px 12px',
                    borderRadius: '999px',
                  }}
                >
                  {badge}
                </span>
              </div>
              <h3 className={cm.cn(cm.fontWeight('bold'), 'text-lg tracking-tight')}>
                {module.title}
              </h3>
              {module.description && (
                <p className={cm.cn(cm.textMuted, 'text-sm')}>{module.description}</p>
              )}

              <div
                style={{
                  marginTop: '8px',
                  height: '6px',
                  borderRadius: '999px',
                  background: 'var(--embark-progress-track, var(--mol-color-background-tertiary))',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: color,
                    transition: 'width 500ms ease-out',
                  }}
                />
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'text-xs')}>
                <span className={cm.textMuted}>
                  {module.duration_minutes
                    ? t(
                        'training.duration',
                        { mins: module.duration_minutes },
                        { defaultValue: `${module.duration_minutes} min` },
                      )
                    : ''}
                </span>
                <span className={cm.fontWeight('bold')} style={{ color }}>
                  {pct}%
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
