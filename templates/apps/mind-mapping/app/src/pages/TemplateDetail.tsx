import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface MapTemplate {
  id: string
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

export function TemplateDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [tpl, setTpl] = useState<MapTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get<MapTemplate>(`/templates/${id}`)
      .then((res) => {
        if (cancelled) return
        setTpl(res?.data ?? null)
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setError(
          t('templateDetail.loadError', {}, { defaultValue: 'Could not load this template.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const summary = useMemo(() => (tpl ? parseSnapshot(tpl.snapshot) : null), [tpl])

  const handleUseTemplate = async () => {
    if (!id) return
    setBusy(true)
    try {
      const res = await http.post<{ id: string }>(`/templates/${id}/instantiate`, {})
      const newId = res?.data?.id
      if (newId) {
        void track({
          name: 'map.created',
          properties: { map_id: newId, source: 'template', template_id: id },
        })
        navigate(`/maps/${newId}`)
      }
    } catch (error) {
      logError('templateDetail.instantiate', error)
      setError(
        t(
          'templateDetail.instantiateError',
          {},
          { defaultValue: 'Could not create a map from this template.' },
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  const palette = PALETTES[0]

  if (loading) {
    return (
      <div className={cm.cn(cm.stack(8), 'max-w-4xl')}>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.textCenter, cm.sp('py', 12))}>
          {t('templateDetail.loading', {}, { defaultValue: 'Loading template…' })}
        </p>
      </div>
    )
  }

  if (!tpl) {
    return (
      <div className={cm.cn(cm.stack(6), 'max-w-3xl')}>
        <Link
          to="/templates"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'text-primary uppercase tracking-widest hover:underline',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>arrow_back</span>
          {t('templateDetail.backToTemplates', {}, { defaultValue: 'All templates' })}
        </Link>
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-error-container/30 text-on-error-container border border-error/30',
          )}
        >
          {error || t('templateDetail.notFound', {}, { defaultValue: 'Template not found.' })}
        </div>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.stack(8), 'max-w-4xl')}>
      <Link
        to="/templates"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'text-primary uppercase tracking-widest hover:underline',
        )}
      >
        <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>arrow_back</span>
        {t('templateDetail.backToTemplates', {}, { defaultValue: 'All templates' })}
      </Link>

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

      <section
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] text-on-primary shadow-xl bg-gradient-to-br',
          palette,
        )}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
          )}
          aria-hidden
        />
        <div
          className={cm.cn(
            'absolute -left-24 -top-24 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
          )}
          aria-hidden
        />
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'lg' }),
            cm.sp('p', 10),
            'relative md:flex-row md:items-center md:justify-between',
          )}
        >
          <div className={cm.cn(cm.stack(4), 'max-w-xl')}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                'self-start bg-surface/20 backdrop-blur-md text-[10px] uppercase tracking-widest rounded-full',
              )}
            >
              <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                {iconFor(tpl.name)}
              </span>
              {tpl.is_system
                ? t('templateDetail.systemEyebrow', {}, { defaultValue: 'Built-in template' })
                : t('templateDetail.userEyebrow', {}, { defaultValue: 'Your template' })}
            </span>
            <h1
              className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tighter')}
              data-mol-id="template-detail-title"
            >
              {tpl.name}
            </h1>
            {tpl.description && (
              <p className={cm.cn(cm.textSize('lg'), 'text-on-primary/85')}>{tpl.description}</p>
            )}
            <div className={cm.flex({ gap: 'sm' })}>
              <button
                type="button"
                onClick={handleUseTemplate}
                disabled={busy}
                data-mol-id="template-detail-use-button"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  'rounded-xl bg-on-primary text-primary shadow-md hover:scale-[1.02] transition-transform disabled:opacity-60',
                )}
              >
                {busy
                  ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                  : t('templateDetail.useTemplate', {}, { defaultValue: 'Use this template' })}
              </button>
              <Link
                to="/templates"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  'rounded-xl bg-surface/15 backdrop-blur-md text-on-primary border border-surface/30 hover:bg-surface/25 transition-colors',
                )}
              >
                {t('templateDetail.browseMore', {}, { defaultValue: 'Browse more' })}
              </Link>
            </div>
          </div>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(28),
              cm.h(28),
              'relative rounded-3xl bg-surface/25 backdrop-blur-md',
            )}
          >
            <span
              className={cm.cn('text-6xl material-symbols-outlined text-on-primary')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {iconFor(tpl.name)}
            </span>
          </span>
        </div>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 8),
          cm.stack(4),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
        )}
      >
        <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2')}>
          <div
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-2xl bg-surface-container-low border border-outline-variant/30',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest font-bold text-on-surface-variant mb-1',
              )}
            >
              {t('templateDetail.nodes', {}, { defaultValue: 'Pre-seeded nodes' })}
            </p>
            <p
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                'text-on-surface tabular-nums',
              )}
            >
              {summary?.nodes.length ?? 0}
            </p>
          </div>
          <div
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-2xl bg-surface-container-low border border-outline-variant/30',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest font-bold text-on-surface-variant mb-1',
              )}
            >
              {t('nav.connections', {}, { defaultValue: 'Connections' })}
            </p>
            <p
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                'text-on-surface tabular-nums',
              )}
            >
              {summary?.connections.length ?? 0}
            </p>
          </div>
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'templateDetail.editableHint',
            {},
            {
              defaultValue:
                'Every node and edge is fully editable once you instantiate the template.',
            },
          )}
        </p>
      </section>
    </div>
  )
}

export default TemplateDetail
