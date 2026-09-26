/**
 * Feed — /feed personalized thread feed.
 *
 * Layout: filter bar → 2-col grid (feed column max 780px + community
 * sidebar 300px). Each row is a ThreadRow.
 *
 * Loads real threads from `GET /api/threads?sort=...` (decorated with
 * category + author on the server) and re-fetches when the active
 * filter changes.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import { getClient as getHttpClient } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { CommunitySidebar } from '../components/CommunitySidebar.js'
import { ThreadRow } from '../components/ThreadRow.js'
import { type ApiThread, decorateApiThreadToRow } from '../utils/threads.js'

const FILTERS = [
  { id: 'best', labelKey: 'feed.filterBest', defaultLabel: 'Best', sort: 'top' as const },
  { id: 'hot', labelKey: 'feed.filterHot', defaultLabel: 'Hot', sort: 'active' as const },
  { id: 'new', labelKey: 'feed.filterNew', defaultLabel: 'New', sort: 'latest' as const },
  { id: 'top', labelKey: 'feed.filterTop', defaultLabel: 'Top', sort: 'top' as const },
] as const

type FilterId = (typeof FILTERS)[number]['id']

export function Feed() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [active, setActive] = useState<FilterId>('best')
  const [apiThreads, setApiThreads] = useState<ApiThread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [voteState, setVoteState] = useState<Record<string, 'up' | 'down' | null>>({})

  const loadThreads = useCallback(
    async (sort: string) => {
      setLoading(true)
      setError(null)
      try {
        const http = getHttpClient()
        const res = await http.get<{ data: ApiThread[] }>(`/api/threads?sort=${sort}&limit=25`)
        setApiThreads(res.data.data ?? [])
      } catch (error) {
        logError('feed.loadThreads', error)
        setError(t('feed.loadError', {}, { defaultValue: 'Could not load feed.' }))
      } finally {
        setLoading(false)
      }
    },
    [t],
  )

  useEffect(() => {
    const filter = FILTERS.find((f) => f.id === active)
    void loadThreads(filter?.sort ?? 'latest')
  }, [active, loadThreads])

  const handleVote = useCallback(
    async (threadId: string, next: 'up' | 'down' | null) => {
      const prev = voteState[threadId] ?? null
      if (prev === next) return
      setVoteState((s) => ({ ...s, [threadId]: next }))
      setApiThreads((list) =>
        list.map((th) => {
          if (th.id !== threadId) return th
          let delta = 0
          if (prev === 'up') delta -= 1
          if (prev === 'down') delta += 1
          if (next === 'up') delta += 1
          if (next === 'down') delta -= 1
          return { ...th, vote_score: (th.vote_score ?? 0) + delta }
        }),
      )
      try {
        const http = getHttpClient()
        await http.post('/api/votes', {
          target_type: 'thread',
          target_id: threadId,
          direction: next,
        })
      } catch (error) {
        logError('feed.handleVote', error)
        setVoteState((s) => ({ ...s, [threadId]: prev }))
      }
    },
    [voteState],
  )

  const rows = useMemo(
    () => apiThreads.map((th) => decorateApiThreadToRow(th, voteState[th.id] ?? null)),
    [apiThreads, voteState],
  )

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
          {t('feed.title', {}, { defaultValue: 'Your feed' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'feed.subtitle',
            {},
            {
              defaultValue:
                'Threads from the communities you follow, plus a few you might. Vote to teach the algorithm.',
            },
          )}
        </p>
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
        {FILTERS.map((filter) => {
          const isActive = filter.id === active
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActive(filter.id)}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-full transition-colors',
                isActive
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/60',
              )}
            >
              {t(filter.labelKey, {}, { defaultValue: filter.defaultLabel })}
            </button>
          )
        })}
      </div>

      <div className={cm.cn('grid gap-6 grid-cols-1 lg:grid-cols-[1fr_300px]')}>
        <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'min-w-0')}>
          {loading && (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          )}
          {error && <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p>}
          {!loading && !error && rows.length === 0 && (
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm', align: 'center' }),
                cm.sp('p', 8),
                'rounded-lg border border-dashed border-outline-variant/60 text-on-surface-variant text-center',
              )}
            >
              <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                {t('feed.empty', {}, { defaultValue: 'No threads yet.' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'))}>
                {t(
                  'feed.emptyHint',
                  {},
                  {
                    defaultValue: 'Be the first to start a discussion — head to Compose.',
                  },
                )}
              </p>
            </div>
          )}
          {rows.map((thread) => (
            <ThreadRow key={thread.id} thread={thread} onVote={handleVote} />
          ))}
        </section>
        <CommunitySidebar
          name="agora-meta"
          description={t(
            'feed.metaCommunityDescription',
            { appName: APP_NAME },
            {
              defaultValue:
                'The meta community for everyone who shapes {{appName}} — voting, governance, and feature debates.',
            },
          )}
          subscribers={84200}
          activeNow={612}
          rules={[
            {
              id: 'be-civil',
              title: t('feed.ruleBeCivil', {}, { defaultValue: 'Be civil. Always.' }),
              description: t(
                'feed.ruleBeCivilDesc',
                {},
                {
                  defaultValue:
                    'Disagree without dehumanizing. Mods escalate fast on personal attacks.',
                },
              ),
            },
            {
              id: 'one-per-week',
              title: t(
                'feed.ruleOnePerWeek',
                {},
                { defaultValue: 'One meta post per week per account.' },
              ),
            },
            {
              id: 'cite-sources',
              title: t(
                'feed.ruleCiteSources',
                {},
                { defaultValue: 'Link the thing you are reacting to.' },
              ),
            },
          ]}
          moderators={[]}
          trending={rows.slice(0, 4).map((row) => ({
            id: row.id,
            title: row.title,
            voteCount: row.score,
            category: row.categorySlug,
          }))}
        />
      </div>
    </div>
  )
}

export default Feed
