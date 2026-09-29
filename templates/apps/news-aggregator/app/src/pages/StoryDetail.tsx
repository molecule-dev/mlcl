import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { biasBucket, BiasIndicator } from '../components/BiasIndicator.js'
import type { SourceCoverage, Story } from '../lib/sampleStories.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

function fmtAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.round(hr / 24)}d ago`
}

/** Pill tone per bias bucket — same left-blue → right-red scale as BiasIndicator's dots. */
const BUCKET_TONES: Record<ReturnType<typeof biasBucket>['key'], string> = {
  left: 'bg-blue-600 text-white',
  leanLeft: 'bg-blue-400 text-white',
  center: 'bg-slate-400 text-white',
  leanRight: 'bg-amber-500 text-white',
  right: 'bg-red-500 text-white',
}

export function StoryDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [story, setStory] = useState<Story | null>(null)
  const [coverage, setCoverage] = useState<ReadonlyArray<SourceCoverage>>([])
  const [related, setRelated] = useState<ReadonlyArray<Story>>([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/stories/${id}`).catch(() => null),
      http.get(`/api/stories/${id}/coverage`).catch(() => null),
    ])
      .then(([sRes, cRes]) => {
        if (cancelled) return
        const fetchedStory = unwrapSingle<Story>(sRes)
        const fetchedCoverage = unwrapList<SourceCoverage>(cRes)
        setStory(fetchedStory ?? null)
        setCoverage(fetchedCoverage)
        if (fetchedStory && typeof fetchedStory.saved === 'boolean') setSaved(fetchedStory.saved)
        // Domain event: opening a story IS the read (funnel: list → read).
        if (fetchedStory) {
          void track({
            name: 'article.read',
            properties: {
              article: id,
              topic: fetchedStory.topic_slug,
              sources: fetchedStory.source_count,
            },
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id])
  // Related Analysis rail: other stories in the same topic cluster.
  useEffect(() => {
    if (!story?.topic_slug) return
    let cancelled = false
    http
      .get(`/api/stories?topic=${encodeURIComponent(story.topic_slug)}&limit=5`)
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<Story>(res).filter((r) => r.id !== id)
        setRelated(list.slice(0, 4))
      })
      .catch(() => {
        if (!cancelled) setRelated([])
      })
    return () => {
      cancelled = true
    }
  }, [http, id, story?.topic_slug])

  async function handleSaveToggle() {
    if (!id) return
    const optimistic = !saved
    setSaved(optimistic)
    try {
      if (optimistic) {
        await http.post('/api/bookmarks', { article_id: id })
      } else {
        await http.delete(`/api/bookmarks/by-story/${id}`)
      }
      // Domain event: bookmark state committed server-side (success point).
      void track({
        name: optimistic ? 'bookmark.added' : 'bookmark.removed',
        properties: { article: id, saved: optimistic },
      })
    } catch (_error) {
      // Optimistic update failed — revert to previous state
      setSaved(!optimistic)
    }
  }

  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('storyDetail.loading', {}, { defaultValue: 'Loading the spectrum…' })}
      </p>
    )
  }

  if (!story) {
    return (
      <div className={cm.cn(cm.sp('py', 24), cm.textCenter)}>
        <h1 className={cm.cn(cm.textSize('2xl'), 'font-headline font-bold')}>
          {t('storyDetail.notFound', {}, { defaultValue: 'Story not found.' })}
        </h1>
        <Link to="/home" className={'text-primary font-bold hover:underline mt-4 inline-block'}>
          {t('storyDetail.backHome', {}, { defaultValue: 'Back to today’s briefing' })}
        </Link>
      </div>
    )
  }

  const sortedCoverage = [...coverage].sort((a, b) => a.bias_value - b.bias_value)

  return (
    <article
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(10))}
    >
      <header className={cm.stack(5)}>
        <div>
          <Link
            to="/home"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'min-h-[32px] uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              arrow_back
            </span>
            {t('auth.backToHome', {}, { defaultValue: 'Back to home' })}
          </Link>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
          <Link
            to={`/topics/${story.topic_slug}`}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              'text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary-dark dark:text-primary hover:bg-primary/20 transition-colors',
            )}
          >
            {story.topic}
          </Link>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
            {fmtAgo(story.published_at)}
          </span>
          <button
            type="button"
            onClick={handleSaveToggle}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'min-h-[36px] uppercase tracking-widest transition-colors ml-auto',
              saved
                ? 'bg-secondary-dark text-white'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container',
            )}
            aria-pressed={saved}
          >
            <span
              className={'material-symbols-outlined text-base'}
              style={saved ? { fontVariationSettings: "'FILL' 1" } : undefined}
              aria-hidden="true"
            >
              bookmark
            </span>
            {saved
              ? t('common.saved', {}, { defaultValue: 'Saved' })
              : t('common.save', {}, { defaultValue: 'Save' })}
          </button>
        </div>
        <h1
          className={cm.cn(
            'font-headline text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1]',
          )}
        >
          {story.headline}
        </h1>
        {story.excerpt && (
          <p
            className={cm.cn(
              cm.textSize('xl'),
              'text-on-surface-variant leading-relaxed font-headline italic',
            )}
          >
            {story.excerpt}
          </p>
        )}
      </header>

      {/* AI Summary panel — DESIGN.md §"AI Summary Panel" recipe */}
      <aside
        className={cm.cn(
          cm.sp('p', 6),
          cm.accentCard({ tone: 'primary' }),
          'rounded-[10px] bg-primary/8',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.sp('mb', 2))}>
          <span className={'material-symbols-outlined text-primary text-base'} aria-hidden="true">
            auto_awesome
          </span>
          <p className={cm.accentCardLabel({ tone: 'primary' })}>
            {t('storyDetail.aiSummary', {}, { defaultValue: 'AI Summary' })}
          </p>
        </div>
        <p className={cm.cn(cm.textSize('base'), 'text-on-surface leading-relaxed')}>
          {t(
            'storyDetail.aiSummaryBody',
            { count: sortedCoverage.length },
            {
              defaultValue:
                'Across {{count}} outlets the agreement is described as a meaningful step. Centrist and centre-left coverage emphasises the new compliance framework; right-leaning coverage focuses on cost and enforcement; international press treats it as procedural.',
            },
          )}
        </p>
      </aside>

      {/* Bias spectrum across all sources covering the story */}
      <section className={cm.stack(4)}>
        <header
          className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'sm' })}
        >
          <h2 className={cm.cn(cm.textSize('xl'), 'font-headline font-bold')}>
            {t('storyDetail.spectrumHeading', {}, { defaultValue: 'Source spectrum' })}
          </h2>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'text-on-surface-variant uppercase tracking-widest font-bold',
            )}
          >
            {t(
              'storyDetail.spectrumCount',
              { count: sortedCoverage.length },
              { defaultValue: '{{count}} sources covering' },
            )}
          </span>
        </header>
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface rounded-2xl shadow-sm border border-outline-variant/40',
          )}
        >
          <BiasIndicator value={story.average_bias} variant="spectrum" />
        </div>
      </section>

      {/* Multi-source comparison table */}
      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), 'font-headline font-bold')}>
          {t('storyDetail.coverageHeading', {}, { defaultValue: 'How each outlet framed it' })}
        </h2>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          {sortedCoverage.map((c) => {
            const bucket = biasBucket(c.bias_value)
            return (
              <article
                key={c.source_slug + c.headline}
                className={cm.cn(
                  cm.sp('p', 5),
                  'bg-surface rounded-xl border border-outline-variant/40 shadow-sm hover:shadow-md transition-shadow',
                )}
              >
                <header
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
                    cm.sp('mb', 2),
                  )}
                >
                  <Link
                    to={`/sources/${c.source_slug}`}
                    className={cm.cn(
                      cm.textSize('sm'),
                      'font-bold text-on-surface hover:text-primary',
                    )}
                  >
                    {c.source_name}
                  </Link>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.roundedFull,
                      'text-[10px] font-black uppercase tracking-widest',
                      BUCKET_TONES[bucket.key],
                    )}
                  >
                    {t(`biasIndicator.${bucket.key}`, {}, { defaultValue: bucket.defaultLabel })}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant uppercase tracking-widest font-semibold',
                    )}
                  >
                    {t(
                      'storyDetail.coverageFactual',
                      { rating: c.factual_rating },
                      { defaultValue: '{{rating}}% factual' },
                    )}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant tabular-nums ml-auto',
                    )}
                  >
                    {fmtAgo(c.published_at)}
                  </span>
                </header>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    'font-headline font-bold text-on-surface mb-2 leading-snug',
                  )}
                >
                  {c.headline}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {c.excerpt}
                </p>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mt', 3),
                    'inline-flex items-center min-h-[32px] gap-1 font-bold text-primary-dark dark:text-primary hover:underline uppercase tracking-widest',
                  )}
                >
                  {t('storyDetail.readSource', {}, { defaultValue: 'Read at source' })}
                  <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                    open_in_new
                  </span>
                </a>
              </article>
            )
          })}
        </div>
      </section>

      {/* Related Analysis — same-topic stories rail from the design's right column */}
      <section className={cm.stack(4)} data-mol-id="related-analysis">
        <h2
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'uppercase tracking-wider text-on-surface',
          )}
        >
          <span className={'material-symbols-outlined text-primary text-base'} aria-hidden="true">
            analytics
          </span>
          {t('storyDetail.relatedHeading', {}, { defaultValue: 'Related Analysis' })}
        </h2>
        {related.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('storyDetail.relatedEmpty', {}, { defaultValue: 'No related analysis yet.' })}
          </p>
        ) : (
          <div className={cm.cn(cm.stack(4))}>
            {related.map((r) => (
              <Link key={r.id} to={`/stories/${r.id}`} className={cm.cn('group')}>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-wider text-on-surface-variant',
                  )}
                >
                  {r.topic}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('bold'),
                    'leading-snug group-hover:text-primary transition-colors',
                  )}
                >
                  {r.headline}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </article>
  )
}
