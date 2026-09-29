import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SeoScoreRing } from '../components/SeoScoreRing.js'

interface AnalysisRow {
  id: string
  document_id: string
  target_keywords: string[] | string
  score: number
  suggestions: SeoSuggestion[] | string
  analyzed_at: string
}

interface DocumentRow {
  id: string
  title: string
}

interface SeoSuggestion {
  kind: 'keyword' | 'length' | 'readability' | 'structure'
  message: string
}

const SEVERITY_FOR_KIND: Record<
  SeoSuggestion['kind'],
  { tone: 'error' | 'custom' | 'info'; icon: string; severity: 'high' | 'medium' | 'low' }
> = {
  length: { tone: 'error', icon: 'priority_high', severity: 'high' },
  structure: { tone: 'error', icon: 'priority_high', severity: 'high' },
  keyword: { tone: 'custom', icon: 'flag', severity: 'medium' },
  readability: { tone: 'info', icon: 'lightbulb', severity: 'low' },
}

function parseList<T>(value: T[] | string | undefined): T[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch (_error) {
      // Invalid JSON stored in the field — fall back to empty array.
      return []
    }
  }
  return []
}

export function SEOAnalysis() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [analyses, setAnalyses] = useState<AnalysisRow[] | null>(null)
  const [docTitle, setDocTitle] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  // Name the draft under analysis — the design leads the page with the
  // document's own title so the writer always knows what is being scored.
  useEffect(() => {
    let cancelled = false
    if (!id) return
    http
      .get<DocumentRow>(`/documents/${id}`)
      .then((res) => {
        if (cancelled) return
        const title = res.data?.title
        if (typeof title === 'string' && title.trim()) setDocTitle(title.trim())
      })
      .catch(() => {
        // The analysis list is the page's substance; a failed title lookup
        // only drops the sub-line, never the report.
      })
    return () => {
      cancelled = true
    }
  }, [http, id])

  const fetchAnalyses = (signal?: { cancelled: boolean }) => {
    if (!id) return
    http
      .get<AnalysisRow[]>(`/seo/documents/${id}/analyses`)
      .then((res) => {
        if (signal?.cancelled) return
        setAnalyses(Array.isArray(res.data) ? res.data : [])
        setError(null)
      })
      .catch(() => {
        if (signal?.cancelled) return
        setAnalyses([])
        setError(t('seoAnalysis.loadError', {}, { defaultValue: 'Could not load SEO analyses.' }))
      })
  }

  useEffect(() => {
    const signal = { cancelled: false }
    fetchAnalyses(signal)
    return () => {
      signal.cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, id])

  async function runAnalysis() {
    if (!id) return
    setRunning(true)
    try {
      await http.post(`/seo/documents/${id}/analyze`, { target_keywords: [] })
      track({ name: 'seo.analysis_completed', properties: { documentId: id } })
      fetchAnalyses()
    } catch (error) {
      logError('seoAnalysis.run', error)
      setError(t('seoAnalysis.runFailed', {}, { defaultValue: 'Could not run analysis.' }))
    } finally {
      setRunning(false)
    }
  }

  const latest = analyses?.[0] ?? null
  const score = latest ? Number(latest.score ?? 0) : 0
  const targetKeywords = parseList<string>(latest?.target_keywords)
  const suggestions = parseList<SeoSuggestion>(latest?.suggestions)

  return (
    <div className={cm.cn(cm.sp('p', 8), 'bg-background min-h-screen')}>
      <div className={cm.cn('max-w-7xl', cm.mxAuto, cm.stack(8))}>
        <div
          className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
        >
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('seoAnalysis.eyebrow', {}, { defaultValue: 'SEO analysis' })}
            </p>
            <h1
              className={cm.cn(
                cm.sp('mt', 1),
                'text-3xl font-extrabold tracking-tight font-serif text-on-background',
              )}
            >
              {t('seoAnalysis.title', {}, { defaultValue: 'How this draft will travel' })}
            </h1>
            {docTitle ? (
              <p
                data-mol-id="seo-analysis-document-title"
                className={cm.cn(
                  cm.sp('mt', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant',
                )}
              >
                <span className="material-symbols-outlined align-[-3px] text-[16px] text-primary">
                  description
                </span>{' '}
                {docTitle}
              </p>
            ) : null}
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <button
              type="button"
              onClick={runAnalysis}
              disabled={running || !id}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-60',
              )}
            >
              {running
                ? t('seoAnalysis.running', {}, { defaultValue: 'Analyzing…' })
                : t('seoAnalysis.run', {}, { defaultValue: 'Run analysis' })}
            </button>
            <Link
              to={`/documents/${id ?? ''}`}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_back
              </span>
              {t('seoAnalysis.backToEditor', {}, { defaultValue: 'Back to editor' })}
            </Link>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 4),
              cm.textSize('sm'),
              'rounded-lg bg-error-container text-on-error-container',
            )}
          >
            {error}
          </div>
        ) : null}

        <section
          className={cm.cn(
            cm.sp('p', 8),
            cm.flex({ align: 'center', gap: 'xl', wrap: 'wrap' }),
            'rounded-2xl bg-gradient-to-br from-primary-container/40 via-surface to-surface border border-outline-variant',
          )}
        >
          <SeoScoreRing
            score={score}
            size={140}
            captionKey="seoAnalysis.scoreCaption"
            captionDefault="Overall"
          />
          <div className={cm.cn(cm.stack(2), 'flex-1 min-w-[260px]')}>
            <h2
              className={cm.cn('text-2xl font-extrabold tracking-tight font-serif text-on-surface')}
            >
              {analyses === null
                ? t('seoAnalysis.loading', {}, { defaultValue: 'Loading analysis…' })
                : analyses.length === 0
                  ? t(
                      'seoAnalysis.heroEmpty',
                      {},
                      {
                        defaultValue: 'No analysis yet. Run one to score this draft.',
                      },
                    )
                  : score >= 80
                    ? t(
                        'seoAnalysis.heroStrong',
                        {},
                        { defaultValue: 'Strong piece — small lifts away from excellent.' },
                      )
                    : t(
                        'seoAnalysis.heroNeedsWork',
                        {},
                        { defaultValue: 'Some structural lifts will boost reach.' },
                      )}
            </h2>
            <p className={cm.cn(cm.textMuted, 'leading-relaxed font-serif italic')}>
              {analyses && analyses.length > 0
                ? t(
                    'seoAnalysis.heroBody',
                    { count: suggestions.length },
                    {
                      defaultValue:
                        '{{count}} suggestion(s) to apply. Each one is a structural or keyword lift, not a wall of red flags.',
                    },
                  )
                : t(
                    'seoAnalysis.heroBodyEmpty',
                    {},
                    {
                      defaultValue:
                        'Click "Run analysis" to score readability, keyword density, and structure.',
                    },
                  )}
            </p>
          </div>
        </section>

        <div className={cm.cn(cm.grid({ gap: 'xl' }), 'grid-cols-1 lg:grid-cols-2')}>
          <section
            className={cm.cn(cm.sp('p', 6), 'rounded-xl bg-surface border border-outline-variant')}
          >
            <h3
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('mb', 4),
                'text-lg font-extrabold tracking-tight font-serif',
              )}
            >
              <span className="material-symbols-outlined text-primary" aria-hidden="true">
                vpn_key
              </span>
              {t('seoAnalysis.keywordTitle', {}, { defaultValue: 'Target keywords' })}
            </h3>
            {targetKeywords.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'font-serif italic')}>
                {t(
                  'seoAnalysis.keywordEmpty',
                  {},
                  {
                    defaultValue:
                      'No target keywords configured. The next analysis will use document content as-is.',
                  },
                )}
              </p>
            ) : (
              <ul className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }))}>
                {targetKeywords.map((kw, i) => (
                  <li
                    key={`${kw}-${i}`}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.roundedFull,
                      cm.fontWeight('semibold'),
                      cm.textSize('xs'),
                      'uppercase tracking-widest bg-primary-container text-on-primary-container border border-primary/20',
                    )}
                  >
                    {kw}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className={cm.cn(cm.sp('p', 6), 'rounded-xl bg-surface border border-outline-variant')}
          >
            <h3
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('mb', 4),
                'text-lg font-extrabold tracking-tight font-serif',
              )}
            >
              <span className="material-symbols-outlined text-info" aria-hidden="true">
                history
              </span>
              {t('seoAnalysis.historyTitle', {}, { defaultValue: 'Analysis history' })}
            </h3>
            {analyses === null ? (
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
              </p>
            ) : analyses.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'font-serif italic')}>
                {t(
                  'seoAnalysis.historyEmpty',
                  {},
                  { defaultValue: 'No previous analyses recorded.' },
                )}
              </p>
            ) : (
              <ul className="divide-y divide-outline-variant">
                {analyses.slice(0, 10).map((a) => (
                  <li
                    key={a.id}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('py', 3),
                    )}
                  >
                    <span className={cm.cn(cm.textSize('sm'), 'font-mono')}>
                      {new Date(a.analyzed_at).toLocaleString()}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        'font-mono tabular-nums text-on-surface-variant',
                      )}
                    >
                      {Number(a.score)}/100
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className={cm.stack(4)}>
          <h3
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              'text-lg font-extrabold tracking-tight font-serif',
            )}
          >
            <span className="material-symbols-outlined text-secondary" aria-hidden="true">
              tips_and_updates
            </span>
            {t('seoAnalysis.suggestionsTitle', {}, { defaultValue: 'Suggested edits' })}
          </h3>
          {suggestions.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'font-serif italic')}>
              {t(
                'seoAnalysis.suggestionsEmpty',
                {},
                {
                  defaultValue:
                    'No active suggestions. Run a fresh analysis to generate edit recommendations.',
                },
              )}
            </p>
          ) : (
            <div className={cm.cn(cm.stack(3))}>
              {suggestions.map((s, i) => {
                const sev = SEVERITY_FOR_KIND[s.kind] ?? SEVERITY_FOR_KIND.readability
                return (
                  <article
                    key={i}
                    className={cm.cn(
                      cm.sp('p', 5),
                      cm.accentCard({ tone: sev.tone }),
                      'rounded-xl bg-surface border border-outline-variant',
                    )}
                    style={
                      sev.tone === 'custom'
                        ? { ['--mol-accent' as string]: 'var(--color-secondary)' }
                        : undefined
                    }
                  >
                    <header
                      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 2))}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-base')}
                        aria-hidden="true"
                      >
                        {sev.icon}
                      </span>
                      <h4 className={cm.cn(cm.fontWeight('bold'), 'font-serif text-base')}>
                        {t(`seoAnalysis.kind.${s.kind}`, {}, { defaultValue: s.kind })}
                      </h4>
                      <span
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          cm.sp('px', 2),
                          cm.roundedFull,
                          'text-[10px] uppercase tracking-widest ml-auto py-0.5',
                          sev.severity === 'high'
                            ? 'bg-error-container text-on-error-container'
                            : sev.severity === 'medium'
                              ? 'bg-secondary-container text-on-secondary-container'
                              : 'bg-info-container text-on-info-container',
                        )}
                      >
                        {t(
                          `seoAnalysis.severity.${sev.severity}`,
                          {},
                          { defaultValue: sev.severity },
                        )}
                      </span>
                    </header>
                    <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'leading-relaxed')}>
                      {s.message}
                    </p>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default SEOAnalysis
export { SEOAnalysis as SEOAnalysisPage }
