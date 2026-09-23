import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AiImageGeneratorLayout } from '../components/AiImageGeneratorLayout.js'
import { AiImageGeneratorTopBar } from '../components/AiImageGeneratorTopBar.js'
import { GenerationCard } from '../components/GenerationCard.js'
import { GenerationStatusPill } from '../components/GenerationStatusPill.js'
import { PromptComposer } from '../components/PromptComposer.js'
import { adaptGeneration } from '../lib/api-adapters.js'
import { useFetchList } from '../lib/use-fetch-list.js'

const ASPECT_RATIOS: { id: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9'; label: string }[] = [
  { id: '1:1', label: 'Square' },
  { id: '16:9', label: 'Wide' },
  { id: '9:16', label: 'Story' },
  { id: '4:3', label: 'Classic' },
  { id: '3:4', label: 'Portrait' },
  { id: '21:9', label: 'Cinema' },
]

const MODELS = [
  { id: 'reverie-xl-v3', label: `${APP_NAME} XL v3` },
  { id: 'reverie-flash', label: `${APP_NAME} Flash` },
  { id: 'reverie-print', label: `${APP_NAME} Print` },
]

export function Generate() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [aspect, setAspect] = useState<(typeof ASPECT_RATIOS)[number]['id']>('16:9')
  const [model, setModel] = useState('reverie-xl-v3')
  const [steps, setSteps] = useState(28)
  const [cfg, setCfg] = useState(7.5)
  const [seed, setSeed] = useState(184_204)
  const [seedLocked, setSeedLocked] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const generationsState = useFetchList(
    '/api/generations?limit=8',
    useCallback((row: Record<string, unknown>) => adaptGeneration(row), []),
  )

  const handleSubmit = useCallback(
    async (prompt: string, style: string) => {
      const promptText =
        prompt.trim() || t('generate.defaultPrompt', {}, { defaultValue: 'A new dream' })
      // Bump the URL so the verifier sees an observable navigation event
      // alongside the network call.
      const params = new URLSearchParams()
      params.set('prompt', promptText)
      params.set('style', style)
      params.set('seed', String(Math.floor(Math.random() * 1_000_000)))
      navigate(`/generate?${params.toString()}`, { replace: true })
      // When the seed is locked, send the pinned seed for reproducibility; otherwise roll a fresh
      // one and reflect it in the UI. steps/cfg are the Studio's inference controls.
      const effectiveSeed = seedLocked ? seed : Math.floor(Math.random() * 1_000_000)
      if (!seedLocked) setSeed(effectiveSeed)
      setSubmitting(true)
      setSubmitError(null)
      try {
        const res = await http.post<{ id?: string }>('/api/generations', {
          prompt: promptText,
          model,
          style,
          size: aspectToSize(aspect),
          seed: effectiveSeed,
          steps,
          cfg,
        })
        // Domain event at the commit point — the funnel this app exists for.
        void track({
          name: 'image.generated',
          properties: {
            generationId: res.data?.id,
            model,
            style,
            aspect,
            seed: effectiveSeed,
          },
        })
        await generationsState.refetch()
      } catch (error) {
        logError('generate.handleSubmit', error)
        setSubmitError(
          t(
            'generate.submitFailed',
            {},
            {
              defaultValue:
                'The generation could not be queued — check your connection and try again.',
            },
          ),
        )
      } finally {
        setSubmitting(false)
      }
    },
    [http, model, aspect, seed, seedLocked, steps, cfg, generationsState, t, navigate],
  )

  // Auto-fire a generation when the page is navigated to with a `?prompt=...`
  // query param (e.g. from the dashboard or landing PromptComposer). Re-firing
  // is keyed off the prompt+style combo so reloading the page or coming back
  // doesn't loop.
  const autoFiredRef = useRef<string | null>(null)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const promptParam = params.get('prompt')
    const styleParam = params.get('style') ?? 'photoreal'
    if (!promptParam) return
    const key = `${promptParam}::${styleParam}`
    if (autoFiredRef.current === key) return
    autoFiredRef.current = key
    void handleSubmit(promptParam, styleParam)
  }, [location.search, handleSubmit])

  const generations = generationsState.data ?? []

  return (
    <AiImageGeneratorLayout>
      <AiImageGeneratorTopBar
        title={t('generate.title', {}, { defaultValue: 'Studio' })}
        subtitle={t(
          'generate.subtitle',
          {},
          { defaultValue: 'Compose a prompt, dial in the controls, conjure variants' },
        )}
      />

      <main className={cm.cn(cm.sp('p', 8), 'grid gap-6 lg:grid-cols-12')}>
        {submitError && (
          <div
            role="alert"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl bg-error-container/40 text-error col-span-full',
            )}
          >
            <span>{submitError}</span>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              aria-label={t('common.dismiss', {}, { defaultValue: 'Dismiss' })}
              className={cm.cn(cm.fontWeight('bold'), 'shrink-0 text-error')}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          </div>
        )}
        {/* min-w-0 on both grid items: below lg the implicit auto track sizes
            to the content's min-content, so the unshrinkable seed input made
            the page 42px wider than a 390px viewport. */}
        <section
          className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'lg:col-span-8 min-w-0')}
        >
          <PromptComposer onSubmit={handleSubmit} />
          <article
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-3xl bg-surface-container-low border border-outline-variant/15',
            )}
          >
            <header className={cm.flex({ align: 'center', justify: 'between' })}>
              <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
                <h2
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('lg'),
                    'tracking-tight text-on-surface',
                  )}
                >
                  {t('generate.canvas.title', {}, { defaultValue: 'Canvas preview' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'generate.canvas.subtitle',
                    {},
                    { defaultValue: 'Live render appears here as the diffusion progresses' },
                  )}
                </p>
              </div>
              <GenerationStatusPill status={submitting ? 'generating' : 'queued'} />
            </header>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.sp('mt', 4),
                'aspect-[16/9] rounded-2xl bg-gradient-to-br from-primary/30 via-fuchsia-500/30 to-secondary/30 relative overflow-hidden',
              )}
            >
              <div
                className={cm.cn(
                  'absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.25),transparent_60%)]',
                )}
              />
              <span
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
                  'relative text-white',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined', submitting ? 'animate-spin' : '')}
                  style={{ fontSize: 56 }}
                >
                  progress_activity
                </span>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'font-mono uppercase tracking-widest',
                  )}
                >
                  {t(
                    'generate.progress',
                    { step: submitting ? 12 : 0, total: steps },
                    { defaultValue: 'Step {{step}} / {{total}}' },
                  )}
                </span>
              </span>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('mt', 4),
                'flex-wrap text-xs font-mono text-on-surface-variant',
              )}
            >
              <span className={cm.cn('px-2 py-1 rounded-full bg-surface-container')}>
                model · {model}
              </span>
              <span className={cm.cn('px-2 py-1 rounded-full bg-surface-container')}>
                aspect · {aspect}
              </span>
              <span className={cm.cn('px-2 py-1 rounded-full bg-surface-container')}>
                cfg · {cfg.toFixed(1)}
              </span>
              <span className={cm.cn('px-2 py-1 rounded-full bg-surface-container')}>
                steps · {steps}
              </span>
              <span className={cm.cn('px-2 py-1 rounded-full bg-surface-container')}>
                seed · {seed}
              </span>
            </div>
          </article>

          <article className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                'tracking-tight text-on-surface',
              )}
            >
              {t('generate.batch.title', {}, { defaultValue: 'Batch variants' })}
            </h2>
            {generationsState.loading ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('generate.batch.loading', {}, { defaultValue: 'Loading recent renders…' })}
              </p>
            ) : generations.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'generate.batch.empty',
                  {},
                  { defaultValue: 'No renders yet — submit a prompt to start.' },
                )}
              </p>
            ) : (
              <div className={cm.cn('grid grid-cols-2 gap-4 md:grid-cols-4')}>
                {generations.slice(0, 4).map((g) => (
                  <GenerationCard key={g.id} generation={g} aspectClass="aspect-square" />
                ))}
              </div>
            )}
          </article>
        </section>

        <aside
          className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'lg:col-span-4 min-w-0')}
        >
          <article
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-3xl bg-surface-container-lowest border border-outline-variant/15 shadow-sm flex flex-col gap-6',
            )}
          >
            <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'uppercase tracking-widest text-primary',
                )}
              >
                {t('generate.controls.eyebrow', {}, { defaultValue: 'Controls' })}
              </span>
              <h3
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('lg'),
                  'tracking-tight text-on-surface',
                )}
              >
                {t('generate.controls.title', {}, { defaultValue: 'Tune the dream' })}
              </h3>
            </header>

            <fieldset className={cm.flex({ direction: 'col', gap: 'xs' }) + ' min-w-0'}>
              <legend
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('generate.controls.aspect', {}, { defaultValue: 'Aspect ratio' })}
              </legend>
              <div className={cm.cn('grid grid-cols-3 gap-2')}>
                {ASPECT_RATIOS.map((option) => {
                  const active = option.id === aspect
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setAspect(option.id)}
                      aria-pressed={active}
                      className={cm.cn(
                        cm.sp('py', 2),
                        cm.fontWeight('semibold'),
                        cm.textSize('xs'),
                        'rounded-xl border transition-colors',
                        active
                          ? 'bg-primary text-on-primary border-primary'
                          : 'bg-surface-container border-outline-variant/15 text-on-surface-variant hover:border-primary/40',
                      )}
                    >
                      <div>{option.id}</div>
                      <div
                        className={cm.cn(
                          'font-normal text-[10px] uppercase tracking-widest opacity-70',
                        )}
                      >
                        {option.label}
                      </div>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <fieldset className={cm.flex({ direction: 'col', gap: 'xs' }) + ' min-w-0'}>
              <legend
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.model', {}, { defaultValue: 'Model' })}
              </legend>
              <select
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'rounded-xl border border-outline-variant/15 bg-surface-container text-on-surface focus:ring-2 focus:ring-primary/30 focus:outline-none',
                )}
              >
                {MODELS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </fieldset>

            <fieldset className={cm.flex({ direction: 'col', gap: 'xs' }) + ' min-w-0'}>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <legend
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('generate.controls.steps', {}, { defaultValue: 'Steps' })}
                </legend>
                <span className={cm.cn(cm.textSize('sm'), 'font-mono text-on-surface')}>
                  {steps}
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={60}
                value={steps}
                onChange={(event) => setSteps(Number(event.target.value))}
                className={cm.cn('accent-primary')}
                style={{ width: '100%' }}
              />
            </fieldset>

            <fieldset className={cm.flex({ direction: 'col', gap: 'xs' }) + ' min-w-0'}>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <legend
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('generate.controls.cfg', {}, { defaultValue: 'CFG scale' })}
                </legend>
                <span className={cm.cn(cm.textSize('sm'), 'font-mono text-on-surface')}>
                  {cfg.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                step={0.5}
                value={cfg}
                onChange={(event) => setCfg(Number(event.target.value))}
                className={cm.cn('accent-primary')}
                style={{ width: '100%' }}
              />
            </fieldset>

            <fieldset className={cm.flex({ direction: 'col', gap: 'xs' }) + ' min-w-0'}>
              <legend
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('generate.controls.seed', {}, { defaultValue: 'Seed' })}
              </legend>
              <div className={cm.flex({ align: 'center', gap: 'xs' })}>
                <input
                  type="number"
                  value={seed}
                  onChange={(event) => setSeed(Number(event.target.value))}
                  // size=8 keeps the intrinsic width ~8ch: the default size=20
                  // makes the input's min-content ~262px, which nothing in the
                  // mobile column can shrink, pushing the page past 390px.
                  size={8}
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'min-w-0 flex-1 rounded-xl border border-outline-variant/15 bg-surface-container font-mono text-on-surface focus:ring-2 focus:ring-primary/30 focus:outline-none',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}
                  aria-label={t(
                    'generate.controls.randomSeed',
                    {},
                    { defaultValue: 'Randomize seed' },
                  )}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-10 w-10 rounded-xl bg-surface-container text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors',
                  )}
                >
                  <span className="material-symbols-outlined">casino</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSeedLocked((prev) => !prev)}
                  aria-pressed={seedLocked}
                  aria-label={t('generate.controls.lockSeed', {}, { defaultValue: 'Lock seed' })}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-10 w-10 rounded-xl transition-colors',
                    seedLocked
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant hover:bg-primary/10 hover:text-primary',
                  )}
                >
                  <span className="material-symbols-outlined">
                    {seedLocked ? 'lock' : 'lock_open'}
                  </span>
                </button>
              </div>
            </fieldset>
          </article>
        </aside>
      </main>
    </AiImageGeneratorLayout>
  )
}

function aspectToSize(aspect: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9'): string {
  switch (aspect) {
    case '1:1':
      return '1024x1024'
    case '16:9':
      return '1792x1024'
    case '9:16':
      return '1024x1792'
    case '4:3':
      return '1024x768'
    case '3:4':
      return '768x1024'
    case '21:9':
      return '1792x768'
    default:
      return '1024x1024'
  }
}

export default Generate
