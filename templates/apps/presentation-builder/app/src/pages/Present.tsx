import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { PresentationBuilderLayout } from '../components/PresentationBuilderLayout.js'
import { slideTransitionAnimation } from '../lib/transitions.js'

interface Presentation {
  id: string
  title: string
  description: string | null
  slide_count: number
}

interface SlideContent {
  title?: string
  bullets?: string[]
  body?: string
}

interface Slide {
  id: string
  presentation_id: string
  layout: string
  content: string | SlideContent | null
  speaker_notes: string
  position: number
  /** Enter animation set per-slide in the Editor (fade / slide / zoom / flip / none). */
  transition?: string | null
}

const PALETTE = ['#a78bfa', '#ec4899', '#06b6d4', '#f59e0b', '#7c3aed', '#10b981']
const accentForId = (id: string): string => {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]!
}

const parseContent = (raw: Slide['content']): SlideContent => {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object') return parsed as SlideContent
  } catch (_error) {
    // invalid JSON is expected; fall through to return {}
  }
  return {}
}

function fmtSeconds(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function Present() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()

  const [deck, setDeck] = useState<Presentation | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const reload = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [pRes, sRes] = await Promise.all([
        http.get<Presentation>(`/presentations/${id}`),
        http.get<Slide[]>(`/slides?presentationId=${id}`),
      ])
      setDeck(pRes.data)
      setSlides(sRes.data)
      setActiveIndex(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deck')
    } finally {
      setLoading(false)
    }
  }, [http, id])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    const interval = window.setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setActiveIndex((i) => Math.min(slides.length - 1, i + 1))
      } else if (e.key === 'ArrowLeft') {
        setActiveIndex((i) => Math.max(0, i - 1))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [slides.length])

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const themeAccent = useMemo(() => {
    if (deck?.description) {
      try {
        const obj = JSON.parse(deck.description) as { accent?: string }
        if (obj.accent) return obj.accent
      } catch (_error) {
        // description is not JSON — fall through to accentForId
      }
    }
    return accentForId(deck?.id ?? 'fallback')
  }, [deck])

  const requestFullscreen = useCallback(async () => {
    const el = containerRef.current
    if (!el) return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await el.requestFullscreen()
      }
    } catch (_error) {
      // fullscreen request denied by the browser — no-op, presentation continues in windowed mode
    }
  }, [])

  if (loading) {
    return (
      <PresentationBuilderLayout variant="fullscreen">
        <div
          data-testid="present-loading"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-screen text-white/70',
          )}
        >
          {t('present.loading', {}, { defaultValue: 'Loading deck…' })}
        </div>
      </PresentationBuilderLayout>
    )
  }

  if (!deck) {
    return (
      <PresentationBuilderLayout variant="fullscreen">
        <div
          data-testid="present-not-found"
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            'h-screen text-white/70 gap-3',
          )}
        >
          <span>{t('present.notFound', {}, { defaultValue: 'Deck not found.' })}</span>
          <Link to="/decks" className={cm.cn('text-primary font-bold hover:underline')}>
            {t('present.backToDecks', {}, { defaultValue: 'Back to decks' })}
          </Link>
        </div>
      </PresentationBuilderLayout>
    )
  }

  const active = slides[activeIndex]
  const next = slides[activeIndex + 1]

  return (
    <PresentationBuilderLayout variant="fullscreen">
      <div
        ref={containerRef}
        data-testid="present-container"
        className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'text-white')}
        style={{ backgroundColor: 'var(--color-slide-canvas-deep)' }}
      >
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('px', 8),
            cm.sp('py', 5),
            'border-b border-surface/10',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <Link
              to={`/decks/${deck.id}/edit`}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-white/70 hover:text-white',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')}>arrow_back</span>
              {t('present.exit', {}, { defaultValue: 'Exit presenter' })}
            </Link>
            <span className={cm.cn('h-5 w-px bg-surface/20')}></span>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-white/70',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')}>co_present</span>
              {t('present.eyebrow', { title: deck.title }, { defaultValue: deck.title })}
            </span>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <span
              data-testid="elapsed-timer"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.fontWeight('bold'),
                'text-2xl tabular-nums tracking-tighter text-white',
              )}
              style={{ backgroundColor: 'var(--mol-color-success)' }}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>schedule</span>
              {fmtSeconds(elapsed)}
            </span>
            <button
              type="button"
              data-testid="fullscreen-btn"
              onClick={() => void requestFullscreen()}
              aria-pressed={isFullscreen}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-white/80 hover:bg-surface/10 rounded-lg',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')}>fit_screen</span>
              {isFullscreen
                ? t('present.exitFullscreen', {}, { defaultValue: 'Exit fullscreen' })
                : t('present.fullscreen', {}, { defaultValue: 'Fullscreen' })}
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className={cm.cn(cm.sp('p', 3), 'bg-error/30 text-white text-sm')}>
            {error}
          </div>
        )}

        {slides.length === 0 ? (
          <div
            data-testid="present-empty"
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
              cm.flex1,
              cm.stack(3),
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[40px] text-white/60')}>
              slideshow
            </span>
            <span>{t('present.empty', {}, { defaultValue: 'No slides to present yet.' })}</span>
            <Link
              to={`/decks/${deck.id}/edit`}
              className={cm.cn('text-primary font-bold hover:underline')}
            >
              {t('present.addSlides', {}, { defaultValue: 'Add slides' })}
            </Link>
          </div>
        ) : (
          <>
            <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }), cm.flex1, cm.sp('p', 8))}>
              <div className={cm.cn('lg:col-span-8 col-span-12')}>
                <div
                  data-testid="present-slide"
                  className={cm.cn('relative w-full rounded-2xl overflow-hidden shadow-2xl')}
                  style={{ aspectRatio: '16 / 9', backgroundColor: 'var(--color-slide-canvas)' }}
                >
                  <div
                    key={activeIndex}
                    className={cm.cn(
                      cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
                      cm.h('full'),
                      cm.sp('p', 16),
                      cm.stack(4),
                      'text-center',
                    )}
                    style={{ animation: slideTransitionAnimation(active?.transition) }}
                  >
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-white/60',
                      )}
                    >
                      {APP_NAME} / {new Date().getFullYear()}
                    </span>
                    <h2
                      className={cm.cn(
                        'text-6xl md:text-7xl font-extrabold tracking-tighter leading-[0.95]',
                      )}
                      style={{ color: themeAccent }}
                      data-testid="present-slide-title"
                    >
                      {parseContent(active!.content).title ??
                        t(
                          'editor.slideNumber',
                          { number: active!.position + 1 },
                          { defaultValue: 'Slide {{number}}' },
                        )}
                    </h2>
                    {parseContent(active!.content).body && (
                      <span
                        className={cm.cn(
                          cm.textSize('xl'),
                          cm.fontWeight('medium'),
                          'text-white/85',
                        )}
                      >
                        {parseContent(active!.content).body}
                      </span>
                    )}
                  </div>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      'absolute bottom-5 right-5 bg-surface/10 backdrop-blur-md rounded-full text-[10px] uppercase tracking-widest font-bold text-white',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-[14px]')}>
                      filter_none
                    </span>
                    {String(activeIndex + 1).padStart(2, '0')} /{' '}
                    {String(slides.length).padStart(2, '0')}
                  </span>
                </div>
              </div>

              <div
                className={cm.cn(
                  'lg:col-span-4 col-span-12',
                  cm.flex({ direction: 'col' }),
                  cm.stack(4),
                )}
              >
                {next && (
                  <div className={cm.cn(cm.stack(2))}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-white/60',
                      )}
                    >
                      {t('status.upNext', {}, { defaultValue: 'Up next' })}
                    </span>
                    <div
                      className={cm.cn('relative w-full rounded-xl overflow-hidden')}
                      style={{
                        aspectRatio: '16 / 9',
                        backgroundColor: 'var(--color-slide-canvas)',
                      }}
                    >
                      <div
                        className={cm.cn(
                          cm.flex({ direction: 'col', justify: 'center' }),
                          cm.h('full'),
                          cm.sp('p', 5),
                          cm.stack(2),
                          'text-white opacity-80',
                        )}
                      >
                        <h3
                          className={cm.cn(
                            cm.textSize('lg'),
                            cm.fontWeight('bold'),
                            'tracking-tight',
                          )}
                          style={{ color: themeAccent }}
                        >
                          {parseContent(next.content).title ??
                            t(
                              'editor.slideNumber',
                              { number: next.position + 1 },
                              { defaultValue: 'Slide {{number}}' },
                            )}
                        </h3>
                      </div>
                    </div>
                  </div>
                )}

                <div className={cm.cn(cm.stack(2), cm.flex1)}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-white/60',
                    )}
                  >
                    {t('present.notes', {}, { defaultValue: 'Speaker notes' })}
                  </span>
                  <div
                    data-testid="present-notes"
                    className={cm.cn(
                      cm.sp('p', 5),
                      cm.stack(3),
                      'rounded-xl bg-surface/5 border border-surface/10 flex-1',
                    )}
                  >
                    <p
                      className={cm.cn(
                        cm.textSize('lg'),
                        cm.fontWeight('medium'),
                        'text-white/95 leading-relaxed',
                      )}
                    >
                      {active!.speaker_notes ||
                        t('present.notes.empty', {}, { defaultValue: 'No notes for this slide.' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <footer
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                cm.sp('px', 8),
                cm.sp('py', 5),
                'border-t border-surface/10',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'overflow-x-auto')}>
                {slides.map((s, i) => {
                  const isActive = i === activeIndex
                  return (
                    <button
                      key={s.id}
                      type="button"
                      data-testid={`present-rail-${i}`}
                      onClick={() => setActiveIndex(i)}
                      className={cm.cn(
                        cm.flex({ direction: 'col', align: 'start' }),
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.stack(1),
                        'rounded-lg text-left min-w-[160px]',
                        isActive
                          ? 'bg-surface text-foreground'
                          : 'bg-surface/5 text-white/80 hover:bg-surface/10',
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          'text-[10px] uppercase tracking-widest',
                        )}
                      >
                        {String(i + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
                      </span>
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                          'truncate w-[140px]',
                        )}
                      >
                        {parseContent(s.content).title ??
                          t(
                            'editor.slideNumber',
                            { number: s.position + 1 },
                            { defaultValue: 'Slide {{number}}' },
                          )}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <button
                  type="button"
                  data-testid="prev-slide"
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(11),
                    cm.h(11),
                    cm.roundedFull,
                    'bg-surface/10 hover:bg-surface/20',
                  )}
                  aria-label={t('present.prev', {}, { defaultValue: 'Previous slide' })!}
                >
                  <span className={cm.cn('material-symbols-outlined text-[24px]')}>arrow_back</span>
                </button>
                <button
                  type="button"
                  data-testid="next-slide"
                  onClick={() => setActiveIndex((i) => Math.min(slides.length - 1, i + 1))}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(14),
                    cm.h(14),
                    cm.roundedFull,
                    'bg-surface text-foreground shadow-lg hover:scale-[1.05] transition-transform',
                  )}
                  aria-label={t('present.next', {}, { defaultValue: 'Next slide' })!}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[28px]')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    play_arrow
                  </span>
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </PresentationBuilderLayout>
  )
}

export default Present
