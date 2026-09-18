import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CampaignCard } from '../components/CampaignCard.js'
import { CampaignHeroBanner } from '../components/CampaignHeroBanner.js'
import { KpiStatCard } from '../components/KpiStatCard.js'
import { api, type ApiCampaign, type ApiPledge, type ApiProfile, toCardData } from '../lib/api.js'

interface FullProfile extends ApiProfile {
  campaigns: ApiCampaign[]
  backed_campaigns: ApiPledge[]
  stats: {
    campaigns_created: number
    campaigns_funded: number
    total_raised: number
    backed_count: number
  }
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth()
  const { userId } = useParams<{ userId: string }>()
  const isOwnProfile = !userId || userId === (user as { id?: string } | null)?.id
  const [profile, setProfile] = useState<FullProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const data = userId
          ? ((await api.getProfile(http, userId)) as FullProfile)
          : await (async () => {
              const me = await api.getMyProfile(http)
              return {
                ...me,
                campaigns: await api.myCampaigns(http),
                backed_campaigns: await api.myPledges(http),
                stats: {
                  campaigns_created: me.campaigns_created,
                  campaigns_funded: me.campaigns_funded,
                  total_raised: me.total_raised,
                  backed_count: me.pledges_count,
                },
              } as FullProfile
            })()
        if (alive) setProfile(data)
      } catch (err) {
        if (alive)
          setError(
            err instanceof Error
              ? err.message
              : t('profile.loadError', {}, { defaultValue: 'Failed to load profile' }),
          )
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [http, t, userId])

  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`

  if (loading)
    return (
      <div className={cm.cn(cm.sp('py', 16), cm.textCenter)} data-mol-id="profile-loading">
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error || !profile)
    return (
      <div
        className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}
        data-mol-id="profile-error"
      >
        {error ?? t('profile.notFound', {}, { defaultValue: 'Profile not found' })}
      </div>
    )

  const displayName =
    profile.name ??
    profile.username ??
    profile.email ??
    t('profile.defaultName', {}, { defaultValue: 'Creator' })
  const joined = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
    : null

  return (
    <div data-mol-id="page-profile">
      <CampaignHeroBanner
        size="inner"
        eyebrow={t('profile.eyebrow', {}, { defaultValue: 'Creator profile' })}
        heading={displayName}
        subheading={profile.bio ?? t('profile.noBio', {}, { defaultValue: 'No bio set yet.' })}
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
        <section
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 6),
            'rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm flex-wrap gap-4',
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <div
              className={cm.cn(
                cm.w(16),
                cm.h(16),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                cm.fontWeight('bold'),
                cm.textSize('2xl'),
                'text-white shadow-md',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p
                className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}
                data-mol-id="profile-name"
              >
                {displayName}
              </p>
              {joined ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('profile.joined', { date: joined }, { defaultValue: 'Member since {{date}}' })}
                </p>
              ) : null}
            </div>
          </div>
          {isOwnProfile ? (
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <Link
                to="/settings"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container transition-colors',
                )}
                data-mol-id="profile-edit"
              >
                {t('nav.editProfile', {}, { defaultValue: 'Edit profile' })}
              </Link>
            </div>
          ) : null}
        </section>

        <section
          className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          data-mol-id="profile-kpis"
        >
          <KpiStatCard
            label={t('profile.kpi.created', {}, { defaultValue: 'Campaigns created' })}
            value={String(profile.stats.campaigns_created)}
            icon="rocket_launch"
            accent="primary"
          />
          <KpiStatCard
            label={t('profile.kpi.funded', {}, { defaultValue: 'Funded campaigns' })}
            value={String(profile.stats.campaigns_funded)}
            icon="trending_up"
            accent="accent"
          />
          <KpiStatCard
            label={t('profile.kpi.raised', {}, { defaultValue: 'Total raised' })}
            value={fmt(profile.stats.total_raised)}
            icon="payments"
            accent="tertiary"
          />
          <KpiStatCard
            label={t('profile.kpi.backed', {}, { defaultValue: 'Campaigns backed' })}
            value={String(profile.stats.backed_count)}
            icon="favorite"
            accent="warning"
          />
        </section>

        {profile.campaigns.length > 0 ? (
          <section className={cm.stack(4)} data-mol-id="profile-campaigns">
            <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                {t('profile.campaigns.title', {}, { defaultValue: 'Campaigns from this creator' })}
              </h2>
              <Link
                to="/discover"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'text-primary hover:underline',
                )}
              >
                {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
              </Link>
            </div>
            <div
              className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}
            >
              {profile.campaigns.map((c) => (
                <CampaignCard key={c.id} campaign={toCardData(c)} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default Profile
