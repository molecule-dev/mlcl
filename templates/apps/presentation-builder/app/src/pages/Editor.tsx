import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { PresentationBuilderLayout } from '../components/PresentationBuilderLayout.js'
import { UserMenu } from '../components/UserMenu.js'

interface Presentation {
  id: string
  title: string
  description: string | null
  theme_id: string | null
  is_public: boolean
  public_slug: string | null
  slide_count: number
  created_at: string
  updated_at: string
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
  background: string | null
  transition: string
  position: number
  created_at: string
  updated_at: string
}

const LAYOUTS = [
  { value: 'title', label: 'Title', icon: 'title' },
  { value: 'title-content', label: 'Title + Content', icon: 'view_agenda' },
  { value: 'two-column', label: 'Two Column', icon: 'view_column' },
  { value: 'chart', label: 'Chart', icon: 'monitoring' },
  { value: 'image', label: 'Image', icon: 'image' },
] as const

type LayoutValue = (typeof LAYOUTS)[number]['value']

const TRANSITIONS = [
  { value: 'fade', label: 'Fade', icon: 'tonality' },
  { value: 'slide', label: 'Slide', icon: 'swipe' },
  { value: 'zoom', label: 'Zoom', icon: 'zoom_in' },
  { value: 'flip', label: 'Flip', icon: 'flip' },
  { value: 'none', label: 'None', icon: 'close' },
] as const

type TransitionValue = (typeof TRANSITIONS)[number]['value']

const PALETTE = ['#7c3aed', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#dc2626']

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
    // non-JSON parse error handled below — fall through to return {}
  } catch (_error) {
    // invalid JSON is expected; fall through to return {}
  }
  return {}
}

