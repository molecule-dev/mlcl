import { useCallback, useMemo } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AiImageGeneratorLayout } from '../components/AiImageGeneratorLayout.js'
import { AiImageGeneratorTopBar } from '../components/AiImageGeneratorTopBar.js'
import { CreditsHeroCard } from '../components/CreditsHeroCard.js'
import { GenerationCard } from '../components/GenerationCard.js'
import { GenerationStatusPill } from '../components/GenerationStatusPill.js'
import { PromptComposer } from '../components/PromptComposer.js'
import { adaptActivity, adaptGeneration } from '../lib/api-adapters.js'
import { useFetchList, useFetchOne } from '../lib/use-fetch-list.js'

interface KpiPayload {
  generatedToday?: number
  inQueue?: number
  upscaledThisWeek?: number
  sharedCollections?: number
}

interface CreditsPayload {
  balance?: number
  plan?: {
    id?: string
    name?: string
    creditsPerMonth?: number
  } | null
  renewsOn?: string | null
}

const adaptKpis = (raw: KpiPayload) => raw

const adaptCredits = (raw: CreditsPayload) => raw

/**
 * Format an ISO date (YYYY-MM-DD) as "Month Day" for the credits hero.
 * Returns the input unchanged if it's not a valid date string so the UI
 * never crashes on a stray non-ISO value from a future API rev.
 */
