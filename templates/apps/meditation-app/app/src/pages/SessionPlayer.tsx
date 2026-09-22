import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BreathingDial } from '../components/BreathingDial.js'
import { StillpointTopBar } from '../components/StillpointTopBar.js'
import type { ApiCategory, ApiSession } from '../lib/api.js'

interface Chapter {
  key: string
  title: string
  startSeconds: number
}

const PHASES = [
  { key: 'inhale', label: 'Inhale', defaultLabel: 'Inhale', seconds: 4 },
  { key: 'hold', label: 'Hold', defaultLabel: 'Hold', seconds: 4 },
  { key: 'exhale', label: 'Exhale', defaultLabel: 'Exhale', seconds: 6 },
]

function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function buildChapters(durationSeconds: number): Chapter[] {
  if (durationSeconds <= 0) {
    return [{ key: 'arrive', title: 'Arrive', startSeconds: 0 }]
  }
  const splits = [
    { key: 'arrive', title: 'Arrive', frac: 0 },
    { key: 'breath', title: 'Settle the breath', frac: 0.12 },
    { key: 'body', title: 'Body scan', frac: 0.32 },
    { key: 'rest', title: 'Rest', frac: 0.7 },
    { key: 'close', title: 'Close', frac: 0.9 },
  ]
  return splits.map((s) => ({
    key: s.key,
    title: s.title,
    startSeconds: Math.floor(durationSeconds * s.frac),
  }))
}

