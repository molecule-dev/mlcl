import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { KeyframeTimelineMini } from '../components/KeyframeTimelineMini.js'
import { ProjectCard, type ProjectSummary } from '../components/ProjectCard.js'
import { type ProjectStatus, StatusPill } from '../components/StatusPill.js'
import { VivaceWordmark } from '../components/VivaceWordmark.js'

interface ApiProject {
  id: string
  name: string
  duration?: number | string
  updated_at?: string
  created_at?: string
}

const SWATCHES = [
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #22c55e, #06b6d4)',
  'linear-gradient(135deg, #06b6d4, #22c55e)',
  'linear-gradient(135deg, #8b5cf6, #ec4899)',
]

const ICONS = ['bolt', 'view_carousel', 'bar_chart', 'auto_awesome']

function formatTimecode(durationSeconds: number): string {
  const total = Math.max(0, Math.floor(durationSeconds))
  const hh = Math.floor(total / 3600)
  const mm = Math.floor((total % 3600) / 60)
  const ss = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

function formatTimeAgo(iso: string | undefined): string {
  if (!iso) return ''
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return ''
  const seconds = Math.floor((Date.now() - then) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function projectStatus(p: ApiProject): ProjectStatus {
  const updated = Date.parse(String(p.updated_at ?? p.created_at ?? ''))
  if (Number.isNaN(updated)) return 'shared'
  return 'shared'
}

function toSummary(p: ApiProject, idx: number): ProjectSummary {
  const durSec = Number(p.duration ?? 0)
  return {
    id: p.id,
    name: p.name,
    duration: formatTimecode(durSec),
    lastEdited: formatTimeAgo(p.updated_at ?? p.created_at),
    status: projectStatus(p),
    swatch: SWATCHES[idx % SWATCHES.length],
    icon: ICONS[idx % ICONS.length],
  }
}

export function SharePreview() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { state, isAuthenticated } = useAuth()
  const { token } = useParams<{ token: string }>()
  const [related, setRelated] = useState<ApiProject[] | null>(null)
  const [relatedError, setRelatedError] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    let cancelled = false
    // Public share preview must NOT hit /api/projects without auth — the
    // request would 401 and surface as a noisy console error / failed
    // resource on the public route. Gate on the auth bond's reactive state
    // (the bearer token is in-memory + httpOnly cookie, never localStorage —
    // see config.ts [M1-1]), not a localStorage key that is always absent.
    if (!state.initialized) return // wait for auth bootstrap before deciding
    if (!isAuthenticated) {
      setRelated([])
      setRelatedError(
        t('sharePreview.relatedError', {}, { defaultValue: 'Sign in to see related animations.' }),
      )
      return
    }
    http
      .get<ApiProject[]>('/api/projects')
      .then((res) => {
        if (cancelled) return
        const arr = Array.isArray(res.data) ? res.data : []
        setRelated(arr.slice(0, 3))
      })
      .catch(() => {
        if (cancelled) return
        setRelatedError(
          t(
            'sharePreview.relatedError',
            {},
            { defaultValue: 'Sign in to see related animations.' },
          ),
        )
        setRelated([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t, state.initialized, isAuthenticated])

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-[var(--anim-background)] text-[var(--anim-text)] font-body',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          'h-16 border-b border-[var(--anim-border)] bg-[var(--anim-surface)]/80 backdrop-blur-md sticky top-0 z-30',
        )}
      >
        <VivaceWordmark size="md" to="/" />
        <Link
          to="/signup"
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', gap: 2 }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'rounded-lg bg-gradient-to-r from-[var(--anim-primary)] to-[var(--anim-secondary)] text-white hover:opacity-90 transition-opacity',
          )}
        >
          <span>
            {t(
              'sharePreview.tryFree',
              { appName: APP_NAME },
              { defaultValue: 'Try {{appName}} free' },
            )}
          </span>
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_forward</span>
        </Link>
      </header>

      <main className={cm.cn(cm.sp('px', 6), cm.sp('py', 10), 'max-w-[1100px] mx-auto w-full')}>
        <div className={cm.cn('grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6')}>
          <div className={cm.stack(6)}>
            <div
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(4),
                'rounded-2xl bg-[var(--anim-surface)] border border-[var(--anim-border)]',
              )}
            >
              <header className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 3 }))}>
                <div>
                  <p
                    className={cm.cn(
                      'font-mono text-[10px] uppercase tracking-widest text-[var(--anim-primary)]',
                    )}
                  >
                    {t('sharePreview.shared', {}, { defaultValue: '// shared via public preview' })}
                  </p>
                  <h1
                    className={cm.cn(
                      cm.textSize('2xl'),
                      cm.fontWeight('bold'),
                      cm.sp('mt', 1),
                      'font-headline text-[var(--anim-text)] tracking-tight',
                    )}
                  >
                    {t(
                      'sharePreview.title',
                      { token: token ?? '' },
                      { defaultValue: 'Animation preview' },
                    )}
                  </h1>
                </div>
                <StatusPill status="shared" />
              </header>

              <div
                className={cm.cn(
                  'aspect-video rounded-xl relative overflow-hidden ring-1 ring-[color-mix(in_srgb,var(--anim-primary)_40%,transparent)] shadow-[0_0_60px_-10px_color-mix(in_srgb,var(--anim-primary)_50%,transparent)]',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--anim-canvas-bg) 0%, var(--anim-surface) 100%), radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--anim-primary) 40%, transparent), transparent 60%)',
                }}
              >
                <div className={cm.cn('absolute inset-0 flex items-center justify-center')}>
                  <button
                    type="button"
                    onClick={() => setPlaying((v) => !v)}
                    data-mol-id="share-play-toggle"
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.flex({ align: 'center', gap: 2 }),
                      cm.sp('px', 6),
                      cm.sp('py', 3),
                      'rounded-full bg-gradient-to-r from-[var(--anim-primary)] to-[var(--anim-secondary)] text-white shadow-[0_20px_60px_-10px_color-mix(in_srgb,var(--anim-primary)_60%,transparent)] hover:scale-105 transition-transform',
                    )}
                  >
                    <span className="material-symbols-outlined">
                      {playing ? 'pause' : 'play_arrow'}
                    </span>
                    <span>
                      {playing
                        ? t('sharePreview.pause', {}, { defaultValue: 'Pause preview' })
                        : t('sharePreview.play', {}, { defaultValue: 'Play preview' })}
                    </span>
                  </button>
                </div>
                <div className={cm.cn('absolute bottom-3 left-3 right-3 flex items-center gap-2')}>
                  <button
                    type="button"
                    onClick={() => setPlaying((v) => !v)}
                    aria-label={t(
                      'sharePreview.toggleControl',
                      {},
                      { defaultValue: 'Toggle playback' },
                    )}
                    className={cm.cn('text-white/80 hover:text-white')}
                  >
                    <span className={cm.cn('material-symbols-outlined text-[20px]')}>
                      {playing ? 'pause' : 'play_arrow'}
                    </span>
                  </button>
                  <div className={cm.cn('flex-1 h-1 bg-surface/10 rounded-full overflow-hidden')}>
                    <div
                      className={cm.cn(
                        'h-full w-1/3 bg-gradient-to-r from-[var(--anim-primary)] to-[var(--anim-secondary)] rounded-full',
                      )}
                    />
                  </div>
                  <span
                    className={cm.cn(
                      'font-mono text-[10px] uppercase tracking-widest text-white/80',
                    )}
                  >
                    00:05 / 00:15
                  </span>
                </div>
              </div>

              <KeyframeTimelineMini playheadPercent={28} />
            </div>

            <section
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(4),
                'rounded-2xl bg-[var(--anim-surface)] border border-[var(--anim-border)]',
              )}
            >
              <h2
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-[var(--anim-text)] font-headline',
                )}
              >
                {t('sharePreview.embed', {}, { defaultValue: 'Embed code' })}
              </h2>
              <pre
                className={cm.cn(
                  'font-mono text-xs bg-[var(--anim-background)] border border-[var(--anim-border)] rounded-lg p-4 overflow-x-auto text-[var(--anim-primary)] whitespace-pre',
                )}
              >
                {`<iframe
  src="https://vivace.io/share/${token ?? ''}"
  width="640" height="360"
  loading="lazy"
  allow="autoplay"
></iframe>`}
              </pre>
            </section>
          </div>

          <aside className={cm.stack(6)}>
            <section
              className={cm.cn(
                cm.sp('p', 5),
                cm.stack(4),
                'rounded-xl bg-[var(--anim-surface)] border border-[var(--anim-border)]',
              )}
            >
              <h3
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-[var(--anim-text)] font-headline',
                )}
              >
                {t('sharePreview.commentsHeading', {}, { defaultValue: 'Discussion' })}
              </h3>
              <p className={cm.cn(cm.textSize('xs'), 'text-[var(--anim-text-secondary)]')}>
                {t(
                  'sharePreview.commentsEmpty',
                  {},
                  {
                    defaultValue:
                      'Comments are available to signed-in collaborators on the project.',
                  },
                )}
              </p>
              <Link
                to="/signup"
                data-mol-id="share-signup-cta"
                className={cm.cn(
                  cm.w('full'),
                  cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-lg border border-dashed border-[var(--anim-border)] text-[var(--anim-text-secondary)] hover:border-[color-mix(in_srgb,var(--anim-primary)_40%,transparent)] hover:text-[var(--anim-primary)] transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[16px]')}>add_comment</span>
                <span>
                  {t('sharePreview.signInToComment', {}, { defaultValue: 'Sign in to comment' })}
                </span>
              </Link>
            </section>

            <section className={cm.cn(cm.stack(3))}>
              <h3
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-[var(--anim-text)] font-headline',
                )}
              >
                {t('sharePreview.related', {}, { defaultValue: 'Related animations' })}
              </h3>
              {related === null ? (
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'text-[var(--anim-text-secondary)] font-mono uppercase tracking-widest',
                  )}
                >
                  {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                </p>
              ) : relatedError ? (
                <p className={cm.cn(cm.textSize('xs'), 'text-[var(--anim-text-secondary)]')}>
                  {relatedError}
                </p>
              ) : related.length === 0 ? (
                <p className={cm.cn(cm.textSize('xs'), 'text-[var(--anim-text-secondary)]')}>
                  {t(
                    'sharePreview.relatedEmpty',
                    {},
                    { defaultValue: 'No related animations yet.' },
                  )}
                </p>
              ) : (
                <div className={cm.stack(3)}>
                  {related.map((p, idx) => (
                    <ProjectCard key={p.id} project={toSummary(p, idx)} />
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      </main>

      <footer
        className={cm.cn(
          cm.sp('py', 10),
          cm.sp('px', 6),
          'border-t border-[var(--anim-border)] bg-[var(--anim-background)]',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 4 }),
            'max-w-[1100px] mx-auto',
          )}
        >
          <VivaceWordmark size="sm" />
          <p
            className={cm.cn(
              'font-mono text-[10px] uppercase tracking-widest text-[var(--anim-text-muted)]',
            )}
          >
            {t(
              'sharePreview.poweredBy',
              { appName: APP_NAME },
              { defaultValue: 'Shared via {{appName}} · Motion brought to life' },
            )}
          </p>
        </div>
      </footer>
    </div>
  )
}

export default SharePreview
