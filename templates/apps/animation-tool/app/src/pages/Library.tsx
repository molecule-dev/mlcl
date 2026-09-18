import { useEffect, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AnimationToolLayout } from '../components/AnimationToolLayout.js'
import { EasingCurveTile, type EasingPreset } from '../components/EasingCurveTile.js'

interface KeyframeTemplate {
  id: string
  name: string
  description: string
  trackCount: number
  duration: string
  category: 'fades' | 'transforms' | 'micro' | 'states'
}

interface ApiProject {
  id: string
  name: string
  updated_at?: string | null
}

const CATEGORY_LABEL: Record<KeyframeTemplate['category'], string> = {
  fades: 'Fades',
  transforms: 'Transforms',
  micro: 'Microinteractions',
  states: 'State machines',
}

const PROPERTY_FOR_CATEGORY: Record<KeyframeTemplate['category'], string> = {
  fades: 'opacity',
  transforms: 'translateY',
  micro: 'scale',
  states: 'state',
}

export function Library() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [easings, setEasings] = useState<EasingPreset[] | null>(null)
  const [easingsError, setEasingsError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<KeyframeTemplate[] | null>(null)
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  const [activeEasing, setActiveEasing] = useState<string | null>(null)
  const [insertedTemplate, setInsertedTemplate] = useState<string | null>(null)
  const [latestProject, setLatestProject] = useState<ApiProject | null>(null)
  const [insertingId, setInsertingId] = useState<string | null>(null)
  const [insertError, setInsertError] = useState<string | null>(null)
  const [insertStatus, setInsertStatus] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<EasingPreset[] | { data: EasingPreset[] }>('/api/library/easings')
      .then((res) => {
        if (cancelled) return
        const arr = Array.isArray(res.data)
          ? (res.data as EasingPreset[])
          : ((res.data as { data?: EasingPreset[] }).data ?? [])
        setEasings(arr)
        if (arr.length > 0) setActiveEasing(arr[0]!.id)
      })
      .catch(() => {
        if (cancelled) return
        setEasingsError(
          t('library.easingsError', {}, { defaultValue: 'Could not load easing presets.' }),
        )
        setEasings([])
      })
    http
      .get<KeyframeTemplate[] | { data: KeyframeTemplate[] }>('/api/library/templates')
      .then((res) => {
        if (cancelled) return
        const arr = Array.isArray(res.data)
          ? (res.data as KeyframeTemplate[])
          : ((res.data as { data?: KeyframeTemplate[] }).data ?? [])
        setTemplates(arr)
      })
      .catch(() => {
        if (cancelled) return
        setTemplatesError(
          t('library.templatesError', {}, { defaultValue: 'Could not load keyframe templates.' }),
        )
        setTemplates([])
      })
    // The user's most recently updated project is the implicit
    // "active project" the library inserts into. Without one, Insert
    // would silently fall back to local state — which is the bug we
    // are fixing here. Surface a clear error instead.
    http
      .get<ApiProject[] | { data: ApiProject[] }>('/api/projects?limit=1')
      .then((res) => {
        if (cancelled) return
        const arr = Array.isArray(res.data)
          ? (res.data as ApiProject[])
          : ((res.data as { data?: ApiProject[] }).data ?? [])
        setLatestProject(arr[0] ?? null)
      })
      .catch(() => {
        if (cancelled) return
        setLatestProject(null)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function handleInsert(template: KeyframeTemplate) {
    if (insertingId) return
    setInsertError(null)
    setInsertStatus(null)
    if (!latestProject) {
      setInsertError(
        t(
          'library.needProject',
          {},
          { defaultValue: 'Create a project first — keyframes need somewhere to land.' },
        ),
      )
      return
    }
    setInsertingId(template.id)
    try {
      const easing = activeEasing ? easings?.find((e) => e.id === activeEasing) : undefined
      const property = PROPERTY_FOR_CATEGORY[template.category]
      const response = await http.post<{ id: string } | { data: { id: string } }>(
        '/api/keyframes',
        {
          projectId: latestProject.id,
          property,
          time: 0,
          value: property === 'opacity' ? 1 : 100,
          easing: easing?.expression ?? 'linear',
        },
      )
      const created =
        (response.data as { data?: { id: string } } | undefined)?.data ?? response.data
      const newId = (created as { id?: string } | null | undefined)?.id ?? null
      setInsertedTemplate(template.id)
      setInsertStatus(
        t(
          'library.inserted.confirm',
          { name: template.name, projectName: latestProject.name, id: newId ?? '' },
          {
            defaultValue: 'Inserted "{{name}}" into project {{projectName}}.',
          },
        ),
      )
    } catch (error) {
      logError('library.insertKeyframe', error)
      setInsertError(
        t(
          'library.insert.error',
          {},
          { defaultValue: 'Could not insert keyframe — check the editor for the project.' },
        ),
      )
    } finally {
      setInsertingId(null)
    }
  }

  return (
    <AnimationToolLayout
      title={t('nav.library', {}, { defaultValue: 'Library' })}
      breadcrumb={t('library.crumb', {}, { defaultValue: '// presets & templates' })}
    >
      <div className={cm.stack(8)}>
        <header>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'font-headline text-[var(--anim-text)] tracking-tight',
            )}
          >
            {t('library.heading', {}, { defaultValue: 'Easing & keyframe library' })}
          </h2>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 1),
              'text-[var(--anim-text-secondary)]',
            )}
          >
            {t(
              'library.subhead',
              {},
              {
                defaultValue:
                  'Hand-tuned bezier presets and keyframe templates ready to drop into any track.',
              },
            )}
          </p>
        </header>

        <section className={cm.stack(4)}>
          <div className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }))}>
            <h3
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('semibold'),
                'font-headline text-[var(--anim-text)]',
              )}
            >
              {t('library.easingTitle', {}, { defaultValue: 'Easing curves' })}
            </h3>
            <span
              className={cm.cn(
                'font-mono text-[11px] uppercase tracking-widest text-[var(--anim-text-muted)]',
              )}
            >
              {t(
                'library.easingMeta',
                { count: easings?.length ?? 0 },
                { defaultValue: '{{count}} presets' },
              )}
            </span>
          </div>
          {easings === null ? (
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'text-[var(--anim-text-secondary)] font-mono uppercase tracking-widest',
              )}
            >
              {t('library.easingsLoading', {}, { defaultValue: 'Loading easings…' })}
            </p>
          ) : easingsError ? (
            <p
              role="alert"
              className={cm.cn(cm.textSize('sm'), 'text-[var(--anim-danger)] font-mono')}
            >
              {easingsError}
            </p>
          ) : easings.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-[var(--anim-text-secondary)]')}>
              {t('library.easingsEmpty', {}, { defaultValue: 'No easing presets available yet.' })}
            </p>
          ) : (
            <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4')}>
              {easings.map((preset) => (
                <EasingCurveTile
                  key={preset.id}
                  preset={preset}
                  active={activeEasing === preset.id}
                  onPick={(p) => setActiveEasing(p.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section className={cm.stack(4)}>
          <h3
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('semibold'),
              'font-headline text-[var(--anim-text)]',
            )}
          >
            {t('library.templatesTitle', {}, { defaultValue: 'Keyframe templates' })}
          </h3>
          {insertError ? (
            <p
              role="alert"
              data-mol-id="library-insert-error"
              className={cm.cn(cm.textSize('sm'), 'text-[var(--anim-danger)] font-mono')}
            >
              {insertError}
            </p>
          ) : null}
          {insertStatus ? (
            <p
              role="status"
              data-mol-id="library-insert-status"
              className={cm.cn(
                cm.textSize('xs'),
                'text-[var(--anim-primary)] font-mono uppercase tracking-widest',
              )}
            >
              {insertStatus}
            </p>
          ) : null}
          {templates === null ? (
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'text-[var(--anim-text-secondary)] font-mono uppercase tracking-widest',
              )}
            >
              {t('nav.loadingTemplates', {}, { defaultValue: 'Loading templates…' })}
            </p>
          ) : templatesError ? (
            <p
              role="alert"
              className={cm.cn(cm.textSize('sm'), 'text-[var(--anim-danger)] font-mono')}
            >
              {templatesError}
            </p>
          ) : templates.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-[var(--anim-text-secondary)]')}>
              {t('library.templatesEmpty', {}, { defaultValue: 'No templates yet.' })}
            </p>
          ) : (
            (Object.keys(CATEGORY_LABEL) as KeyframeTemplate['category'][]).map((category) => {
              const items = templates.filter((tpl) => tpl.category === category)
              if (items.length === 0) return null
              return (
                <div key={category} className={cm.stack(3)}>
                  <h4
                    className={cm.cn(
                      'font-mono text-[10px] uppercase tracking-widest text-[var(--anim-primary)]',
                    )}
                  >
                    {t(
                      `library.category.${category}`,
                      {},
                      { defaultValue: CATEGORY_LABEL[category] },
                    )}
                  </h4>
                  <ul className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3')}>
                    {items.map((tpl) => (
                      <li
                        key={tpl.id}
                        className={cm.cn(
                          cm.sp('p', 4),
                          cm.stack(2),
                          'rounded-xl bg-[var(--anim-surface)] border border-[var(--anim-border)] hover:border-[color-mix(in_srgb,var(--anim-primary)_40%,transparent)] transition-colors',
                        )}
                        data-mol-id={`tpl-${tpl.id}`}
                      >
                        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                          <span
                            className={cm.cn(
                              cm.textSize('sm'),
                              cm.fontWeight('semibold'),
                              'text-[var(--anim-text)]',
                            )}
                          >
                            {tpl.name}
                          </span>
                          <span
                            className={cm.cn(
                              'font-mono text-[10px] tracking-widest text-[var(--anim-text-muted)]',
                            )}
                          >
                            {tpl.duration}
                          </span>
                        </div>
                        <p
                          className={cm.cn(cm.textSize('xs'), 'text-[var(--anim-text-secondary)]')}
                        >
                          {tpl.description}
                        </p>
                        <div
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'between' }),
                            cm.sp('pt', 2),
                            'border-t border-[var(--anim-border)]',
                          )}
                        >
                          <span
                            className={cm.cn(
                              'font-mono text-[10px] uppercase tracking-widest text-[var(--anim-text-muted)]',
                            )}
                          >
                            {t(
                              'library.tracks',
                              { count: tpl.trackCount },
                              { defaultValue: '{{count}} tracks' },
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleInsert(tpl)}
                            disabled={insertingId === tpl.id}
                            data-mol-id={`tpl-insert-${tpl.id}`}
                            className={cm.cn(
                              'font-mono text-[10px] uppercase tracking-widest text-[var(--anim-primary)] hover:text-[var(--anim-secondary)] transition-colors disabled:opacity-60',
                            )}
                          >
                            {insertingId === tpl.id
                              ? t('library.inserting', {}, { defaultValue: 'Inserting…' })
                              : insertedTemplate === tpl.id
                                ? t('library.inserted', {}, { defaultValue: 'Inserted' })
                                : t('library.insert', {}, { defaultValue: 'Insert' })}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })
          )}
        </section>
      </div>
    </AnimationToolLayout>
  )
}

export default Library
