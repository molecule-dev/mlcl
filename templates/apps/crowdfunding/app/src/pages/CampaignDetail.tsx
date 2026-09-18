import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BackerAvatarStack } from '../components/BackerAvatarStack.js'
import { CampaignHeroBanner } from '../components/CampaignHeroBanner.js'
import { CampaignProgressBar } from '../components/CampaignProgressBar.js'
import type { RewardTier } from '../components/RewardTierCard.js'
import { RewardTierCard } from '../components/RewardTierCard.js'
import { api, type ApiCampaignDetail, type ApiCampaignUpdate } from '../lib/api.js'

function tierToView(t: ApiCampaignDetail['tiers'][number]): RewardTier {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    price_cents: t.price_cents,
    delivery_estimate: t.estimated_delivery ?? undefined,
    backer_count: t.current_backers,
    limit: t.max_backers,
    remaining: t.remaining,
  }
}

export function CampaignDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const justPledged = searchParams.get('pledged') === '1'
  const [campaign, setCampaign] = useState<ApiCampaignDetail | null>(null)
  const [updates, setUpdates] = useState<ApiCampaignUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let alive = true
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const [c, u] = await Promise.all([api.getCampaign(http, id), api.listUpdates(http, id)])
        if (alive) {
          setCampaign(c)
          setUpdates(u)
        }
      } catch (err) {
        if (alive)
          setError(
            err instanceof Error
              ? err.message
              : t('campaignDetail.loadError', {}, { defaultValue: 'Failed to load campaign' }),
          )
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [id, http, t])

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('py', 16), cm.textCenter)} data-mol-id="campaign-loading">
        {t('campaignDetail.loading', {}, { defaultValue: 'Loading campaign…' })}
      </div>
    )
  }
  if (error || !campaign) {
    return (
      <div
        className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}
        data-mol-id="campaign-error"
      >
        {error ?? t('campaignDetail.notFound', {}, { defaultValue: 'Campaign not found' })}
      </div>
    )
  }

  const tiers = campaign.tiers.map(tierToView)
  const backerSummaries: Array<{ id: string; name: string }> = []

  return (
    <div data-mol-id="page-campaign-detail">
      <CampaignHeroBanner
        size="inner"
        eyebrow={campaign.category}
        heading={campaign.title}
        subheading={t(
          'campaignDetail.byCreator',
          { name: campaign.creator_name },
          { defaultValue: 'by {{name}}' },
        )}
      />

      <main
        className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.w('full'), cm.sp('px', 6), cm.sp('py', 10))}
      >
        {justPledged ? (
          <div
            role="status"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.sp('mb', 6),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-lg bg-success/10 text-success',
            )}
            data-mol-id="pledge-success"
          >
            {t(
              'campaignDetail.pledgeSuccess',
              {},
              { defaultValue: 'Your pledge is confirmed — thanks for backing this campaign!' },
            )}
          </div>
        ) : null}
        <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-start')}>
          <div className={cm.cn('lg:col-span-8', cm.stack(8))}>
            <div
              className={cm.cn(
                'aspect-video w-full rounded-xl overflow-hidden bg-surface-container border border-outline-variant relative',
              )}
            >
              {campaign.cover_image_url ? (
                <img
                  alt={campaign.title}
                  src={campaign.cover_image_url}
                  className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                />
              ) : (
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w('full'),
                    cm.h('full'),
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary-light) 100%)',
                  }}
                >
                  <span
                    className="material-symbols-outlined text-white/40 text-6xl"
                    aria-hidden="true"
                  >
                    play_circle
                  </span>
                </div>
              )}
            </div>

            <section className={cm.stack(4)} data-mol-id="campaign-story">
              <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
                {t('campaignDetail.story.title', {}, { defaultValue: 'About this campaign' })}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('base'),
                  'text-on-surface-variant leading-relaxed whitespace-pre-line',
                )}
              >
                {campaign.description}
              </p>
            </section>

            <section className={cm.stack(6)} data-mol-id="campaign-rewards">
              <header className={cm.flex({ align: 'baseline', justify: 'between' })}>
                <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
                  {t('campaignDetail.rewards.title', {}, { defaultValue: 'Reward tiers' })}
                </h2>
                <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'campaignDetail.rewards.count',
                    { count: tiers.length },
                    { defaultValue: '{{count}} tiers available' },
                  )}
                </span>
              </header>
              {tiers.length === 0 ? (
                <p
                  className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                  data-mol-id="rewards-empty"
                >
                  {t(
                    'campaignDetail.rewards.empty',
                    {},
                    { defaultValue: 'This campaign has no reward tiers yet.' },
                  )}
                </p>
              ) : (
                <div className={cm.stack(4)}>
                  {tiers.map((tier) => (
                    <RewardTierCard key={tier.id} tier={tier} variant="preview" />
                  ))}
                </div>
              )}
            </section>

            {updates.length > 0 ? (
              <section className={cm.stack(6)} data-mol-id="campaign-updates">
                <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
                  {t(
                    'campaignDetail.updates.title',
                    {},
                    { defaultValue: 'Updates from the creator' },
                  )}
                </h2>
                <div className={cm.stack(4)}>
                  {updates.map((u) => (
                    <article
                      key={u.id}
                      className={cm.cn(
                        cm.sp('p', 5),
                        'rounded-xl border border-outline-variant bg-surface-container-lowest',
                      )}
                      data-mol-id={`update-${u.id}`}
                    >
                      <h3
                        className={cm.cn(
                          cm.textSize('lg'),
                          cm.fontWeight('bold'),
                          'text-on-surface',
                        )}
                      >
                        {u.title}
                      </h3>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.sp('mt', 1),
                          'text-on-surface-variant',
                        )}
                      >
                        {new Date(u.created_at).toLocaleDateString()}
                      </p>
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.sp('mt', 3),
                          'text-on-surface-variant whitespace-pre-line',
                        )}
                      >
                        {u.body}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside
            className={cm.cn(
              'lg:col-span-4 lg:sticky lg:top-24',
              cm.sp('p', 6),
              cm.stack(5),
              'rounded-xl bg-surface-container-lowest border border-outline-variant shadow-md',
            )}
            data-mol-id="pledge-sidebar"
          >
            <div className={cm.stack(2)}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-primary',
                )}
              >
                {campaign.status === 'funded'
                  ? t('campaignDetail.sidebar.funded', {}, { defaultValue: 'Successfully funded' })
                  : campaign.status === 'active'
                    ? t(
                        'campaignDetail.sidebar.eyebrow',
                        {},
                        { defaultValue: 'Pledge to back this project' },
                      )
                    : t('campaignDetail.sidebar.ended', {}, { defaultValue: 'Campaign ended' })}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  'tabular-nums text-on-surface',
                )}
                data-mol-id="campaign-pledged-total"
              >
                ${Math.round(campaign.pledged_cents / 100).toLocaleString()}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'campaignDetail.sidebar.goal',
                  { goal: `$${Math.round(campaign.goal_cents / 100).toLocaleString()}` },
                  { defaultValue: 'pledged of {{goal}} goal' },
                )}
              </p>
            </div>

            <CampaignProgressBar
              pledgedCents={campaign.pledged_cents}
              goalCents={campaign.goal_cents}
              size="hero"
            />

            <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-2 text-center')}>
              <div className={cm.cn(cm.sp('p', 3), 'rounded-lg bg-surface-container')}>
                <p
                  className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tabular-nums')}
                  data-mol-id="campaign-backer-count"
                >
                  {campaign.backer_count}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('campaignDetail.sidebar.backers', {}, { defaultValue: 'Backers' })}
                </p>
              </div>
              <div className={cm.cn(cm.sp('p', 3), 'rounded-lg bg-surface-container')}>
                <p className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tabular-nums')}>
                  {campaign.days_left}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('campaignDetail.sidebar.daysLeft', {}, { defaultValue: 'Days left' })}
                </p>
              </div>
            </div>

            {campaign.status === 'active' ? (
              <Link
                to={`/campaign/${campaign.id}/pledge`}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.textCenter,
                  cm.fontWeight('bold'),
                  cm.textSize('base'),
                  'rounded-lg text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all block',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                }}
                data-mol-id="cta-pledge"
              >
                {t('campaignDetail.sidebar.pledge', {}, { defaultValue: 'Back this campaign' })}
              </Link>
            ) : null}

            <BackerAvatarStack backers={backerSummaries} totalCount={campaign.backer_count} />

            <Link
              to={`/profile/${campaign.creator_id}`}
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'text-primary hover:underline',
              )}
              data-mol-id="view-creator-profile"
            >
              {t(
                'campaignDetail.sidebar.viewCreator',
                { name: campaign.creator_name },
                { defaultValue: 'View {{name}}’s profile →' },
              )}
            </Link>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default CampaignDetail
