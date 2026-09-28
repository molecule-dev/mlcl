import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { biasBucket, BiasIndicator } from '../components/BiasIndicator.js'
import { StoryListItem } from '../components/StoryListItem.js'
import { useShowBiasMeters } from '../lib/preferences.js'
import type { Source, Story } from '../lib/sampleStories.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

export function SourceDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const showBias = useShowBiasMeters()
  const { slug } = useParams<{ slug: string }>()
  const [source, setSource] = useState<Source | null>(null)
  const [stories, setStories] = useState<ReadonlyArray<Story>>([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/sources/by-slug/${slug}`).catch(() => null),
      http.get(`/api/sources/${slug}/stories`).catch(() => null),
    ])
      .then(([sRes, stRes]) => {
        if (cancelled) return
        const fetchedSource = unwrapSingle<Source>(sRes)
        const fetchedStories = unwrapList<Story>(stRes)
        setSource(fetchedSource ?? null)
        setStories(fetchedStories)
        if (fetchedSource) setFollowing(fetchedSource.following)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, slug])

  async function handleFollowToggle() {
    if (!slug) return
    const optimistic = !following
    setFollowing(optimistic)
    try {
      const res = await http.post(`/api/sources/${slug}/follow`, {})
      const next = res as { following?: boolean; data?: { following?: boolean } } | null
      const persisted = next?.following ?? next?.data?.following
      const value = typeof persisted === 'boolean' ? persisted : optimistic
      if (typeof persisted === 'boolean') setFollowing(persisted)
      // Domain event: follow state committed server-side (success point).
      void track({
        name: value ? 'source.followed' : 'source.unfollowed',
        properties: { source: slug, following: value },
      })
    } catch (_error) {
      // Optimistic update failed — revert to previous state
      setFollowing(!optimistic)
    }
  }

  const accent = useMemo(() => source?.accent_color ?? 'var(--color-primary)', [source])

  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('sourceDetail.loading', {}, { defaultValue: 'Loading source…' })}
      </p>
    )
  }

  if (!source) {
    return (
      <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
        <h1 className={cm.cn(cm.textSize('2xl'), 'font-headline font-bold')}>
          {t('sourceDetail.notFound', {}, { defaultValue: 'Source not found.' })}
        </h1>
        <Link to="/sources" className={'text-primary font-bold hover:underline mt-4 inline-block'}>
          {t('sourceDetail.allSources', {}, { defaultValue: 'See all sources' })}
        </Link>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header
        className={cm.cn(
          cm.sp('p', 8),
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.accentCard({ tone: 'custom' }),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/40',
        )}
        style={{ ['--mol-accent' as string]: accent }}
      >
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          <div
            className={cm.cn(
              cm.w(14),
              cm.h(14),
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-xl bg-surface text-primary shadow-sm overflow-hidden',
            )}
          >
            {source.icon_url ? (
              <img src={source.icon_url} alt="" className={'w-full h-full object-contain'} />
            ) : (
              <span className="material-symbols-outlined text-3xl" aria-hidden="true">
                rss_feed
              </span>
            )}
          </div>
          <div className={'flex-1 min-w-0'}>
            <p className={cm.accentCardLabel({ tone: 'custom' })}>
              {t('sourceDetail.eyebrow', {}, { defaultValue: 'Source profile' })}
            </p>
            <h1
              className={cm.cn(cm.textSize('4xl'), 'font-headline font-extrabold tracking-tight')}
            >
              {source.name}
            </h1>
            {source.description && (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
                {source.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleFollowToggle}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'transition-colors',
              following
                ? 'bg-primary text-on-primary hover:bg-primary/90'
                : 'bg-on-surface text-surface hover:bg-on-surface/90',
            )}
            aria-pressed={following}
          >
            {following
              ? t('common.following', {}, { defaultValue: 'Following' })
              : t('common.follow', {}, { defaultValue: 'Follow' })}
          </button>
        </div>

        <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-2 md:grid-cols-4')}>
          {[
            {
              key: 'factual',
              label: 'Factual rating',
              value: `${source.factual_rating}%`,
              icon: 'verified',
            },
            {
              key: 'stories',
              label: 'Stories indexed',
              value: source.story_count.toString(),
              icon: 'feed',
            },
            {
              key: 'bias',
              label: 'Bias position',
              // Same buckets + translations as the spectrum label below.
              value: t(
                `biasIndicator.${biasBucket(source.bias_value).key}`,
                {},
                {
                  defaultValue: biasBucket(source.bias_value).defaultLabel,
                },
              ),
              icon: 'balance',
            },
            {
              key: 'ownership',
              label: 'Ownership',
              value: source.ownership ?? '—',
              icon: 'corporate_fare',
            },
          ].map((stat) => (
            <div
              key={stat.key}
              className={cm.cn(
                cm.sp('p', 4),
                'rounded-xl bg-surface border border-outline-variant/40 shadow-sm',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'text-primary mb-1')}>
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  {stat.icon}
                </span>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(`sourceDetail.stat.${stat.key}`, {}, { defaultValue: stat.label })}
                </p>
              </div>
              <p className={cm.cn(cm.textSize('lg'), 'font-extrabold tabular-nums')}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mb', 2),
              'font-bold uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('sourceDetail.spectrumLabel', {}, { defaultValue: 'Position on the bias spectrum' })}
          </p>
          <BiasIndicator value={source.bias_value} variant="spectrum" />
        </div>
      </header>

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), 'font-headline font-bold')}>
          {t('sourceDetail.recentHeading', {}, { defaultValue: 'Recent stories from this source' })}
        </h2>
        {stories.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('sourceDetail.empty', {}, { defaultValue: 'No recent coverage from this source.' })}
          </p>
        ) : (
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
            {stories.map((s) => (
              <StoryListItem
                key={s.id}
                id={s.id}
                headline={s.headline}
                excerpt={s.excerpt}
                topic={s.topic}
                topicSlug={s.topic_slug}
                sourceCount={s.source_count}
                averageBias={s.average_bias}
                showBias={showBias}
                publishedAt={s.published_at}
                imageUrl={s.image_url}
                saved={s.saved}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
