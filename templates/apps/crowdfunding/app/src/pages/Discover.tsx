import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CampaignCard } from '../components/CampaignCard.js'
import { CampaignHeroBanner } from '../components/CampaignHeroBanner.js'
import { CategoryFilterBar } from '../components/CategoryFilterBar.js'
import { api, type ApiCampaign, toCardData } from '../lib/api.js'

const CATEGORIES = ['Tech', 'Design', 'Film', 'Games', 'Music', 'Food', 'Art'] as const

export function Discover() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const allLabel = t('status.all', {}, { defaultValue: 'All' })
  const [active, setActive] = useState<string>(allLabel)
  const [query, setQuery] = useState('')
  const [campaigns, setCampaigns] = useState<ApiCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const load = async () => {
      try {
        const list = query.trim()
          ? (await api.searchCampaigns(http, query.trim())).hits
          : await api.listCampaigns(http, {
              status: active.toLowerCase() === allLabel.toLowerCase() ? 'active' : undefined,
              category: active.toLowerCase() === allLabel.toLowerCase() ? undefined : active,
              sort: 'trending',
              limit: 60,
            })
        if (alive) setCampaigns(list)
      } catch (err) {
        if (alive)
          setError(
            err instanceof Error
              ? err.message
              : t('discover.loadError', {}, { defaultValue: 'Failed to load campaigns' }),
          )
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => {
      alive = false
    }
  }, [active, allLabel, http, query, t])

  return (
    <div data-mol-id="page-discover">
      <CampaignHeroBanner
        size="inner"
        eyebrow={t('nav.discover', {}, { defaultValue: 'Discover' })}
        heading={t('discover.heading', {}, { defaultValue: 'Find what to back next' })}
        subheading={t(
          'discover.subheading',
          {},
          { defaultValue: 'Curated campaigns from creators turning ideas into reality.' },
        )}
      />

      <main
        className={cm.cn(
          cm.maxW('7xl'),
          cm.mxAuto,
          cm.w('full'),
          cm.sp('px', 6),
          cm.sp('py', 10),
          cm.stack(8),
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            'rounded-full bg-surface-container-lowest border border-outline-variant shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all',
          )}
        >
          <span
            className={cm.cn(cm.sp('mr', 3), 'material-symbols-outlined text-on-surface-variant')}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'discover.searchPlaceholder',
              {},
              { defaultValue: 'Search campaigns, creators, or keywords' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.fontWeight('medium'),
              // min-w-0: a width:100% input in a nowrap flex row otherwise
              // pins the pill's min-content far past a 390px viewport.
              'min-w-0 flex-1 bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/60',
            )}
            data-mol-id="discover-search"
          />
        </div>

        <CategoryFilterBar categories={[...CATEGORIES]} active={active} onChange={setActive} />

        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
            )}
            data-mol-id="discover-result-count"
          >
            {loading
              ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
              : t(
                  'discover.results',
                  { count: campaigns.length },
                  {
                    defaultValue: campaigns.length === 1 ? '1 campaign' : '{{count}} campaigns',
                  },
                )}
          </p>
        </div>

        {error ? (
          <div
            className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-error')}
            data-mol-id="discover-error"
          >
            {error}
          </div>
        ) : !loading && campaigns.length === 0 ? (
          <div
            className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}
            data-mol-id="discover-empty"
          >
            <span
              className="material-symbols-outlined text-5xl text-on-surface-variant/40 block"
              aria-hidden="true"
            >
              explore_off
            </span>
            <p
              className={cm.cn(
                cm.textSize('base'),
                cm.fontWeight('semibold'),
                cm.sp('mt', 4),
                'text-on-surface',
              )}
            >
              {t('discover.empty.title', {}, { defaultValue: 'No campaigns match your search' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2))}>
              {t(
                'discover.empty.body',
                {},
                { defaultValue: 'Try a different category or clear the search.' },
              )}
            </p>
          </div>
        ) : (
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}
          >
            {campaigns.map((c) => (
              <CampaignCard key={c.id} campaign={toCardData(c)} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default Discover
