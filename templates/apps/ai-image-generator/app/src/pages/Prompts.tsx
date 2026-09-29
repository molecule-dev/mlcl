import { useCallback, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AiImageGeneratorLayout } from '../components/AiImageGeneratorLayout.js'
import { AiImageGeneratorTopBar } from '../components/AiImageGeneratorTopBar.js'
import { EmptyState } from '../components/EmptyState.js'
import { adaptPrompt } from '../lib/api-adapters.js'
import { useFetchList } from '../lib/use-fetch-list.js'

export function Prompts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [query, setQuery] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)

  const promptsState = useFetchList(
    '/api/prompts',
    useCallback((row: Record<string, unknown>) => adaptPrompt(row), []),
  )

  const prompts = promptsState.data ?? []
  const filtered = query
    ? prompts.filter((p) => p.prompt.toLowerCase().includes(query.toLowerCase()))
    : prompts
  // Community picks rail: the newest saved prompts double as what the
  // community is playing with right now — data-driven, never fixture copy.
  const picks = prompts.slice(0, 3)

  const runPrompt = useCallback(
    async (id: string) => {
      setPendingId(id)
      try {
        await http.post(`/api/prompts/${id}/use`, {})
        await promptsState.refetch()
      } catch (error) {
        logError('prompts.runPrompt', error)
      } finally {
        setPendingId(null)
      }
    },
    [http, promptsState],
  )

  return (
    <AiImageGeneratorLayout>
      <AiImageGeneratorTopBar
        title={t('prompts.title', {}, { defaultValue: 'Prompt lab' })}
        subtitle={t(
          'prompts.subtitle',
          {},
          { defaultValue: 'Saved prompts, scaffolds and reusable seeds' },
        )}
      />

      <div className={cm.cn(cm.sp('p', 8), cm.flex({ direction: 'col', gap: 'lg' }))}>
        <div className={cm.cn('grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start')}>
          <div className={cm.flex({ direction: 'col', gap: 'lg' })}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                'h-12 rounded-xl bg-surface-container-lowest border border-outline-variant/15',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-on-surface-variant')}>
                search
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t(
                  'prompts.search',
                  {},
                  { defaultValue: 'Search prompts, tags or seeds…' },
                )}
                className={cm.cn(
                  cm.w('full'),
                  cm.fontWeight('medium'),
                  'bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/60',
                )}
              />
            </div>

            {promptsState.loading ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('prompts.loading', {}, { defaultValue: 'Loading prompts…' })}
              </p>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon="search_off"
                title={t('prompts.empty.title', {}, { defaultValue: 'No saved prompts match' })}
                description={t(
                  'prompts.empty.body',
                  {},
                  { defaultValue: 'Try a different keyword or save a new prompt from the studio.' },
                )}
                action={
                  <Link
                    to="/generate"
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      'rounded-xl bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30',
                    )}
                  >
                    <span className="material-symbols-outlined">auto_awesome</span>
                    {t('prompts.empty.cta', {}, { defaultValue: 'Open studio' })}
                  </Link>
                }
              />
            ) : (
              <ul className={cm.flex({ direction: 'col', gap: 'sm' })}>
                {filtered.map((prompt) => (
                  <li
                    key={prompt.id}
                    className={cm.cn(
                      cm.flex({ direction: 'col', gap: 'sm' }),
                      cm.sp('p', 5),
                      'rounded-2xl bg-surface-container-lowest border border-outline-variant/15 shadow-sm',
                    )}
                  >
                    <p
                      className={cm.cn(
                        cm.textSize('base'),
                        'font-mono text-on-surface leading-relaxed',
                      )}
                    >
                      {prompt.prompt}
                    </p>
                    {prompt.negative && (
                      <p className={cm.cn(cm.textSize('xs'), 'font-mono text-error')}>
                        {t('prompts.negativeLabel', {}, { defaultValue: 'NEG' })}: {prompt.negative}
                      </p>
                    )}
                    <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                      <div className={cm.cn(cm.flex({ gap: 'xs' }), 'flex-wrap')}>
                        {prompt.tags.map((tag) => (
                          <span
                            key={tag}
                            className={cm.cn(
                              cm.fontWeight('semibold'),
                              cm.textSize('xs'),
                              cm.sp('px', 2),
                              'rounded-full bg-primary-container/30 text-primary uppercase tracking-widest',
                            )}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className={cm.flex({ align: 'center', gap: 'xs' })}>
                        <span
                          className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}
                        >
                          {t(
                            'prompts.lastUsed',
                            { when: prompt.lastUsed },
                            { defaultValue: 'Used {{when}}' },
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => runPrompt(prompt.id)}
                          disabled={pendingId === prompt.id}
                          className={cm.cn(
                            cm.flex({ align: 'center', gap: 'xs' }),
                            cm.fontWeight('bold'),
                            cm.textSize('xs'),
                            cm.sp('px', 3),
                            cm.sp('py', 1),
                            'rounded-full bg-primary text-on-primary uppercase tracking-widest disabled:opacity-50',
                          )}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                            replay
                          </span>
                          {pendingId === prompt.id
                            ? t('prompts.running', {}, { defaultValue: 'Running…' })
                            : t('prompts.runAgain', {}, { defaultValue: 'Run' })}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside
            data-mol-id="prompts-community-picks"
            className={cm.cn(
              cm.sp('p', 6),
              'hidden lg:flex flex-col rounded-2xl bg-surface-container-low border border-outline-variant/15 shadow-sm lg:sticky lg:top-24',
            )}
          >
            <h3
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                'text-on-surface',
              )}
            >
              <span className="material-symbols-outlined text-primary">explore</span>
              {t('prompts.communityPicks.title', {}, { defaultValue: 'Community Picks' })}
            </h3>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.sp('mt', 4),
                cm.sp('mb', 4),
              )}
            >
              {picks.map((prompt) => (
                <Link
                  key={prompt.id}
                  to="/generate"
                  data-mol-id="community-pick"
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'xs' }),
                    cm.sp('p', 3),
                    'rounded-xl bg-surface-container-lowest border border-outline-variant/15 hover:border-primary/40 transition-colors',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      'text-on-surface truncate',
                    )}
                  >
                    {prompt.tags[0]
                      ? t(
                          'prompts.communityPicks.tagged',
                          { tag: prompt.tags[0] },
                          { defaultValue: 'Trending {{tag}}' },
                        )
                      : t(
                          'prompts.communityPicks.recent',
                          {},
                          { defaultValue: 'Fresh from the studio' },
                        )}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-mono text-on-surface-variant line-clamp-2',
                    )}
                  >
                    {prompt.prompt}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              to="/gallery"
              data-mol-id="community-picks-browse"
              className={cm.cn(
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-center rounded-lg text-primary hover:bg-surface-container-highest transition-colors',
              )}
            >
              {t('prompts.communityPicks.browse', {}, { defaultValue: 'Browse Explore' })}
            </Link>
          </aside>
        </div>
      </div>
    </AiImageGeneratorLayout>
  )
}

export default Prompts