function formatRenewsOn(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return iso
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const generationsState = useFetchList(
    '/api/generations?limit=12',
    useCallback((row: Record<string, unknown>) => adaptGeneration(row), []),
  )
  const activityState = useFetchList(
    '/api/notifications',
    useCallback((row: Record<string, unknown>) => adaptActivity(row), []),
  )
  const kpisState = useFetchOne<KpiPayload, KpiPayload>(
    '/api/credits/kpis',
    useCallback((raw: KpiPayload) => adaptKpis(raw), []),
  )
  const creditsState = useFetchOne<CreditsPayload, CreditsPayload>(
    '/api/credits',
    useCallback((raw: CreditsPayload) => adaptCredits(raw), []),
  )

  const kpis = useMemo(
    () => [
      {
        id: 'today',
        icon: 'auto_awesome',
        labelKey: 'dashboard.kpis.today',
        label: 'Generated today',
        value: kpisState.data?.generatedToday ?? 0,
        accent: 'border-l-primary',
      },
      {
        id: 'queue',
        icon: 'schedule',
        labelKey: 'dashboard.kpis.queue',
        label: 'In queue',
        value: kpisState.data?.inQueue ?? 0,
        accent: 'border-l-secondary',
      },
      {
        id: 'upscaled',
        icon: 'high_quality',
        labelKey: 'dashboard.kpis.upscaled',
        label: 'Upscaled this week',
        value: kpisState.data?.upscaledThisWeek ?? 0,
        accent: 'border-l-info',
      },
      {
        id: 'shared',
        icon: 'share',
        labelKey: 'dashboard.kpis.shared',
        label: 'Shared collections',
        value: kpisState.data?.sharedCollections ?? 0,
        accent: 'border-l-success',
      },
    ],
    [kpisState.data],
  )

  const generations = generationsState.data ?? []
  const queue = generations.filter((g) => g.status === 'generating' || g.status === 'queued')

  return (
    <AiImageGeneratorLayout>
      <AiImageGeneratorTopBar
        title={t('dashboard.title', {}, { defaultValue: 'Dreamscape' })}
        subtitle={t(
          'dashboard.subtitle',
          {},
          { defaultValue: 'Today’s prompts, queue and recent renders' },
        )}
        credits={creditsState.data?.balance ?? 0}
      />

      <main className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('p', 8))}>
        <section className={cm.cn('grid gap-6 lg:grid-cols-12')}>
          <div className={cm.cn('lg:col-span-7')}>
            <CreditsHeroCard
              credits={creditsState.data?.balance ?? 0}
              total={creditsState.data?.plan?.creditsPerMonth ?? 0}
              plan={creditsState.data?.plan?.name ?? 'Starter'}
              renewsOn={formatRenewsOn(creditsState.data?.renewsOn ?? null)}
            />
          </div>
          <div className={cm.cn('lg:col-span-5 flex flex-col gap-6')}>
            <PromptComposer variant="compact" />
            <div className={cm.cn('grid grid-cols-2 gap-4')}>
              {kpis.map((kpi) => (
                <article
                  key={kpi.id}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'xs' }),
                    cm.sp('p', 4),
                    'rounded-2xl bg-surface-container-lowest border-l-4 border border-outline-variant/15',
                    kpi.accent,
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                    <span
                      className={cm.cn('material-symbols-outlined text-primary')}
                      style={{ fontSize: 20 }}
                    >
                      {kpi.icon}
                    </span>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        cm.textSize('xs'),
                        'uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t(kpi.labelKey, {}, { defaultValue: kpi.label })}
                    </span>
                  </div>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-3xl tracking-tight text-on-surface font-mono',
                    )}
                  >
                    {kpi.value}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <header className={cm.flex({ align: 'center', justify: 'between' })}>
            <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xl'),
                  'tracking-tight text-on-surface',
                )}
              >
                {t('dashboard.queue.title', {}, { defaultValue: 'Generation queue' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'dashboard.queue.subtitle',
                  { count: queue.length },
                  { defaultValue: '{{count}} prompts dreaming right now' },
                )}
              </p>
            </div>
            <Link
              to="/generate"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'text-primary hover:text-secondary transition-colors',
              )}
            >
              {t('dashboard.queue.cta', {}, { defaultValue: 'Open studio' })}
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                arrow_forward
              </span>
            </Link>
          </header>
          {generationsState.loading ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('dashboard.queue.loading', {}, { defaultValue: 'Loading queue…' })}
            </p>
          ) : generationsState.error ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{generationsState.error}</p>
          ) : (
            <div className={cm.cn('grid gap-4 md:grid-cols-2')}>
              {queue.map((generation) => (
                <article
                  key={generation.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md' }),
                    cm.sp('p', 4),
                    'rounded-2xl bg-surface-container-lowest border border-outline-variant/15 shadow-sm',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-16 w-16 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/30 text-primary',
                    )}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined')} style={{ fontSize: 28 }}>
                      auto_awesome
                    </span>
                  </div>
                  <div
                    className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'min-w-0 flex-1')}
                  >
                    <p
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.textSize('sm'),
                        'text-on-surface line-clamp-2',
                      )}
                    >
                      {generation.prompt}
                    </p>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        cm.textSize('xs'),
                        'font-mono text-on-surface-variant',
                      )}
                    >
                      <span>{generation.model}</span>
                      <span>·</span>
                      <span>seed {generation.seed}</span>
                    </div>
                  </div>
                  <GenerationStatusPill status={generation.status} size="sm" />
                </article>
              ))}
              {queue.length === 0 && (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant col-span-full')}>
                  {t(
                    'dashboard.queue.empty',
                    {},
                    { defaultValue: 'Nothing in the queue. Conjure something new.' },
                  )}
                </p>
              )}
            </div>
          )}
        </section>

        <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <header className={cm.flex({ align: 'center', justify: 'between' })}>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xl'),
                'tracking-tight text-on-surface',
              )}
            >
              {t('dashboard.recent.title', {}, { defaultValue: 'Recent creations' })}
            </h2>
            <Link
              to="/gallery"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'text-primary hover:text-secondary transition-colors',
              )}
            >
              {t('dashboard.recent.cta', {}, { defaultValue: 'Open gallery' })}
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                arrow_forward
              </span>
            </Link>
          </header>
          {generationsState.loading ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('dashboard.recent.loading', {}, { defaultValue: 'Loading recent renders…' })}
            </p>
          ) : generations.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'dashboard.recent.empty',
                {},
                { defaultValue: 'No renders yet. Generate something to see it here.' },
              )}
            </p>
          ) : (
            <div className={cm.cn('grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4')}>
              {generations.slice(0, 8).map((generation) => (
                <GenerationCard key={generation.id} generation={generation} />
              ))}
            </div>
          )}
        </section>

        <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xl'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('dashboard.activity.title', {}, { defaultValue: 'Today’s activity' })}
          </h2>
          {activityState.loading ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('nav.loadingActivity', {}, { defaultValue: 'Loading activity…' })}
            </p>
          ) : (activityState.data ?? []).length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'dashboard.activity.empty',
                {},
                { defaultValue: 'No activity yet — your generation events will land here.' },
              )}
            </p>
          ) : (
            <ol
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'xs' }),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/15 divide-y divide-outline-variant/10',
              )}
            >
              {(activityState.data ?? []).slice(0, 4).map((event) => (
                <li
                  key={event.id}
                  className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('p', 4))}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-9 w-9 rounded-full bg-primary-container/40 text-primary',
                    )}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {event.type === 'completed'
                        ? 'check_circle'
                        : event.type === 'failed'
                          ? 'error'
                          : event.type === 'upscaled'
                            ? 'high_quality'
                            : event.type === 'shared'
                              ? 'share'
                              : 'schedule'}
                    </span>
                  </span>
                  <div className={cm.cn(cm.flex({ direction: 'col' }), 'flex-1 min-w-0')}>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface line-clamp-1')}>
                      <span className={cm.fontWeight('bold')}>{event.type}</span> · {event.prompt}
                    </p>
                    <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
                      {event.when}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </AiImageGeneratorLayout>
  )
}

export default Dashboard
