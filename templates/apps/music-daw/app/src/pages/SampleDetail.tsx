import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { unwrapSingle } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SampleDetailRow {
  id: string
  user_id: string | null
  name: string
  pack: string
  bpm: number
  key: string
  duration_seconds: number
  category: string
  cover_index: number
  is_loop: boolean
  url: string
  is_public: boolean
  tags?: string[]
  waveform_peaks?: number[] | null
}

const FALLBACK_PEAKS = Array.from({ length: 96 }, (_, i) => {
  const phase = (i / 96) * Math.PI * 4
  const envelope = Math.sin((i / 96) * Math.PI)
  return 0.4 + Math.abs(Math.sin(phase) * envelope) * 0.6
})

export function SampleDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [detail, setDetail] = useState<SampleDetailRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [busy, setBusy] = useState<'loop' | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get<unknown>(`/api/samples/${id}`)
      .then((res) => {
        if (cancelled) return
        const row = unwrapSingle<SampleDetailRow>(res.data)
        if (!row) {
          setError(t('sampleDetail.notFound', {}, { defaultValue: 'Sample not found.' }))
        } else {
          setDetail(row)
        }
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError(t('sampleDetail.notFound', {}, { defaultValue: 'Sample not found.' }))
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const handlePreview = () => {
    setPreviewing((p) => !p)
    setStatusMsg(
      t('sampleDetail.previewToggled', {}, { defaultValue: 'Preview transport toggled.' }),
    )
  }

  const handleToggleLoop = async () => {
    if (!detail || detail.user_id == null) {
      setStatusMsg(
        t(
          'sampleDetail.libraryReadOnly',
          {},
          {
            defaultValue: 'Library samples are read-only — duplicate to your collection to edit.',
          },
        ),
      )
      return
    }
    setBusy('loop')
    try {
      const res = await http.put<unknown>(`/api/samples/${detail.id}`, {
        is_loop: !detail.is_loop,
      })
      const updated = unwrapSingle<SampleDetailRow>(res.data)
      if (updated) setDetail(updated)
      setStatusMsg(t('sampleDetail.loopUpdated', {}, { defaultValue: 'Loop flag saved.' }))
    } catch (error) {
      setStatusMsg(
        t('sampleDetail.loopFailed', {}, { defaultValue: 'Failed to update loop flag.' }),
      )
      logError('sampleDetail.toggleLoop', error)
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 8))}>
        <p className={cm.cn('text-sm', cm.textMuted)}>
          {t('sampleDetail.loading', {}, { defaultValue: 'Loading sample…' })}
        </p>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div
        className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 8), 'space-y-4')}
      >
        <Link
          to="/samples"
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('nav.library', {}, { defaultValue: 'Library' })}
        </Link>
        <p
          role="alert"
          className={cm.cn(
            'text-sm text-on-error-container bg-error-container px-3 py-2 rounded-lg',
          )}
        >
          {error ?? t('sampleDetail.notFound', {}, { defaultValue: 'Sample not found.' })}
        </p>
      </div>
    )
  }

  const peaks =
    detail.waveform_peaks && detail.waveform_peaks.length > 0
      ? detail.waveform_peaks
      : FALLBACK_PEAKS
  const sliceIndices = peaks.map((_, i) => (i % 12 === 0 ? i : -1)).filter((i) => i >= 0)

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 8), 'space-y-8')}>
      <header className={cm.cn('flex items-center gap-2')}>
        <Link
          to="/samples"
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-on-surface flex items-center gap-1',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('nav.library', {}, { defaultValue: 'Library' })}
        </Link>
      </header>

      <section
        className={cm.cn('relative overflow-hidden rounded-[2rem] text-white shadow-2xl')}
        style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 50%, #ec4899 100%)',
          minHeight: '280px',
        }}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'relative z-10 p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-end min-h-[280px]',
          )}
        >
          <div className={cm.cn('lg:col-span-8')}>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-white/70')}>
              {detail.pack}
            </p>
            <h1
              className={cm.cn(
                'text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05] mt-2',
              )}
            >
              {detail.name}
            </h1>
            <div
              className={cm.cn(
                'mt-4 flex items-center gap-3 flex-wrap text-[13px] font-mono tabular-nums text-white/85',
              )}
            >
              <span
                className={cm.cn(
                  'px-3 py-1 rounded-full bg-surface/20 backdrop-blur-md font-black uppercase tracking-widest',
                )}
              >
                {detail.category}
              </span>
              {detail.bpm > 0 && <span>{detail.bpm} BPM</span>}
              {detail.bpm > 0 && <span aria-hidden="true">·</span>}
              <span>{detail.key || '—'}</span>
              <span aria-hidden="true">·</span>
              <span>{detail.duration_seconds.toFixed(1)}s</span>
              {detail.is_loop && (
                <span
                  className={cm.cn(
                    'px-2 py-0.5 rounded-full bg-surface/20 text-[10px] font-black uppercase tracking-widest',
                  )}
                >
                  {t('sampleTable.loopBadge', {}, { defaultValue: 'Loop' })}
                </span>
              )}
            </div>
          </div>
          <div className={cm.cn('lg:col-span-4 flex justify-end')}>
            <button
              onClick={handlePreview}
              type="button"
              className={cm.cn(
                'w-20 h-20 rounded-full bg-surface text-on-surface flex items-center justify-center shadow-2xl hover:scale-105 transition-transform',
              )}
              aria-label={t('sampleDetail.previewAria', {}, { defaultValue: 'Preview sample' })}
              aria-pressed={previewing}
            >
              <span className={cm.cn('material-symbols-outlined text-[44px]')}>
                {previewing ? 'pause' : 'play_arrow'}
              </span>
            </button>
          </div>
        </div>
      </section>

      <section
        className={cm.cn(
          'rounded-2xl bg-surface-container-lowest border border-outline-variant p-6 space-y-4',
        )}
      >
        <div className={cm.cn('flex items-center justify-between')}>
          <h2 className={cm.cn('text-sm font-extrabold tracking-tight')}>
            {t('sampleDetail.waveformHeading', {}, { defaultValue: 'Waveform' })}
          </h2>
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            48 kHz · 24 bit
          </p>
        </div>
        <div
          className={cm.cn('relative h-32 rounded-xl flex items-center px-3 overflow-hidden')}
          style={{ background: 'rgba(139,92,246,0.06)' }}
        >
          <div className={cm.cn('flex-1 h-full flex items-center justify-between')}>
            {peaks.map((amp, i) => (
              <span
                key={i}
                className={cm.cn('rounded-full')}
                style={{
                  width: '3px',
                  height: `${amp * 100}%`,
                  backgroundColor: sliceIndices.includes(i)
                    ? 'var(--daw-secondary)'
                    : 'var(--daw-primary)',
                  opacity: 0.85,
                }}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
        <div className={cm.cn('flex items-center gap-2 flex-wrap')}>
          <button
            onClick={handleToggleLoop}
            disabled={busy === 'loop'}
            type="button"
            className={cm.cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-surface-container hover:bg-surface-container-high transition-colors disabled:opacity-60',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              all_inclusive
            </span>
            {detail.is_loop
              ? t('sampleDetail.loopOn', {}, { defaultValue: 'Loop · on' })
              : t('sampleDetail.loopOff', {}, { defaultValue: 'Loop · off' })}
          </button>
          <a
            href={detail.url}
            download
            className={cm.cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-surface-container hover:bg-surface-container-high transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              download
            </span>
            {t('common.download', {}, { defaultValue: 'Download' })}
          </a>
        </div>
        {statusMsg && (
          <p role="status" className={cm.cn('text-xs text-on-surface-variant')}>
            {statusMsg}
          </p>
        )}
      </section>

      <section className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-4')}>
        <KpiCard
          label={t('sampleDetail.kpi.bpm', {}, { defaultValue: 'BPM' })}
          value={detail.bpm > 0 ? detail.bpm.toString() : '—'}
          accent="var(--daw-primary)"
        />
        <KpiCard
          label={t('sampleDetail.kpi.key', {}, { defaultValue: 'Key' })}
          value={detail.key || '—'}
          accent="var(--daw-secondary)"
        />
        <KpiCard
          label={t('form.duration', {}, { defaultValue: 'Duration' })}
          value={`${detail.duration_seconds.toFixed(1)}s`}
          accent="var(--daw-track-audio)"
        />
      </section>

      {detail.tags && detail.tags.length > 0 && (
        <section
          className={cm.cn(
            'rounded-2xl bg-surface-container-lowest border border-outline-variant p-6',
          )}
        >
          <h2 className={cm.cn('text-sm font-extrabold tracking-tight mb-3')}>
            {t('form.tags', {}, { defaultValue: 'Tags' })}
          </h2>
          <div className={cm.cn('flex items-center gap-2 flex-wrap')}>
            {detail.tags.map((tag) => (
              <span
                key={tag}
                className={cm.cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-primary-container text-on-primary-container',
                )}
              >
                #{tag}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        'rounded-2xl bg-surface-container-lowest p-5 hover:-translate-y-0.5 transition-transform border-l-4',
      )}
      style={{ borderColor: accent }}
    >
      <p
        className={cm.cn(
          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </p>
      <p className={cm.cn('text-3xl font-extrabold tabular-nums mt-1')} style={{ color: accent }}>
        {value}
      </p>
    </div>
  )
}
