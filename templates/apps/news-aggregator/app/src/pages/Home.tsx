import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StoryHeroCard } from '../components/StoryHeroCard.js'
import { StoryListItem } from '../components/StoryListItem.js'
import { TopicChipsRow } from '../components/TopicChipsRow.js'
import { useShowBiasMeters } from '../lib/preferences.js'
import type { Story, Topic } from '../lib/sampleStories.js'
import { unwrapList } from '../lib/unwrap.js'

export function Home() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const showBias = useShowBiasMeters()
  const [stories, setStories] = useState<ReadonlyArray<Story>>([])
  const [topics, setTopics] = useState<ReadonlyArray<Topic>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([http.get('/api/stories'), http.get('/api/topics')])
      .then(([sRes, tRes]) => {
        if (cancelled) return
        setStories(unwrapList<Story>(sRes))
        setTopics(unwrapList<Topic>(tRes))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('home.loadError', {}, { defaultValue: 'Failed to load stories.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const featured = stories[0]
  const remaining = useMemo(() => stories.slice(1), [stories])

  if (error) {
    return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 1),
            'uppercase tracking-widest text-orange-800 dark:text-secondary',
          )}
        >
          {t('home.eyebrow', {}, { defaultValue: "Today's briefing" })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-headline font-extrabold tracking-tight')}>
          {t('home.heading', {}, { defaultValue: 'Top stories across the spectrum' })}
        </h1>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant max-w-2xl')}
        >
          {t(
            'home.subheading',
            {},
            {
              defaultValue:
                'Curated multi-source coverage of every story. Bias surfaced, not hidden.',
            },
          )}
        </p>
      </header>

      <TopicChipsRow
        heading={t('home.topicsHeading', {}, { defaultValue: 'Filter by topic' })}
        // API topics use snake_case `story_count`; the chip row reads
        // camelCase `storyCount` — map it so the count badges render.
        topics={topics.map((tp) => ({ ...tp, storyCount: tp.story_count }))}
      />

      {loading ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('home.loading', {}, { defaultValue: 'Curating today’s briefing…' })}
        </p>
      ) : stories.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('home.empty', {}, { defaultValue: 'No stories yet — try following a few sources.' })}
        </p>
      ) : (
        <>
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
              eyebrow={t('home.featuredEyebrow', {}, { defaultValue: 'Top story' })}
              eyebrowTone="trending"
            />
          )}

          <section className={cm.stack(4)}>
            <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
              <h2 className={cm.cn(cm.textSize('xl'), 'font-headline font-bold')}>
                {t('home.morePicksHeading', {}, { defaultValue: 'More picks for you' })}
              </h2>
              <Link
                to="/topics"
                className={cm.cn(
                  cm.textSize('sm'),
                  'font-bold text-primary-dark dark:text-primary hover:underline',
                )}
              >
                {t('home.viewAllLink', {}, { defaultValue: 'Browse topics →' })}
              </Link>
            </div>
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
          </section>
        </>
      )}
    </div>
  )
}