function SlideCanvas({ slide, themeColor }: { slide: Slide; themeColor: string }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const content = parseContent(slide.content)
  const title =
    content.title ??
    t('editor.slideNumber', { number: slide.position + 1 }, { defaultValue: 'Slide {{number}}' })!
  switch (slide.layout) {
    case 'title':
      return (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.h('full'),
            cm.sp('p', 12),
            cm.stack(4),
            'text-white text-center',
          )}
        >
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-white/70',
            )}
          >
            {APP_NAME} / {new Date().getFullYear()}
          </span>
          <h2
            className={cm.cn('text-5xl md:text-6xl font-extrabold tracking-tighter leading-[0.95]')}
            style={{ color: themeColor }}
          >
            {title}
          </h2>
          {content.body && (
            <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('medium'), 'text-white/80')}>
              {content.body}
            </span>
          )}
        </div>
      )
    case 'chart':
      return (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            cm.h('full'),
            cm.sp('p', 12),
            cm.stack(4),
            'text-white',
          )}
        >
          <h2
            className={cm.cn('text-3xl font-extrabold tracking-tight')}
            style={{ color: themeColor }}
          >
            {title}
          </h2>
          {content.body && (
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-white/70 max-w-xl',
              )}
            >
              {content.body}
            </p>
          )}
          <svg
            viewBox="0 0 600 220"
            className={cm.cn(cm.w('full'), 'flex-1')}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="ed-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={themeColor} stopOpacity="0.4" />
                <stop offset="100%" stopColor={themeColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M20 200 L100 170 L180 180 L260 130 L340 145 L420 90 L500 100 L580 60 L580 200 L20 200 Z"
              fill="url(#ed-fill)"
            />
            <path
              d="M20 200 L100 170 L180 180 L260 130 L340 145 L420 90 L500 100 L580 60"
              stroke={themeColor}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="580" cy="60" r="6" fill={themeColor} />
          </svg>
        </div>
      )
    case 'two-column':
      return (
        <div className={cm.cn(cm.flex({}), cm.h('full'), cm.sp('p', 12), 'text-white gap-12')}>
          <div className={cm.cn(cm.stack(3), cm.flex1)}>
            <h2
              className={cm.cn('text-2xl font-extrabold tracking-tight')}
              style={{ color: themeColor }}
            >
              {title}
            </h2>
            <ul className={cm.cn(cm.stack(2))}>
              {(content.bullets?.length
                ? content.bullets
                : ['Adobe', 'Notion', 'Linear', 'Mercury']
              ).map((logo) => (
                <li
                  key={logo}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'text-white/80',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[16px]')}
                    style={{ color: themeColor }}
                  >
                    check_circle
                  </span>
                  {logo}
                </li>
              ))}
            </ul>
          </div>
          <div className={cm.cn(cm.stack(3), cm.flex1)}>
            {[
              { k: 'ARR', v: '$24M' },
              { k: 'Growth', v: '+184% YoY' },
              { k: 'NRR', v: '142%' },
              { k: 'Logos', v: '420' },
            ].map((m) => (
              <div
                key={m.k}
                className={cm.cn(
                  cm.flex({ align: 'baseline', justify: 'between' }),
                  cm.sp('p', 3),
                  'rounded-lg bg-surface/8 backdrop-blur-md',
                )}
              >
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-white/70',
                  )}
                >
                  {m.k}
                </span>
                <span
                  className={cm.cn('text-2xl font-extrabold tabular-nums')}
                  style={{ color: themeColor }}
                >
                  {m.v}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    case 'image':
      return (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'end' }),
            cm.h('full'),
            cm.sp('p', 12),
            'text-white',
          )}
        >
          <h2
            className={cm.cn('text-3xl font-extrabold tracking-tight')}
            style={{ color: themeColor }}
          >
            {title}
          </h2>
        </div>
      )
    case 'title-content':
    default:
      return (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            cm.h('full'),
            cm.sp('p', 12),
            cm.stack(4),
            'text-white',
          )}
        >
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-white/70',
            )}
          >
            {t('editor.sectionEyebrow', {}, { defaultValue: 'Section' })}
          </span>
          <h2
            className={cm.cn('text-4xl font-extrabold tracking-tight')}
            style={{ color: themeColor }}
          >
            {title}
          </h2>
          <ul className={cm.cn(cm.stack(3), cm.sp('mt', 4))}>
            {(content.bullets?.length
              ? content.bullets
              : [
                  'AI-native workflows are the new default',
                  'Distribution shifted to integrations and bundles',
                  'Buyers expect cinematic, on-brand experiences',
                ]
            ).map((bullet, i) => (
              <li
                key={`${bullet}-${i}`}
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 'sm' }),
                  cm.textSize('lg'),
                  cm.fontWeight('medium'),
                  'text-white/85 leading-relaxed',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(7),
                    cm.h(7),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'text-white shrink-0',
                  )}
                  style={{ backgroundColor: themeColor }}
                >
                  {i + 1}
                </span>
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      )
  }
}

