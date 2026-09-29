import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { GUIDE_BODIES } from '../lib/guide-content.js'
import { unwrapSingle } from '../lib/unwrap.js'

type GuideCategory = 'getting-started' | 'authentication' | 'core' | 'advanced' | 'recipes'

interface Guide {
  id: string
  title: string
  description: string
  category?: GuideCategory | null
  read_time?: number | null
  updated?: string | null
}

const CATEGORY_TINT: Record<GuideCategory, string> = {
  'getting-started': 'bg-emerald-500/15 text-emerald-300',
  authentication: 'bg-blue-500/15 text-blue-300',
  core: 'bg-violet-500/15 text-violet-300',
  advanced: 'bg-amber-500/15 text-amber-300',
  recipes: 'bg-rose-500/15 text-rose-300',
}

function categoryTint(c: string | null | undefined): string {
  return c && c in CATEGORY_TINT
    ? CATEGORY_TINT[c as GuideCategory]
    : 'bg-surface-container text-on-surface-variant'
}

function fmtUpdated(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Single guide view — fetched from GET /api/guides/:id (the same static
 * catalog the Guides list serves). Renders the catalog metadata (category,
 * read time, updated date) plus the guide's summary as the lead paragraph.
 */
export function GuideDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [guide, setGuide] = useState<Guide | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/guides/${id}`)
      .then((res) => {
        if (!cancelled) setGuide(unwrapSingle<Guide>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('guideDetail.loadError', {}, { defaultValue: 'Failed to load guide.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  if (error || !guide) {
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.stack(4))}>
        <p className={cm.cn('text-error')}>
          {error ?? t('guideDetail.notFound', {}, { defaultValue: 'Guide not found.' })}
        </p>
        <Link
          to="/docs/guides"
          className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
        >
          ← {t('guideDetail.back', {}, { defaultValue: 'All guides' })}
        </Link>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, cm.stack(8))}>
      <Link
        to="/docs/guides"
        className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
      >
        ← {t('guideDetail.back', {}, { defaultValue: 'All guides' })}
      </Link>

      <header>
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }), cm.sp('mb', 3))}
        >
          <span
            className={cm.cn(
              'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest font-mono',
              categoryTint(guide.category),
            )}
          >
            {(guide.category ?? 'core').replace('-', ' ')}
          </span>
          {guide.read_time != null ? (
            <span
              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums font-mono')}
            >
              {t(
                'guides.readTime',
                { mins: guide.read_time },
                { defaultValue: '{{mins}} min read' },
              )}
            </span>
          ) : null}
          {guide.updated ? (
            <span
              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums font-mono')}
            >
              {t(
                'guides.updated',
                { date: fmtUpdated(guide.updated) },
                { defaultValue: 'Updated {{date}}' },
              )}
            </span>
          ) : null}
        </div>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {guide.title}
        </h1>
      </header>

      <section className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl')}>
        <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant leading-relaxed')}>
          {guide.description}
        </p>
      </section>

      {(() => {
        const body = GUIDE_BODIES[guide.id]
        if (!body) return null
        return (
          <div className={cm.cn(cm.stack(8))}>
            {body.callout && (
              <aside
                className={cm.cn(
                  cm.sp('p', 4),
                  'rounded-r-lg border-l-4 border-primary bg-primary/5 flex gap-3',
                )}
              >
                <span
                  className="material-symbols-outlined text-primary"
                  aria-hidden="true"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  info
                </span>
                <div>
                  <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                    {t(body.callout.titleKey, {}, { defaultValue: body.callout.titleDefault })}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.sp('mt', 1),
                      'text-on-surface-variant leading-relaxed',
                    )}
                  >
                    {t(body.callout.bodyKey, {}, { defaultValue: body.callout.bodyDefault })}
                  </p>
                </div>
              </aside>
            )}

            {body.steps.map((step) => (
              <section key={step.id} id={step.id} className={cm.cn('scroll-mt-24', cm.stack(3))}>
                <h2
                  className={cm.cn(
                    cm.textSize('2xl'),
                    cm.fontWeight('semibold'),
                    cm.sp('pb', 2),
                    'border-b border-outline-variant',
                  )}
                >
                  {t(step.headingKey, {}, { defaultValue: step.headingDefault })}
                </h2>
                <p
                  className={cm.cn(cm.textSize('base'), 'text-on-surface-variant leading-relaxed')}
                >
                  {t(step.bodyKey, {}, { defaultValue: step.bodyDefault })}
                </p>
                {step.bullets && step.bullets.length > 0 && (
                  <ol className="list-decimal list-outside ml-5 space-y-2 text-on-surface-variant marker:text-primary marker:font-semibold">
                    {step.bullets.map((b) => (
                      <li key={b.key}>{t(b.key, {}, { defaultValue: b.text })}</li>
                    ))}
                  </ol>
                )}
                {step.code && (
                  <pre
                    className={cm.cn(
                      cm.sp('p', 4),
                      'bg-secondary text-on-secondary rounded-lg font-mono text-[13px] leading-relaxed overflow-x-auto',
                    )}
                  >
                    {step.code}
                  </pre>
                )}
                {step.flow && (
                  <div
                    className={cm.cn(
                      cm.sp('p', 6),
                      'bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col items-center justify-center',
                    )}
                  >
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                        cm.w('full'),
                        'max-w-md justify-between',
                      )}
                    >
                      <div
                        className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'xs' }))}
                      >
                        <span
                          className={cm.cn(
                            cm.w(12),
                            cm.h(12),
                            cm.flex({ align: 'center', justify: 'center' }),
                            'rounded bg-surface-container border border-outline-variant',
                          )}
                          aria-hidden="true"
                        >
                          <span className="material-symbols-outlined">desktop_windows</span>
                        </span>
                        <span
                          className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}
                        >
                          {t(step.flow.fromKey, {}, { defaultValue: step.flow.fromDefault })}
                        </span>
                      </div>
                      <div
                        className={cm.cn(
                          cm.flex({ direction: 'col', align: 'center' }),
                          'flex-1 min-w-[96px] relative h-10',
                        )}
                        aria-hidden="true"
                      >
                        <span className="absolute top-1/2 left-0 right-0 h-px bg-primary/50" />
                        <span className="bg-surface-container-lowest px-2 z-10 text-[10px] font-mono text-primary relative top-1/2 -translate-y-1/2">
                          {t(step.flow.actionKey, {}, { defaultValue: step.flow.actionDefault })}
                        </span>
                      </div>
                      <div
                        className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'xs' }))}
                      >
                        <span
                          className={cm.cn(
                            cm.w(12),
                            cm.h(12),
                            cm.flex({ align: 'center', justify: 'center' }),
                            'rounded bg-primary/10 border border-primary text-primary',
                          )}
                          aria-hidden="true"
                        >
                          <span className="material-symbols-outlined">api</span>
                        </span>
                        <span
                          className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}
                        >
                          {t(
                            step.flow.toKey,
                            { appName: APP_NAME },
                            { defaultValue: step.flow.toDefault },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
