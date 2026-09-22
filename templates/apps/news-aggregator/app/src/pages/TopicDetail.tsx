import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BiasIndicator } from '../components/BiasIndicator.js'
import { StoryHeroCard } from '../components/StoryHeroCard.js'
import { StoryListItem } from '../components/StoryListItem.js'
import { useShowBiasMeters } from '../lib/preferences.js'
import type { Story, Topic } from '../lib/sampleStories.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

export function TopicDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const showBias = useShowBiasMeters()
  const { slug } = useParams<{ slug: string }>()
  const [topic, setTopic] = useState<Topic | null>(null)
  const [stories, setStories] = useState<ReadonlyArray<Story>>([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/topics/${slug}`).catch(() => null),
      http.get(`/api/topics/${slug}/stories`).catch(() => null),
    ])
      .then(([tRes, sRes]) => {
        if (cancelled) return
        const fetchedTopic = unwrapSingle<Topic & { following?: boolean }>(tRes)
        const fetchedStories = unwrapList<Story>(sRes)
        setTopic(fetchedTopic ?? null)
        setStories(fetchedStories)
        if (fetchedTopic && typeof fetchedTopic.following === 'boolean') {
          setFollowing(fetchedTopic.following)
        }
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
      const res = await http.post(`/api/topics/${slug}/follow`, {})
      const next = res as { following?: boolean; data?: { following?: boolean } } | null
      const persisted = next?.following ?? next?.data?.following
      const value = typeof persisted === 'boolean' ? persisted : optimistic
      if (typeof persisted === 'boolean') setFollowing(persisted)
      // Domain event: follow state committed server-side (success point).
      void track({
        name: value ? 'topic.followed' : 'topic.unfollowed',
        properties: { topic: slug, following: value },
      })
    } catch (_error) {
      // Optimistic update failed — revert to previous state
      setFollowing(!optimistic)
    }
  }

  const featured = stories[0]
  const remaining = useMemo(() => stories.slice(1), [stories])

  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('topicDetail.loading', {}, { defaultValue: 'Loading topic…' })}
      </p>
    )
  }

  if (!topic) {
    return (
      <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
        <h1 className={cm.cn(cm.textSize('2xl'), 'font-headline font-bold')}>
          {t('topicDetail.notFound', {}, { defaultValue: 'Topic not found.' })}
        </h1>
        <Link to="/topics" className={'text-primary font-bold hover:underline mt-4 inline-block'}>
          {t('topicDetail.allTopics', {}, { defaultValue: 'See all topics' })}
        </Link>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header
        className={cm.cn(
          cm.sp('p', 8),
          cm.flex({ direction: 'col', gap: 'md' }),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/40',
        )}
        style={
          topic.accent_color
            ? { borderLeftColor: topic.accent_color, borderLeftWidth: '4px' }
            : undefined
        }
      >
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          <div
            className={cm.cn(
              cm.w(14),
              cm.h(14),
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-xl text-white shadow-md',
            )}
            style={{
              background: `linear-gradient(135deg, ${topic.accent_color ?? 'var(--mol-color-primary)'}, color-mix(in srgb, ${topic.accent_color ?? 'var(--mol-color-primary)'} 60%, white))`,
            }}
          >
            <span className="material-symbols-outlined text-3xl" aria-hidden="true">
              {topic.icon}
            </span>
          </div>
          <div className={'flex-1'}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('topicDetail.eyebrow', {}, { defaultValue: 'Topic' })}
            </p>
            <h1
              className={cm.cn(cm.textSize('4xl'), 'font-headline font-extrabold tracking-tight')}
            >
              {topic.label}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
              {t(
                'topicDetail.storyCount',
                { count: topic.story_count },
                { defaultValue: '{{count}} stories today across the spectrum' },
              )}
            </p>
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
        {topic.average_bias !== undefined && (
          <div className={cm.sp('mt', 2)}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mb', 2),
                'font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(
                'topicDetail.spectrumLabel',
                {},
                { defaultValue: 'Average bias across covering sources' },
              )}
            </p>
            <BiasIndicator value={topic.average_bias} variant="spectrum" />
          </div>
        )}
      </header>

      {featured && (
        <StoryHeroCard
          id={featured.id}
          headline={featured.headline}
          excerpt={featured.excerpt}
          topic={featured.topic}
          topicSlug={featured.topic_slug}
          sourceCount={featured.source_count}
          publishedAt={featured.published_at}
          imageUrl={featured.image_url}
          eyebrow={t('topicDetail.featuredEyebrow', {}, { defaultValue: 'Top in topic' })}
          eyebrowTone="trending"
        />
      )}

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), 'font-headline font-bold')}>
          {t('topicDetail.morePicksHeading', {}, { defaultValue: 'More in this topic' })}
        </h2>
        {remaining.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('topicDetail.empty', {}, { defaultValue: 'No more stories yet — check back soon.' })}
          </p>
        ) : (
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
            {remaining.map((s) => (
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