export function SessionPlayer() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const [session, setSession] = useState<ApiSession | null>(null)
  const [category, setCategory] = useState<ApiCategory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [phaseRemaining, setPhaseRemaining] = useState(PHASES[0]?.seconds ?? 4)
  const [completed, setCompleted] = useState(false)
  const [historyPosted, setHistoryPosted] = useState(false)
  const startedAtRef = useRef<Date | null>(null)
  const startedTrackedRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get<ApiSession>(`/sessions/${id}`)
      .then(async (res) => {
        if (cancelled) return
        const s = res.data
        setSession(s)
        setError(null)
        if (s?.category_id) {
          try {
            const cat = await http.get<ApiCategory>(`/categories/${s.category_id}`)
            if (!cancelled) setCategory(cat.data)
          } catch (_error) {
            // category fetch is non-critical; session still plays without it
          }
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id])

  const durationSeconds = session?.duration_seconds ?? 0
  const chapters = useMemo(() => buildChapters(durationSeconds), [durationSeconds])

  useEffect(() => {
    if (!playing) return
    if (!startedAtRef.current) startedAtRef.current = new Date()
    intervalRef.current = setInterval(() => {
      setElapsed((e) => Math.min(e + 1, durationSeconds))
      setPhaseRemaining((r) => {
        if (r > 1) return r - 1
        const next = (phaseIndex + 1) % PHASES.length
        setPhaseIndex(next)
        return PHASES[next]?.seconds ?? 4
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [playing, phaseIndex, durationSeconds])

  useEffect(() => {
    if (durationSeconds <= 0) return
    if (elapsed >= durationSeconds && !completed) {
      setPlaying(false)
      setCompleted(true)
    }
  }, [elapsed, durationSeconds, completed])

  useEffect(() => {
    if (!completed || historyPosted || !session?.id) return
    const startedAt = startedAtRef.current ?? new Date(Date.now() - elapsed * 1000)
    void http
      .post('/history', {
        session_id: session.id,
        duration_seconds: elapsed,
        started_at: startedAt.toISOString(),
        completed_at: new Date().toISOString(),
      })
      .then(() => {
        void track({
          name: 'session.completed',
          properties: {
            session_id: session.id,
            slug: session.slug ?? null,
            duration_seconds: elapsed,
          },
        })
      })
      .catch(() => {
        // best-effort; the player UI still works without history
      })
      .finally(() => setHistoryPosted(true))
  }, [completed, historyPosted, session?.id, session?.slug, elapsed, http])

  if (loading) {
    return (
      <>
        <StillpointTopBar
          title={t('stillpoint.player.heading', {}, { defaultValue: 'Session' })}
          eyebrow={
            <Link
              to="/library"
              className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            >
              ← {t('nav.library', {}, { defaultValue: 'Library' })}
            </Link>
          }
        />
        <div
          data-testid="player-loading"
          className={cm.cn(cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      </>
    )
  }

  if (error || !session) {
    return (
      <>
        <StillpointTopBar
          title={t('stillpoint.player.heading', {}, { defaultValue: 'Session' })}
          eyebrow={
            <Link
              to="/library"
              className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            >
              ← {t('nav.library', {}, { defaultValue: 'Library' })}
            </Link>
          }
        />
        <div
          data-testid="player-not-found"
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-2xl border border-dashed border-outline text-on-surface-variant',
          )}
        >
          {t('stillpoint.player.notFound', {}, { defaultValue: 'Session not found.' })}
        </div>
      </>
    )
  }

  const progress = durationSeconds > 0 ? Math.min(1, elapsed / durationSeconds) : 0
  const currentPhase = PHASES[phaseIndex] ?? PHASES[0]
  const phaseSeconds = currentPhase?.seconds ?? 4
  const phaseRatio = phaseSeconds > 0 ? phaseRemaining / phaseSeconds : 0
  const currentChapter = chapters.filter((c) => c.startSeconds <= elapsed).pop() ?? chapters[0]

  return (
    <>
      <StillpointTopBar
        title={session.title}
        eyebrow={
          <>
            <Link
              to="/library"
              className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            >
              ← {t('nav.library', {}, { defaultValue: 'Library' })}
            </Link>
            {category ? (
              <span
                data-testid="player-category"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  'rounded-full bg-primary-container text-on-primary-container font-bold uppercase tracking-widest',
                )}
              >
                {category.label}
              </span>
            ) : null}
            {session.instructor_name ? (
              <span
                data-testid="player-instructor"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  'rounded-full bg-accent-container text-on-accent-container font-bold uppercase tracking-widest',
                )}
              >
                {t(
                  'stillpoint.player.with',
                  { name: session.instructor_name },
                  { defaultValue: 'with {{name}}' },
                )}
              </span>
            ) : null}
          </>
        }
      />

      {completed ? (
        <div
          data-testid="player-complete"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('p', 4),
            'rounded-2xl bg-primary-container text-on-primary-container border border-primary',
          )}
        >
          <span className={cm.cn(cm.fontWeight('semibold'))}>
            {t(
              'stillpoint.player.complete',
              {},
              { defaultValue: 'Session complete — recorded to your history.' },
            )}
          </span>
          <Link
            to="/journal"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-full bg-primary text-white hover:bg-primary/90 transition-colors',
            )}
          >
            {t('stillpoint.player.reflect', {}, { defaultValue: 'Reflect' })}
          </Link>
        </div>
      ) : null}

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch')}>
        <div
          data-testid="player-stage"
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'lg' }),
            cm.sp('p', 10),
            'lg:col-span-8 min-h-[460px] bg-gradient-to-br from-[var(--color-hero-from-alt)] via-primary to-[var(--color-cat-mindfulness)] rounded-[2rem] text-white relative overflow-hidden',
          )}
        >
          <div
            className={cm.cn(
              'absolute -top-24 -left-20 w-80 h-80 bg-surface/10 rounded-full blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              'absolute -bottom-32 -right-20 w-96 h-96 bg-accent/30 rounded-full blur-3xl',
            )}
            aria-hidden="true"
          />

          <BreathingDial
            phaseLabel={t(
              `stillpoint.player.phase.${currentPhase?.key ?? 'inhale'}`,
              {},
              {
                defaultValue: currentPhase?.defaultLabel ?? 'Inhale',
              },
            )}
            secondsRemaining={phaseRemaining}
            ratio={phaseRatio}
            size={280}
          />

          <div className={cm.cn('relative z-10 w-full max-w-md text-center')}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('mb', 2),
                cm.textSize('xs'),
                'uppercase tracking-widest text-white/70 font-bold',
              )}
            >
              <span data-testid="player-elapsed" className="font-mono tabular-nums">
                {formatClock(elapsed)}
              </span>
              <span data-testid="player-chapter">
                {currentChapter
                  ? t(
                      `stillpoint.player.chapter.${currentChapter.key}`,
                      {},
                      { defaultValue: currentChapter.title },
                    )
                  : ''}
              </span>
              <span data-testid="player-duration" className="font-mono tabular-nums">
                {formatClock(durationSeconds)}
              </span>
            </div>
            <div className={cm.cn('w-full h-1 rounded-full bg-surface/20 overflow-hidden')}>
              <div
                data-testid="player-progress"
                className={cm.cn('h-full bg-surface transition-all duration-1000 ease-linear')}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>

          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'relative z-10')}>
            <button
              type="button"
              data-testid="player-skip-back"
              aria-label={t('stillpoint.player.skipBack', {}, { defaultValue: 'Skip back 15s' })}
              onClick={() => setElapsed((e) => Math.max(0, e - 15))}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'w-12 h-12 rounded-full bg-surface/10 text-white hover:bg-surface/20 transition-colors',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                replay_10
              </span>
            </button>
            <button
              type="button"
              data-testid="player-toggle"
              aria-label={
                playing
                  ? t('common.pause', {}, { defaultValue: 'Pause' })
                  : t('common.play', {}, { defaultValue: 'Play' })
              }
              onClick={() => {
                setCompleted(false)
                if (!playing && !startedTrackedRef.current && session) {
                  startedTrackedRef.current = true
                  void track({
                    name: 'session.started',
                    properties: {
                      session_id: session.id,
                      slug: session.slug ?? null,
                      duration_seconds: durationSeconds,
                    },
                  })
                }
                setPlaying((p) => !p)
              }}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'w-20 h-20 rounded-full bg-surface text-primary hover:scale-105 transition-transform shadow-lg',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn('material-symbols-outlined text-5xl')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {playing ? 'pause' : 'play_arrow'}
              </span>
            </button>
            <button
              type="button"
              data-testid="player-skip-forward"
              aria-label={t(
                'stillpoint.player.skipForward',
                {},
                { defaultValue: 'Skip forward 30s' },
              )}
              onClick={() => setElapsed((e) => Math.min(durationSeconds, e + 30))}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'w-12 h-12 rounded-full bg-surface/10 text-white hover:bg-surface/20 transition-colors',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                forward_30
              </span>
            </button>
          </div>
        </div>

        <aside className={cm.cn('lg:col-span-4 flex flex-col gap-4')}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline/30',
            )}
          >
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-lg text-on-surface tracking-tight mb-2',
              )}
            >
              {t('stillpoint.player.aboutHeading', {}, { defaultValue: 'About this session' })}
            </h2>
            <p
              data-testid="player-description"
              className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
            >
              {session.description ??
                t('stillpoint.player.noDescription', {}, { defaultValue: 'A guided practice.' })}
            </p>
          </div>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline/30',
            )}
          >
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-lg text-on-surface tracking-tight mb-3',
              )}
            >
              {t('stillpoint.player.chaptersHeading', {}, { defaultValue: 'Chapters' })}
            </h2>
            <ul
              data-testid="player-chapters"
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'xs' }),
                'list-none divide-y divide-outline/30',
              )}
            >
              {chapters.map((c) => {
                const active = currentChapter?.key === c.key
                return (
                  <li key={c.key}>
                    <button
                      type="button"
                      data-testid={`player-chapter-${c.key}`}
                      onClick={() => setElapsed(c.startSeconds)}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.sp('px', 3),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'w-full text-left rounded-lg transition-colors',
                        active
                          ? 'bg-primary-container text-on-primary-container font-semibold'
                          : 'hover:bg-surface-variant',
                      )}
                    >
                      <span>
                        {t(`stillpoint.player.chapter.${c.key}`, {}, { defaultValue: c.title })}
                      </span>
                      <span className={cm.cn('font-mono tabular-nums text-on-surface-variant')}>
                        {formatClock(c.startSeconds)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>
      </div>
    </>
  )
}
