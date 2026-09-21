import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CampaignProgressBar } from '../components/CampaignProgressBar.js'
import { api, type ApiPledge } from '../lib/api.js'

const STATUS_TINT: Record<ApiPledge['fulfillment_status'], string> = {
  preparing: 'bg-warning/10 text-warning',
  shipped: 'bg-primary/10 text-primary',
  delivered: 'bg-success/10 text-success',
  pending: 'bg-surface-container text-on-surface-variant',
  refunded: 'bg-error/10 text-error',
}

export function MyPledges() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [pledges, setPledges] = useState<ApiPledge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const list = await api.myPledges(http)
        if (alive) setPledges(list)
      } catch (err) {
        if (alive)
          setError(
            err instanceof Error
              ? err.message
              : t('myPledges.loadError', {}, { defaultValue: 'Failed to load your pledges' }),
          )
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [http, t, refreshKey])

  const handleCancel = async (pledgeId: string) => {
    try {
      const cancelled = await api.cancelPledge(http, pledgeId)
      void track({
        name: 'pledge.cancelled',
        properties: { pledge_id: pledgeId, campaign_id: cancelled.campaign_id },
      })
      setRefreshKey((n) => n + 1)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('myPledges.cancelError', {}, { defaultValue: 'Failed to cancel pledge' }),
      )
    }
  }

  const totalPledged = pledges
    .filter((p) => p.status !== 'refunded')
    .reduce((sum, p) => sum + p.amount_cents, 0)
  const fmt = (c: number) => `$${Math.round(c / 100).toLocaleString()}`

  return (
    <div
      className={cm.cn(
        cm.maxW('7xl'),
        cm.mxAuto,
        cm.w('full'),
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.stack(8),
      )}
      data-mol-id="page-my-pledges"
    >
      <header className={cm.stack(2)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('myPledges.eyebrow', {}, { defaultValue: 'My pledges' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('myPledges.heading', {}, { defaultValue: "Campaigns you're backing" })}
        </h1>
        <p
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          data-mol-id="my-pledges-summary"
        >
          {t(
            'myPledges.subheading',
            { total: fmt(totalPledged), count: pledges.length },
            {
              defaultValue:
                pledges.length === 1
                  ? '{{total}} across 1 pledge — fulfillment status updated live.'
                  : '{{total}} across {{count}} pledges — fulfillment status updated live.',
            },
          )}
        </p>
      </header>

      {error ? (
        <div className={cm.cn(cm.textSize('sm'), 'text-error')} data-mol-id="my-pledges-error">
          {error}
        </div>
      ) : null}

      <section className={cm.stack(4)}>
        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : pledges.length === 0 ? (
          <EmptyState />
        ) : (
          pledges.map((p) => (
            <article
              key={p.id}
              className={cm.cn(
                cm.sp('p', 6),
                cm.flex({ direction: 'col', gap: 'md' }),
                'rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm hover:shadow-md transition-shadow',
              )}
              data-mol-id={`pledge-${p.id}`}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'baseline', justify: 'between' }),
                  'flex-wrap gap-3',
                )}
              >
                <div className={cm.flex({ align: 'center', gap: 'md' })}>
                  <div
                    className={cm.cn(
                      cm.w(12),
                      cm.h(12),
                      'rounded-lg flex items-center justify-center',
                    )}
                    style={{
                      background:
                        'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary-light) 100%)',
                    }}
                  >
                    <span className="material-symbols-outlined text-white" aria-hidden="true">
                      favorite
                    </span>
                  </div>
                  <div>
                    <Link
                      to={`/campaign/${p.campaign_id}`}
                      className={cm.cn(
                        cm.textSize('lg'),
                        cm.fontWeight('bold'),
                        'hover:text-primary transition-colors',
                      )}
                    >
                      {p.campaign_title}
                    </Link>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'myPledges.tierMeta',
                        {
                          tier:
                            p.tier_title ??
                            t('myPledges.noTier', {}, { defaultValue: 'No reward' }),
                          date: new Date(p.pledged_at).toLocaleDateString(),
                        },
                        { defaultValue: '{{tier}} · pledged {{date}}' },
                      )}
                    </p>
                  </div>
                </div>
                <div className={cm.cn(cm.flex({ direction: 'col', align: 'end' }), 'gap-2')}>
                  <span
                    className={cm.cn(
                      cm.textSize('lg'),
                      cm.fontWeight('bold'),
                      'text-primary tabular-nums',
                    )}
                  >
                    {fmt(p.amount_cents)}
                  </span>
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest rounded-full',
                      STATUS_TINT[p.fulfillment_status],
                    )}
                  >
                    {t(
                      `myPledges.status.${p.fulfillment_status}`,
                      {},
                      { defaultValue: p.fulfillment_status },
                    )}
                  </span>
                  {p.status === 'active' && p.campaign_status !== 'funded' ? (
                    <button
                      type="button"
                      onClick={() => handleCancel(p.id)}
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'text-error hover:underline',
                      )}
                      data-mol-id={`cancel-${p.id}`}
                    >
                      {t('myPledges.cancel', {}, { defaultValue: 'Cancel pledge' })}
                    </button>
                  ) : null}
                </div>
              </div>
              <CampaignProgressBar
                pledgedCents={p.campaign_pledged_cents}
                goalCents={p.campaign_goal_cents}
                size="compact"
              />
            </article>
          ))
        )}
      </section>
    </div>
  )
}

function EmptyState() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 12),
        cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
        cm.textCenter,
        'rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-lowest',
      )}
      data-mol-id="my-pledges-empty"
    >
      <span
        className="material-symbols-outlined text-5xl text-on-surface-variant"
        aria-hidden="true"
      >
        favorite
      </span>
      <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
        {t('myPledges.empty.title', {}, { defaultValue: 'No pledges yet' })}
      </h2>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t(
          'myPledges.empty.body',
          {},
          { defaultValue: 'Find a campaign worth your support — discover one to back below.' },
        )}
      </p>
      <Link
        to="/discover"
        className={cm.cn(
          cm.sp('px', 5),
          cm.sp('py', 3),
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          'rounded-lg bg-primary text-white',
        )}
      >
        {t('myPledges.empty.cta', {}, { defaultValue: 'Discover campaigns' })}
      </Link>
    </div>
  )
}

export default MyPledges