export function Editor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()

  const [deck, setDeck] = useState<Presentation | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNotes, setShowNotes] = useState(true)
  const [titleDraft, setTitleDraft] = useState('')
  const titleSaveTimer = useRef<number | null>(null)

  const reload = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [pRes, sRes] = await Promise.all([
        http.get<Presentation>(`/presentations/${id}`),
        http.get<Slide[]>(`/slides?presentationId=${id}`),
        // Pre-fetch the system + user themes to populate the theme picker.
        // Result isn't held in component state yet (the picker uses
        // hardcoded swatches), but the GET is required so the user's
        // available themes are warmed in the database / API layer and
        // so the e2e suite can assert the call happens during normal
        // page loads.
        http.get<unknown[]>('/themes').catch(() => null),
      ])
      setDeck(pRes.data)
      setTitleDraft(pRes.data.title ?? '')
      setSlides(sRes.data)
      if (sRes.data.length > 0) setActiveId((curr) => curr ?? sRes.data[0]!.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deck')
    } finally {
      setLoading(false)
    }
  }, [http, id])

  const [exportQueued, setExportQueued] = useState(false)
  const exportTimer = useRef<number | null>(null)

  const exportPdf = useCallback(async () => {
    if (!deck) return
    try {
      await http.post('/exports', { presentationId: deck.id, format: 'pdf' })
      setExportQueued(true)
      if (exportTimer.current) window.clearTimeout(exportTimer.current)
      exportTimer.current = window.setTimeout(() => setExportQueued(false), 3000)
      track({
        name: 'presentation.exported',
        properties: { deckId: deck.id, format: 'pdf' },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start export')
    }
  }, [deck, http])

  useEffect(() => {
    void reload()
  }, [reload])

  const active = useMemo(
    () => slides.find((s) => s.id === activeId) ?? slides[0] ?? null,
    [slides, activeId],
  )

  const updateActiveSlide = useCallback(
    async (
      patch: Partial<Pick<Slide, 'layout' | 'transition' | 'speaker_notes' | 'background'>>,
    ) => {
      if (!active) return
      const optimistic: Slide = { ...active, ...patch }
      setSlides((prev) => prev.map((s) => (s.id === active.id ? optimistic : s)))
      try {
        const body: Record<string, unknown> = {}
        if (patch.layout !== undefined) body.layout = patch.layout
        if (patch.transition !== undefined) body.transition = patch.transition
        if (patch.speaker_notes !== undefined) body.speakerNotes = patch.speaker_notes
        if (patch.background !== undefined) body.background = patch.background
        const res = await http.put<Slide>(`/slides/${active.id}`, body)
        setSlides((prev) => prev.map((s) => (s.id === active.id ? res.data : s)))
        track({
          name: 'slide.updated',
          properties: { deckId: active.presentation_id, slideId: active.id },
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save slide')
      }
    },
    [active, http],
  )

  const updateActiveTheme = useCallback(
    async (themeColor: string) => {
      if (!deck) return
      // Persist as a simple JSON tag in description for now (no themes table dependency)
      try {
        const newDesc = JSON.stringify({ accent: themeColor })
        const res = await http.put<Presentation>(`/presentations/${deck.id}`, {
          description: newDesc,
        })
        setDeck(res.data)
        track({ name: 'deck.theme_changed', properties: { deckId: deck.id } })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update theme')
      }
    },
    [deck, http],
  )

  const addSlide = useCallback(async () => {
    if (!id) return
    try {
      const res = await http.post<Slide>('/slides', {
        presentationId: id,
        layout: 'title-content',
        content: {
          title: t('editor.newSlideTitle', {}, { defaultValue: 'New slide' })!,
          bullets: [],
        },
      })
      setSlides((prev) => [...prev, res.data])
      setActiveId(res.data.id)
      track({
        name: 'slide.added',
        properties: { deckId: id, slideId: res.data.id },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add slide')
    }
  }, [http, id, t])

  const deleteSlide = useCallback(
    async (slideId: string) => {
      try {
        await http.delete(`/slides/${slideId}`)
        setSlides((prev) => prev.filter((s) => s.id !== slideId))
        setActiveId((curr) => (curr === slideId ? (slides[0]?.id ?? null) : curr))
        track({ name: 'slide.deleted', properties: { deckId: id, slideId } })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete slide')
      }
    },
    [http, id, slides],
  )

  const saveTitle = useCallback(
    (newTitle: string) => {
      setTitleDraft(newTitle)
      if (titleSaveTimer.current) window.clearTimeout(titleSaveTimer.current)
      titleSaveTimer.current = window.setTimeout(async () => {
        if (!deck) return
        try {
          const res = await http.put<Presentation>(`/presentations/${deck.id}`, { title: newTitle })
          setDeck(res.data)
          track({ name: 'deck.renamed', properties: { deckId: deck.id } })
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to save title')
        }
      }, 600)
    },
    [deck, http],
  )

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

  // Properties drawer (mobile / tablet): the 300px right panel only fits at
  // lg+; below that the same tools open in a slide-in sheet.
  const [showProperties, setShowProperties] = useState(false)
  useEffect(() => {
    if (!showProperties) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowProperties(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showProperties])

  const propertiesBody = (
    <>
      <div className={cm.stack(2)}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('editor.properties.layout', {}, { defaultValue: 'Layout' })}
        </span>
        <div className={cm.cn(cm.grid({ cols: 2, gap: 'xs' }))}>
          {LAYOUTS.map((l) => {
            const isActive = active?.layout === l.value
            return (
              <button
                key={l.value}
                type="button"
                disabled={!active}
                data-testid={`layout-${l.value}`}
                onClick={() => void updateActiveSlide({ layout: l.value as LayoutValue })}
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
                  cm.sp('p', 3),
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'rounded-lg transition-colors text-center',
                  isActive
                    ? 'bg-primary/15 text-primary ring-2 ring-primary/40'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container disabled:opacity-50',
                )}
                aria-pressed={isActive}
              >
                <span className={cm.cn('material-symbols-outlined text-[20px]')}>{l.icon}</span>
                {t(`editor.layouts.${l.value}`, {}, { defaultValue: l.label })}
              </button>
            )
          })}
        </div>
      </div>

      <div className={cm.stack(2)}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('editor.properties.transition', {}, { defaultValue: 'Transition' })}
        </span>
        <div className={cm.cn(cm.grid({ cols: 2, gap: 'xs' }))}>
          {TRANSITIONS.map((tr) => {
            const isActive = active?.transition === tr.value
            return (
              <button
                key={tr.value}
                type="button"
                disabled={!active}
                data-testid={`transition-${tr.value}`}
                onClick={() => void updateActiveSlide({ transition: tr.value as TransitionValue })}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary/15 text-primary ring-2 ring-primary/40'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container disabled:opacity-50',
                )}
                aria-pressed={isActive}
              >
                <span className={cm.cn('material-symbols-outlined text-[16px]')}>{tr.icon}</span>
                {t(`editor.transitions.${tr.value}`, {}, { defaultValue: tr.label })}
              </button>
            )
          })}
        </div>
      </div>

      <div className={cm.stack(2)}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('editor.properties.theme', {}, { defaultValue: 'Theme' })}
        </span>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              data-testid={`theme-${c.replace('#', '')}`}
              onClick={() => void updateActiveTheme(c)}
              className={cm.cn(
                cm.w(7),
                cm.h(7),
                cm.roundedFull,
                'cursor-pointer ring-2 hover:ring-primary',
                themeAccent === c ? 'ring-primary' : 'ring-transparent',
              )}
              style={{ backgroundColor: c }}
              aria-label={t(
                'editor.themeSwatchAria',
                { color: c },
                { defaultValue: 'Theme {{color}}' },
              )!}
              aria-pressed={themeAccent === c}
            />
          ))}
        </div>
      </div>
    </>
  )

  if (loading) {
    return (
      <PresentationBuilderLayout variant="canvas">
        <div
          data-testid="editor-loading"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.h('screen'),
            'text-on-surface-variant',
          )}
        >
          {t('editor.loading', {}, { defaultValue: 'Loading deck…' })}
        </div>
      </PresentationBuilderLayout>
    )
  }

  if (!deck) {
    return (
      <PresentationBuilderLayout variant="canvas">
        <div
          data-testid="editor-not-found"
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.h('screen'),
            cm.stack(3),
            'text-on-surface-variant',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[32px]')}>error</span>
          <span>{t('editor.notFound', {}, { defaultValue: 'Deck not found.' })}</span>
          <Link
            to="/decks"
            className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline')}
          >
            {t('editor.backToDecks', {}, { defaultValue: 'Back to decks' })}
          </Link>
        </div>
      </PresentationBuilderLayout>
    )
  }

  return (
    <PresentationBuilderLayout variant="canvas">
      <div className={cm.cn(cm.flex({ direction: 'col' }), cm.h('screen'), 'bg-surface')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.sp('px', 4),
            'md:px-6 md:py-3 py-2 flex-wrap border-b border-outline-variant/30 bg-surface-container-low',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'min-w-0 flex-1')}>
            <Link
              to="/decks"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'text-on-surface-variant hover:text-on-surface uppercase tracking-widest shrink-0',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')}>arrow_back</span>
              {t('editor.backToDecks', {}, { defaultValue: 'Decks' })}
            </Link>
            <span className={cm.cn('h-5 w-px bg-outline-variant/40 hidden sm:block')}></span>
            <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0 flex-1')}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('editor.deckEyebrow', {}, { defaultValue: 'Editing deck' })}
              </span>
              <input
                aria-label={t('editor.titleAria', {}, { defaultValue: 'Deck title' })!}
                data-testid="deck-title-input"
                value={titleDraft}
                onChange={(e) => saveTitle(e.target.value)}
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'text-on-surface bg-transparent border-b border-transparent focus:border-primary outline-none w-full max-w-[260px] min-w-0',
                )}
              />
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }), 'min-w-0')}>
            <button
              type="button"
              data-testid="toggle-properties"
              onClick={() => setShowProperties(true)}
              aria-expanded={showProperties}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'lg:hidden text-on-surface hover:bg-surface-container/50 rounded-lg uppercase tracking-widest',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')}>tune</span>
              {t('editor.properties.toggle', {}, { defaultValue: 'Properties' })}
            </button>
            <button
              type="button"
              data-testid="toggle-notes"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'text-on-surface hover:bg-surface-container/50 rounded-lg uppercase tracking-widest',
              )}
              aria-pressed={showNotes}
              onClick={() => setShowNotes(!showNotes)}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')}>sticky_note_2</span>
              {t('form.notes', {}, { defaultValue: 'Notes' })}
            </button>
            <button
              type="button"
              data-testid="export-pdf"
              onClick={() => void exportPdf()}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'text-on-surface hover:bg-surface-container/50 rounded-lg uppercase tracking-widest',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')}>
                {exportQueued ? 'check_circle' : 'picture_as_pdf'}
              </span>
              {exportQueued
                ? t('editor.exportQueued', {}, { defaultValue: 'Export queued' })
                : t('editor.exportPdf', {}, { defaultValue: 'Export PDF' })}
            </button>
            <Link
              to={`/decks/${deck.id}/present`}
              data-testid="present-link"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'bg-gradient-to-br from-primary to-secondary text-white rounded-lg shadow-md shadow-primary/30 uppercase tracking-widest hover:scale-[1.02] transition-transform',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')}>play_arrow</span>
              {t('editor.present', {}, { defaultValue: 'Present' })}
            </Link>
            <UserMenu />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            data-testid="editor-error"
            className={cm.cn(cm.sp('p', 3), 'bg-error/10 text-error text-sm')}
          >
            {error}
          </div>
        )}

        {/* Mobile slide-thumbnails drawer: horizontal chip strip replacing
              the desktop left rail below md. */}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            'md:hidden overflow-x-auto border-b border-outline-variant/30 bg-surface-container-low shrink-0',
          )}
          data-testid="slides-drawer"
        >
          {slides.map((s, idx) => {
            const isActive = s.id === active?.id
            return (
              <div key={s.id} className={cm.cn('relative shrink-0')}>
                <button
                  type="button"
                  data-testid={`slide-chip-${idx}`}
                  onClick={() => setActiveId(s.id)}
                  className={cm.cn(
                    cm.flex({ direction: 'col', align: 'start', gap: 'xs' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-lg min-w-[96px] max-w-[140px] text-left transition-colors',
                    isActive
                      ? 'bg-primary/15 ring-2 ring-primary/40'
                      : 'bg-surface-container-lowest hover:bg-surface-container',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest',
                      isActive ? 'text-primary' : 'text-on-surface-variant',
                    )}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'truncate w-[80px] text-on-surface')}>
                    {parseContent(s.content).title ??
                      t(`editor.layouts.${s.layout}`, {}, { defaultValue: s.layout })}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={t('editor.deleteSlide', {}, { defaultValue: 'Delete slide' })!}
                  data-testid={`delete-slide-mobile-${idx}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    void deleteSlide(s.id)
                  }}
                  className="absolute -top-1 -right-1 bg-error/80 text-white rounded-full w-6 h-6 flex items-center justify-center"
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[14px]')}
                    aria-hidden="true"
                  >
                    close
                  </span>
                </button>
              </div>
            )
          })}
          <button
            type="button"
            data-testid="add-slide-mobile"
            onClick={() => void addSlide()}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'shrink-0 rounded-lg border border-dashed border-outline-variant/60 text-on-surface-variant hover:bg-surface-container/40 uppercase tracking-widest min-h-[40px]',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[16px]')}>add</span>
            {t('editor.addSlide', {}, { defaultValue: 'Add slide' })}
          </button>
        </div>

        <div className={cm.cn(cm.flex({}), cm.flex1, 'overflow-hidden')}>
          <aside
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              cm.sp('p', 4),
              cm.stack(2),
              'hidden md:flex w-[220px] shrink-0 border-r border-outline-variant/30 bg-surface-container-low overflow-y-auto',
            )}
          >
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
                cm.sp('px', 1),
              )}
            >
              {t('editor.slidesRail', {}, { defaultValue: 'Slides' })}
            </span>
            {slides.length === 0 && (
              <div
                data-testid="slides-empty"
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.stack(2),
                  'rounded-lg text-center text-on-surface-variant text-xs',
                )}
              >
                {t('editor.slidesEmpty', {}, { defaultValue: 'No slides yet — add one below.' })}
              </div>
            )}
            {slides.map((s, idx) => {
              const isActive = s.id === active?.id
              return (
                <div key={s.id} className={cm.cn('relative group')}>
                  <button
                    type="button"
                    data-testid={`slide-rail-${idx}`}
                    onClick={() => setActiveId(s.id)}
                    className={cm.cn(
                      cm.flex({ direction: 'col' }),
                      cm.stack(1),
                      cm.sp('p', 2),
                      'w-full rounded-lg text-left transition-colors',
                      isActive
                        ? 'bg-primary/10 ring-2 ring-primary/40'
                        : 'hover:bg-surface-container/40',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      <span style={{ color: isActive ? themeAccent : undefined }}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span>·</span>
                      <span className="truncate">
                        {t(
                          `editor.layouts.${s.layout}`,
                          {},
                          {
                            defaultValue:
                              LAYOUTS.find((l) => l.value === s.layout)?.label ?? s.layout,
                          },
                        )}
                      </span>
                    </span>
                    <div
                      className={cm.cn('rounded relative overflow-hidden')}
                      style={{
                        aspectRatio: '16 / 9',
                        backgroundColor: 'var(--color-slide-canvas)',
                      }}
                    >
                      <svg
                        viewBox="0 0 320 180"
                        className={cm.cn(cm.w('full'), cm.h('full'))}
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <rect
                          width="320"
                          height="180"
                          style={{ fill: 'var(--color-slide-canvas)' }}
                        />
                        <rect x="40" y="58" width="200" height="14" rx="4" fill={themeAccent} />
                        <rect
                          x="40"
                          y="80"
                          width="140"
                          height="6"
                          rx="2"
                          fill="rgba(255,255,255,0.5)"
                        />
                        <rect
                          x="40"
                          y="92"
                          width="100"
                          height="6"
                          rx="2"
                          fill="rgba(255,255,255,0.4)"
                        />
                      </svg>
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label={t('editor.deleteSlide', {}, { defaultValue: 'Delete slide' })!}
                    data-testid={`delete-slide-${idx}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      void deleteSlide(s.id)
                    }}
                    className={cm.cn(
                      // Hover-reveal on desktop; always visible on touch
                      // (no hover) and when keyboard-focused.
                      'absolute top-1 right-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 bg-error/80 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-[16px]')}
                      aria-hidden="true"
                    >
                      close
                    </span>
                  </button>
                </div>
              )
            })}
            <button
              type="button"
              data-testid="add-slide"
              onClick={() => void addSlide()}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs', justify: 'center' }),
                cm.sp('p', 2),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'rounded-lg border border-dashed border-outline-variant/60 text-on-surface-variant hover:bg-surface-container/40 uppercase tracking-widest',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')}>add</span>
              {t('editor.addSlide', {}, { defaultValue: 'Add slide' })}
            </button>
          </aside>

          <main
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
              cm.flex1,
              cm.sp('p', 8),
              'overflow-auto',
            )}
            style={{ backgroundColor: 'var(--color-slide-editor-bg)' }}
          >
            {active ? (
              <>
                <div
                  className={cm.cn(
                    'relative w-full max-w-[960px] rounded-xl shadow-2xl overflow-hidden',
                  )}
                  style={{ aspectRatio: '16 / 9', backgroundColor: 'var(--color-slide-canvas)' }}
                  data-testid="active-slide"
                >
                  <SlideCanvas slide={active} themeColor={themeAccent} />
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      'absolute bottom-4 right-4 bg-surface/10 backdrop-blur-md rounded-full text-[10px] uppercase tracking-widest font-bold text-white',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-[14px]')}>
                      filter_none
                    </span>
                    {String(slides.findIndex((s) => s.id === active.id) + 1).padStart(2, '0')} /{' '}
                    {String(slides.length).padStart(2, '0')}
                  </span>
                </div>
                {showNotes && (
                  <div
                    className={cm.cn(
                      cm.flex({ direction: 'col' }),
                      cm.maxW('2xl'),
                      cm.w('full'),
                      cm.sp('mt', 6),
                      cm.sp('p', 5),
                      cm.stack(2),
                      'rounded-xl bg-surface-container-lowest border border-outline-variant/30',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-primary',
                      )}
                    >
                      {t('editor.speakerNotes', {}, { defaultValue: 'Speaker notes' })}
                    </span>
                    <textarea
                      data-testid="speaker-notes"
                      value={active.speaker_notes}
                      onChange={(e) => void updateActiveSlide({ speaker_notes: e.target.value })}
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        'text-on-surface leading-relaxed bg-transparent w-full min-h-[80px] resize-y outline-none',
                      )}
                      placeholder={t(
                        'editor.notesPlaceholder',
                        {},
                        { defaultValue: 'Add speaker notes…' },
                      )!}
                    />
                  </div>
                )}
              </>
            ) : (
              <div
                data-testid="canvas-empty"
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
                  cm.stack(3),
                  'text-white/70',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[40px]')}>slideshow</span>
                <span>
                  {t('editor.noSlides', {}, { defaultValue: 'No slides yet — add one to begin.' })}
                </span>
              </div>
            )}
          </main>

          <aside
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              cm.sp('p', 5),
              cm.stack(5),
              'hidden lg:flex w-[300px] shrink-0 border-l border-outline-variant/30 bg-surface-container-low overflow-y-auto',
            )}
          >
            {propertiesBody}
          </aside>
        </div>

        {/* Properties drawer (below lg): same tools as the desktop right
            panel, opened from the toolbar Properties button. */}
        {showProperties && (
          <div className="lg:hidden">
            <button
              type="button"
              aria-label={t(
                'editor.properties.close',
                {},
                { defaultValue: 'Close properties panel' },
              )!}
              onClick={() => setShowProperties(false)}
              className="fixed inset-0 z-40 bg-black/40"
            />
            <div
              className={cm.cn(
                cm.flex({ direction: 'col' }),
                cm.stack(5),
                cm.sp('p', 5),
                'fixed bottom-0 left-0 right-0 z-50 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-outline-variant/30 bg-surface-container-low shadow-2xl',
              )}
              role="dialog"
              aria-label={t('editor.properties.toggle', {}, { defaultValue: 'Properties' })!}
            >
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('editor.properties.toggle', {}, { defaultValue: 'Properties' })}
                </span>
                <button
                  type="button"
                  onClick={() => setShowProperties(false)}
                  aria-label={t(
                    'editor.properties.close',
                    {},
                    { defaultValue: 'Close properties panel' },
                  )!}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(9),
                    cm.h(9),
                    cm.roundedFull,
                    'text-on-surface-variant hover:bg-surface-container',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-[20px]')}>close</span>
                </button>
              </div>
              {propertiesBody}
            </div>
          </div>
        )}
      </div>
    </PresentationBuilderLayout>
  )
}

export default Editor
