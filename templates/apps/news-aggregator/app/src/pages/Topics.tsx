import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BiasIndicator } from '../components/BiasIndicator.js'
import type { Topic } from '../lib/sampleStories.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface TopicWithFollow extends Topic {
  following?: boolean
}

export function Topics() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [topics, setTopics] = useState<ReadonlyArray<TopicWithFollow>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingSlug, setPendingSlug] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/topics')
      .then((res) => {
        if (cancelled) return
        setTopics(unwrapList<TopicWithFollow>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('topics.loadError', {}, { defaultValue: 'Failed to load topics.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const handleFollowToggle = useCallback(
    async (slug: string) => {
      const target = topics.find((tt) => tt.slug === slug)
      if (!target) return
      const optimisticFollowing = !target.following
      setPendingSlug(slug)
      setTopics((prev) =>
        prev.map((tt) => (tt.slug === slug ? { ...tt, following: optimisticFollowing } : tt)),
      )
      try {
        const res = await http.post(`/api/topics/${slug}/follow`, {})
        const persisted = unwrapSingle<{ following?: boolean }>(res)
        const next = persisted?.following ?? optimisticFollowing
        setTopics((prev) => prev.map((tt) => (tt.slug === slug ? { ...tt, following: next } : tt)))
        // Domain event: follow state committed server-side (success point).
        void track({
          name: next ? 'topic.followed' : 'topic.unfollowed',
          properties: { topic: slug, following: next },
        })
      } catch (_error) {
        // Optimistic update failed — revert to previous state
        setTopics((prev) =>
          prev.map((tt) => (tt.slug === slug ? { ...tt, following: !optimisticFollowing } : tt)),
        )
      } finally {
        setPendingSlug(null)
      }
    },
    [http, topics],
  )

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
          {t('topics.eyebrow', {}, { defaultValue: 'Browse the spectrum' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-headline font-extrabold tracking-tight')}>
          {t('topics.heading', {}, { defaultValue: 'Topics' })}
        </h1>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant max-w-2xl')}
        >
          {t(
            'topics.subheading',
            {},
            {
              defaultValue:
                'Follow the topics you care about. Bias is averaged across the sources covering each one.',
            },
          )}
        </p>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading && topics.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('topics.loading', {}, { defaultValue: 'Loading topics…' })}
        </p>
      ) : topics.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('topics.empty', {}, { defaultValue: 'No topics yet.' })}
        </p>
      ) : (
        <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}>
          {topics.map((topic) => (
            <article
              key={topic.slug}
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'md' }),
                cm.sp('p', 6),
                'bg-surface rounded-2xl border border-outline-variant/40 shadow-sm hover:shadow-md transition-all group',
              )}
              style={
                topic.accent_color
                  ? { borderLeftColor: topic.accent_color, borderLeftWidth: '4px' }
                  : undefined
              }
            >
              <header className={cm.flex({ align: 'center', gap: 'md' })}>
                <Link
                  to={`/topics/${topic.slug}`}
                  className={cm.cn(
                    cm.w(11),
                    cm.h(11),
                    cm.flex({ align: 'center', justify: 'center' }),
                    'rounded-xl bg-surface-container-low text-primary group-hover:scale-110 transition-transform',
                  )}
                  aria-label={topic.label}
                >
                  <span className={'material-symbols-outlined text-2xl'} aria-hidden="true">
                    {topic.icon}
                  </span>
                </Link>
                <div className="flex-1 min-w-0">
                  <h2
                    className={cm.cn(
                      cm.textSize('xl'),
                      'font-headline font-extrabold tracking-tight',
                    )}
                  >
                    <Link
                      to={`/topics/${topic.slug}`}
                      className="hover:text-primary transition-colors"
                    >
                      {topic.label}
                    </Link>
                  </h2>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t(
                      'topics.storyCount',
                      { count: topic.story_count },
                      { defaultValue: '{{count}} stories today' },
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleFollowToggle(topic.slug)}
                  disabled={pendingSlug === topic.slug}
                  aria-pressed={!!topic.following}
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-full uppercase tracking-widest transition-colors',
                    topic.following
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low text-primary hover:bg-primary hover:text-on-primary',
                    pendingSlug === topic.slug ? 'opacity-60 cursor-wait' : '',
                  )}
                >
                  {topic.following
                    ? t('common.following', {}, { defaultValue: 'Following' })
                    : t('common.follow', {}, { defaultValue: 'Follow' })}
                </button>
              </header>
              {topic.average_bias !== undefined && (
                <BiasIndicator value={topic.average_bias} variant="spectrum" hideLabel />
              )}
              <Link
                to={`/topics/${topic.slug}`}
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'inline-flex items-center min-h-[32px] gap-1 self-start uppercase tracking-widest text-primary hover:translate-x-1 transition-transform',
                )}
              >
                {t('topics.openLink', {}, { defaultValue: 'Open topic' })}
                <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
