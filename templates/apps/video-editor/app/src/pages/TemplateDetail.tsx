import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { unwrapSingle } from '@molecule/app-http'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { RushesLayout } from '../components/RushesLayout.js'
import { TimelinePreview } from '../components/TimelinePreview.js'

interface TemplateRow {
  id: string
  name: string
  description?: string | null
  cover_image_url?: string | null
  category?: string | null
  is_premium?: boolean | null
  project_snapshot?: {
    width?: number
    height?: number
    fps?: number
    tracks?: Array<{ name?: string; type?: string; position?: number }>
  } | null
  created_at?: string | null
}

const SWATCH = 'linear-gradient(135deg, var(--video-cta-from), var(--video-cta-to))'

function aspectFromSnapshot(snap?: TemplateRow['project_snapshot']): string {
  const w = snap?.width
  const h = snap?.height
  if (!w || !h) return '16:9'
  if (w === h) return '1:1'
  if (w / h > 16 / 9 + 0.5) return '21:9'
  if (h > w) return '9:16'
  return '16:9'
}

export function TemplateDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [tpl, setTpl] = useState<TemplateRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await http.get(`/api/templates/${id}`)
        if (cancelled) return
        const data = unwrapSingle<TemplateRow>(res.data)
        if (!data || !data.id) throw new Error('Template not found')
        setTpl(data as TemplateRow)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load template.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, http])

  async function handleApply() {
    if (!tpl) return
    setApplying(true)
    setError(null)
    try {
      const res = await http.post(`/api/templates/${tpl.id}/use`, {})
      const created = unwrapSingle<{ id?: string }>(res.data)
      if (!created?.id) throw new Error('Project creation failed')
      void track({
        name: 'template.applied',
        properties: { template_id: tpl.id, project_id: created.id },
      })
      navigate(`/editor/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to use template.')
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <RushesLayout
        title={t('templateDetail.loading', {}, { defaultValue: 'Loading template…' })}
        breadcrumb="// templates"
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-[var(--video-text-muted-alt)] font-mono')}>
          {t('templateDetail.loading', {}, { defaultValue: 'Loading template…' })}
        </p>
      </RushesLayout>
    )
  }
  if (error || !tpl) {
    return (
      <RushesLayout
        title={t('templateDetail.error', {}, { defaultValue: 'Template unavailable' })}
        breadcrumb="// templates"
      >
        <div className={cm.stack(4)}>
          <p
            role="alert"
            data-mol-id="template-error"
            className={cm.cn(cm.textSize('sm'), 'text-[var(--video-error-text)] font-mono')}
          >
            {error ?? t('templateDetail.notFound', {}, { defaultValue: 'Template not found.' })}
          </p>
          <Link
            to="/templates"
            className={cm.cn(
              'font-mono text-[11px] uppercase tracking-widest text-[var(--video-link)] hover:text-[var(--video-link-hover)]',
            )}
          >
            ← {t('templateDetail.back', {}, { defaultValue: 'Back to templates' })}
          </Link>
        </div>
      </RushesLayout>
    )
  }

  const snap = tpl.project_snapshot ?? {}
  const aspect = aspectFromSnapshot(snap)
  const tracks = snap.tracks ?? []

  return (
    <RushesLayout
      title={tpl.name}
      breadcrumb={t(
        'templateDetail.crumb',
        { id: tpl.id.slice(0, 8) },
        { defaultValue: '// templates › {{id}}' },
      )}
    >
      <div data-mol-id="template-detail" className={cm.cn(cm.stack(6))}>
        <div className={cm.cn('grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6')}>
          <section className={cm.cn(cm.stack(4))}>
            <div
              className={cm.cn(
                'relative aspect-video rounded-2xl border border-[var(--video-border-subtle)] overflow-hidden flex items-center justify-center',
              )}
              style={{ background: SWATCH }}
            >
              <div
                className={cm.cn(
                  'absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.18)_1px,transparent_0)] [background-size:24px_24px] opacity-50',
                )}
              />
              <div
                className={cm.cn(
                  'relative z-10 flex flex-col items-center text-center text-white/90 gap-3 px-6',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[64px]')}>auto_awesome</span>
                <p
                  data-mol-id="template-name"
                  className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'tracking-tight')}
                >
                  {tpl.name}
                </p>
                <p
                  className={cm.cn('font-mono text-[10px] uppercase tracking-widest text-white/70')}
                >
                  {aspect} · {snap.fps ?? 30}fps
                </p>
              </div>
            </div>
            <TimelinePreview
              caption={t(
                'templateDetail.timelineCaption',
                {},
                { defaultValue: 'Frame-paced template — drop in your clips and the timing stays.' },
              )}
            />
          </section>

          <aside className={cm.cn(cm.stack(4))}>
            <div
              className={cm.cn(
                cm.sp('p', 5),
                cm.stack(3),
                'rounded-xl bg-[var(--video-panel-bg)] border border-[var(--video-border-subtle)]',
              )}
            >
              <span
                className={cm.cn(
                  'font-mono text-[10px] uppercase tracking-widest text-[var(--video-link)]',
                )}
              >
                {tpl.category ?? 'general'}
              </span>
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  'tracking-tight text-[var(--video-text-primary)]',
                )}
              >
                {tpl.name}
              </h2>
              {tpl.description && (
                <p className={cm.cn(cm.textSize('sm'), 'text-[var(--video-text-muted-alt)]')}>
                  {tpl.description}
                </p>
              )}
              <ul className={cm.cn(cm.stack(2), cm.textSize('xs'))}>
                <Row
                  label={t('templateDetail.aspect', {}, { defaultValue: 'Aspect' })}
                  value={aspect}
                />
                <Row
                  label={t('templateDetail.resolution', {}, { defaultValue: 'Resolution' })}
                  value={`${snap.width ?? 1920}×${snap.height ?? 1080}`}
                />
                <Row
                  label={t('templateDetail.fps', {}, { defaultValue: 'Frame rate' })}
                  value={`${snap.fps ?? 30} fps`}
                />
                <Row
                  label={t('templateDetail.trackCount', {}, { defaultValue: 'Tracks' })}
                  value={String(tracks.length)}
                />
              </ul>
            </div>

            <button
              type="button"
              data-mol-id="template-apply"
              onClick={handleApply}
              disabled={applying}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-lg bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] text-white hover:opacity-90 transition-opacity disabled:opacity-50',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>auto_awesome</span>
              <span>
                {applying
                  ? t('templateDetail.applying', {}, { defaultValue: 'Creating project…' })
                  : t('templateDetail.apply', {}, { defaultValue: 'Use this template' })}
              </span>
            </button>
            <Link
              to="/templates"
              className={cm.cn(
                cm.fontWeight('medium'),
                cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg border border-[var(--video-border-subtle)] hover:border-[var(--video-cta-from)]/40 text-[var(--video-text-primary)] transition-colors',
              )}
            >
              ← {t('common.browseTemplates', {}, { defaultValue: 'Browse templates' })}
            </Link>
          </aside>
        </div>

        {tracks.length > 0 && (
          <section
            className={cm.cn(
              cm.sp('p', 5),
              cm.stack(4),
              'rounded-xl bg-[var(--video-panel-bg)] border border-[var(--video-border-subtle)]',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-[var(--video-text-primary)]',
              )}
            >
              {t(
                'templateDetail.tracks',
                {},
                { defaultValue: 'Tracks bundled with this template' },
              )}
            </h3>
            <ol
              className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3')}
              data-mol-id="template-tracks"
            >
              {tracks.map((trk, idx) => (
                <li
                  key={idx}
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.stack(2),
                    'rounded-md bg-[var(--video-input-bg)] border border-[var(--video-border-subtle)]',
                  )}
                >
                  <p
                    className={cm.cn(
                      'font-mono text-[10px] uppercase tracking-widest text-[var(--video-link)]',
                    )}
                  >
                    {t(
                      'templateDetail.trackNum',
                      { num: idx + 1 },
                      { defaultValue: 'Track 0{{num}}' },
                    )}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-[var(--video-text-primary)]',
                    )}
                  >
                    {trk.name ?? `Track ${idx + 1}`}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-[var(--video-text-muted-alt)]')}>
                    {trk.type ?? 'video'}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </RushesLayout>
  )
}

interface RowProps {
  label: string
  value: string
}
function Row({ label, value }: RowProps) {
  const cm = getClassMap()
  return (
    <li className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
      <span className={cm.cn('font-mono uppercase tracking-widest text-[var(--video-text-dim)]')}>
        {label}
      </span>
      <span className={cm.cn('font-mono text-[var(--video-text-primary)]')}>{value}</span>
    </li>
  )
}

export default TemplateDetail
