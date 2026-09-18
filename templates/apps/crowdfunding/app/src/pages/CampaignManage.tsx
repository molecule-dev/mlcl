import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CampaignProgressBar } from '../components/CampaignProgressBar.js'
import { KpiStatCard } from '../components/KpiStatCard.js'
import { api, type ApiCampaignDetail, type ApiCampaignUpdate, type ApiPledge } from '../lib/api.js'

const TABS = ['analytics', 'updates', 'backers'] as const
type TabKey = (typeof TABS)[number]

export function CampaignManage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [campaign, setCampaign] = useState<ApiCampaignDetail | null>(null)
  const [updates, setUpdates] = useState<ApiCampaignUpdate[]>([])
  const [pledges, setPledges] = useState<ApiPledge[]>([])
  const [tab, setTab] = useState<TabKey>('analytics')
  const [updateTitle, setUpdateTitle] = useState('')
  const [updateBody, setUpdateBody] = useState('')
  const [backersOnly, setBackersOnly] = useState(false)
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!id) return
    let alive = true
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const [c, u, p] = await Promise.all([
          api.getCampaign(http, id),
          api.listUpdates(http, id),
          api.campaignPledges(http, id).catch(() => [] as ApiPledge[]),
        ])
        if (alive) {
          setCampaign(c)
          setUpdates(u)
          setPledges(p)
        }
      } catch (err) {
        if (alive)
          setError(
            err instanceof Error
              ? err.message
              : t('campaignManage.loadError', {}, { defaultValue: 'Failed to load campaign' }),
          )
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [id, http, t, refreshKey])

  const fmt = (c: number) => `$${Math.round(c / 100).toLocaleString()}`
  const tabLabel: Record<TabKey, string> = {
    analytics: t('nav.analytics', {}, { defaultValue: 'Analytics' }),
    updates: t('campaignManage.tab.updates', {}, { defaultValue: 'Updates' }),
    backers: t('campaignManage.tab.backers', {}, { defaultValue: 'Backers' }),
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('py', 16), cm.textCenter)} data-mol-id="manage-loading">
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }
  if (error || !campaign) {
    return (
      <div
        className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}
        data-mol-id="manage-error"
      >
        {error ?? t('campaignManage.notFound', {}, { defaultValue: 'Campaign not found' })}
      </div>
    )
  }

  const handlePostUpdate = async () => {
    if (!updateTitle.trim() || !updateBody.trim()) {
      setPostError(
        t('campaignManage.updates.error', {}, { defaultValue: 'Both title and body are required' }),
      )
      return
    }
    setPosting(true)
    setPostError(null)
    try {
      await api.postUpdate(http, {
        campaign_id: campaign.id,
        title: updateTitle.trim(),
        body: updateBody.trim(),
        backers_only: backersOnly,
      })
      setUpdateTitle('')
      setUpdateBody('')
      setBackersOnly(false)
      setRefreshKey((n) => n + 1)
    } catch (err) {
      setPostError(
        err instanceof Error
          ? err.message
          : t('campaignManage.updates.postError', {}, { defaultValue: 'Failed to publish update' }),
      )
    } finally {
      setPosting(false)
    }
  }

  const totalPledges = pledges.filter((p) => p.status === 'active').length
  const avgPledge =
    totalPledges > 0
      ? Math.round(
          pledges.filter((p) => p.status === 'active').reduce((s, p) => s + p.amount_cents, 0) /
            totalPledges,
        )
      : 0

  const statusLabel =
    campaign.status === 'funded'
      ? t('campaignManage.statusFunded', {}, { defaultValue: 'Funded' })
      : campaign.status === 'active'
        ? t('status.live', {}, { defaultValue: 'Live' })
        : campaign.status === 'draft'
          ? t('campaignManage.statusDraft', {}, { defaultValue: 'Draft' })
          : t('campaignManage.statusEnded', {}, { defaultValue: 'Ended' })
  const statusTint =
    campaign.status === 'funded'
      ? 'bg-success/10 text-success'
      : campaign.status === 'active'
        ? 'bg-primary/10 text-primary'
        : campaign.status === 'draft'
          ? 'bg-surface-container text-on-surface-variant'
          : 'bg-warning/10 text-warning'

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
      data-mol-id="page-campaign-manage"
    >
      <header className={cm.stack(3)}>
        <Link
          to={`/campaign/${campaign.id}`}
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary hover:underline',
          )}
        >
          ← {t('campaignManage.back', {}, { defaultValue: 'Back to public campaign' })}
        </Link>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('campaignManage.eyebrow', {}, { defaultValue: 'Campaign console' })}
            </p>
            <h1
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 2),
                'tracking-tight',
              )}
            >
              {campaign.title}
            </h1>
          </div>
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest rounded-full',
              statusTint,
            )}
            data-mol-id="manage-status"
          >
            {statusLabel}
          </span>
        </div>
      </header>

      <section
        className={cm.cn(cm.sp('p', 8), 'rounded-2xl text-white relative overflow-hidden')}
        style={{
          background:
            'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary-light) 100%)',
        }}
      >
        <div
          className={cm.cn(
            cm.w(64),
            cm.h(64),
            cm.roundedFull,
            'absolute -right-16 -bottom-16 bg-primary/30 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            cm.grid({ gap: 'lg' }),
            'grid-cols-1 lg:grid-cols-12 items-center relative z-10',
          )}
        >
          <div className={cm.cn('lg:col-span-7', cm.stack(3))}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
              {t('campaignManage.hero.totalRaised', {}, { defaultValue: 'Total raised' })}
            </p>
            <p
              className={cm.cn('text-6xl font-extrabold tracking-tighter tabular-nums')}
              data-mol-id="manage-raised"
            >
              {fmt(campaign.pledged_cents)}
            </p>
            <CampaignProgressBar
              pledgedCents={campaign.pledged_cents}
              goalCents={campaign.goal_cents}
              size="hero"
            />
          </div>
          <div className={cm.cn('lg:col-span-5', cm.stack(3))}>
            <div
              className={cm.cn(
                cm.flex({ align: 'baseline', justify: 'between' }),
                cm.sp('p', 4),
                'rounded-lg bg-surface/10 backdrop-blur',
              )}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                {t('campaignManage.hero.backers', {}, { defaultValue: 'Backers' })}
              </span>
              <span className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tabular-nums')}>
                {campaign.backer_count}
              </span>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'baseline', justify: 'between' }),
                cm.sp('p', 4),
                'rounded-lg bg-surface/10 backdrop-blur',
              )}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                {t('campaignManage.hero.daysLeft', {}, { defaultValue: 'Days remaining' })}
              </span>
              <span className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tabular-nums')}>
                {campaign.days_left}
              </span>
            </div>
          </div>
        </div>
      </section>

      <nav
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          'border-b border-outline-variant',
        )}
      >
        {TABS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'transition-colors',
              tab === k
                ? 'text-primary border-b-2 border-primary -mb-px'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
            data-mol-id={`manage-tab-${k}`}
          >
            {tabLabel[k]}
          </button>
        ))}
      </nav>

      {tab === 'analytics' && (
        <section
          className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
        >
          <KpiStatCard
            label={t('campaignManage.kpi.pledges', {}, { defaultValue: 'Total pledges' })}
            value={String(totalPledges)}
            icon="trending_up"
            accent="primary"
          />
          <KpiStatCard
            label={t('campaignManage.kpi.avgPledge', {}, { defaultValue: 'Avg. pledge' })}
            value={fmt(avgPledge)}
            icon="payments"
            accent="accent"
          />
          <KpiStatCard
            label={t('campaignManage.kpi.progress', {}, { defaultValue: 'Goal progress' })}
            value={`${campaign.progress}%`}
            icon="hub"
            accent="tertiary"
          />
          <KpiStatCard
            label={t('campaignManage.kpi.updates', {}, { defaultValue: 'Updates posted' })}
            value={String(updates.length)}
            icon="campaign"
            accent="warning"
          />
        </section>
      )}

      {tab === 'updates' && (
        <section className={cm.stack(6)}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm',
            )}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('campaignManage.updates.title', {}, { defaultValue: 'Post a creator update' })}
            </h2>
            <input
              type="text"
              value={updateTitle}
              onChange={(e) => setUpdateTitle(e.target.value)}
              placeholder={t(
                'campaignManage.updates.headlinePlaceholder',
                {},
                { defaultValue: 'Headline (e.g. "We hit 50%!")' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('medium'),
                'rounded-lg border border-outline-variant bg-surface-container-low text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
              )}
              data-mol-id="update-title-input"
            />
            <textarea
              rows={6}
              value={updateBody}
              onChange={(e) => setUpdateBody(e.target.value)}
              placeholder={t(
                'campaignManage.updates.bodyPlaceholder',
                {},
                { defaultValue: 'Share progress, behind-the-scenes, or call out a stretch goal.' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('medium'),
                'rounded-lg border border-outline-variant bg-surface-container-low resize-y text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
              )}
              data-mol-id="update-body-input"
            />
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <label
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                )}
              >
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={backersOnly}
                  onChange={(e) => setBackersOnly(e.target.checked)}
                  data-mol-id="update-backers-only"
                />
                {t('campaignManage.updates.backersOnly', {}, { defaultValue: 'Backers-only' })}
              </label>
              <button
                type="button"
                onClick={handlePostUpdate}
                disabled={posting}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-lg text-white shadow-sm disabled:opacity-50',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                }}
                data-mol-id="update-publish"
              >
                {posting
                  ? t('common.publishingEllipsis', {}, { defaultValue: 'Publishing…' })
                  : t('campaignManage.updates.publish', {}, { defaultValue: 'Publish update' })}
              </button>
            </div>
            {postError ? (
              <div
                className={cm.cn(cm.textSize('sm'), 'text-error')}
                data-mol-id="update-post-error"
              >
                {postError}
              </div>
            ) : null}
          </div>

          {updates.length > 0 ? (
            <div className={cm.stack(3)} data-mol-id="manage-updates-list">
              {updates.map((u) => (
                <div
                  key={u.id}
                  className={cm.cn(
                    cm.sp('p', 5),
                    'rounded-lg border border-outline-variant bg-surface-container-low',
                  )}
                  data-mol-id={`manage-update-${u.id}`}
                >
                  <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
                    <h3 className={cm.cn(cm.fontWeight('bold'))}>{u.title}</h3>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.sp('mt', 2),
                      'text-on-surface-variant whitespace-pre-line',
                    )}
                  >
                    {u.body}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      )}

      {tab === 'backers' && (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(3),
            'rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm',
          )}
          data-mol-id="manage-backers"
        >
          {pledges.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'campaignManage.backers.empty',
                {},
                {
                  defaultValue: 'No backers yet — share your campaign URL to get pledges flowing.',
                },
              )}
            </p>
          ) : (
            <ul className={cm.stack(3)}>
              {pledges.map((p) => (
                <li
                  key={p.id}
                  className={cm.cn(
                    cm.flex({ align: 'baseline', justify: 'between' }),
                    cm.sp('py', 3),
                    'border-b border-outline-variant',
                  )}
                  data-mol-id={`manage-backer-${p.id}`}
                >
                  <div>
                    <p className={cm.cn(cm.fontWeight('semibold'))}>
                      {p.backer_name ?? t('backers.anon', {}, { defaultValue: 'Anonymous' })}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {p.tier_title ? `${p.tier_title} · ` : ''}
                      {new Date(p.pledged_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={cm.cn(cm.fontWeight('bold'), 'text-primary tabular-nums')}>
                    {fmt(p.amount_cents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/backers"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.textCenter,
              'self-start rounded-lg bg-primary text-white shadow-sm',
            )}
          >
            {t('campaignManage.backers.cta', {}, { defaultValue: 'Open backers list' })}
          </Link>
        </section>
      )}
    </div>
  )
}

export default CampaignManage
