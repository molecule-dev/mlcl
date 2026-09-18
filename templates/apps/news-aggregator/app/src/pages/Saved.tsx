import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StoryListItem } from '../components/StoryListItem.js'
import { useShowBiasMeters } from '../lib/preferences.js'
import type { Story } from '../lib/sampleStories.js'
import { unwrapList } from '../lib/unwrap.js'

export function Saved() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const showBias = useShowBiasMeters()
  const [stories, setStories] = useState<ReadonlyArray<Story>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/bookmarks')
      .then((res) => {
        if (cancelled) return
        setStories(unwrapList<Story>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('saved.loadError', {}, { defaultValue: 'Failed to load your saved stories.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 1),
            'uppercase tracking-widest text-orange-800 dark:text-secondary',
          )}
        >
          {t('saved.eyebrow', {}, { defaultValue: 'Read it later' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-headline font-extrabold tracking-tight')}>
          {t('saved.heading', {}, { defaultValue: 'Saved stories' })}
        </h1>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant max-w-2xl')}
        >
          {t(
            'saved.subheading',
            {},
            {
              defaultValue:
                'Stories you bookmarked across topics. They stay here until you remove them.',
            },
          )}
        </p>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading && stories.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('saved.loading', {}, { defaultValue: 'Loading your saved stories…' })}
        </p>
      ) : stories.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/40',
          )}
        >
          <span
            className="material-symbols-outlined text-5xl text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            bookmark
          </span>
          <h2 className={cm.cn(cm.textSize('xl'), 'font-headline font-bold')}>
            {t('saved.emptyHeading', {}, { defaultValue: 'Nothing saved yet' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-md')}>
            {t(
              'saved.emptyBody',
              {},
              {
                defaultValue:
                  'Tap the bookmark icon on any story to keep it here for later reading.',
              },
            )}
          </p>
          <Link
            to="/home"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.roundedFull,
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary hover:bg-primary/90 transition-colors',
            )}
          >
            {t('saved.browseLink', {}, { defaultValue: 'Browse today’s briefing' })}
          </Link>
        </div>
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
              saved
            />
          ))}
        </div>
      )}
    </div>
  )
}
