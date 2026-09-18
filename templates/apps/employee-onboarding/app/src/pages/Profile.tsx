import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ProgressRing } from '../components/ProgressRing.js'

interface MeApi {
  user: { id: string; name?: string | null; firstName?: string | null; email?: string | null }
  onboarding: { id: string; start_date: string }
  counts: {
    totalTasks: number
    completedTasks: number
    inProgressTasks: number
    overdueTasks: number
    totalMilestones: number
    achievedMilestones: number
  }
  derived: { completionPct: number; dayNumber: number }
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [me, setMe] = useState<MeApi | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!http) return
    setLoading(true)
    http
      .get<MeApi>('/api/onboardings/me')
      .then((r) => setMe(r.data))
      .catch(() => setMe(null))
      .finally(() => setLoading(false))
  }, [http])

  if (loading) {
    return (
      <div data-mol-id="page-profile" className={cm.flex({ direction: 'col', gap: 'lg' })}>
        <p className={cm.textMuted}>
          {t('nav.loadingProfile', {}, { defaultValue: 'Loading profile…' })}
        </p>
      </div>
    )
  }

  const fullName =
    me?.user.name ?? me?.user.email ?? t('profile.unknownName', {}, { defaultValue: 'Welcome' })
  const firstName = me?.user.firstName ?? me?.user.name?.split(/\s+/)[0] ?? ''
  const lastName = me?.user.name?.split(/\s+/).slice(1).join(' ') ?? ''
  const initials = (firstName[0] ?? '') + (lastName[0] ?? '')
  const startDateRaw = me?.onboarding.start_date
  const startDate = startDateRaw ? new Date(startDateRaw) : null
  const startDateLabel = startDate
    ? startDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'
  const cohort = startDate
    ? t(
        'profile.cohort',
        { season: startDate.getMonth() < 6 ? 'Spring' : 'Fall', year: startDate.getFullYear() },
        {
          defaultValue: `${startDate.getMonth() < 6 ? 'Spring' : 'Fall'} ${startDate.getFullYear()}`,
        },
      )
    : ''
  const completionPct = me?.derived.completionPct ?? 0

  return (
    <div data-mol-id="page-profile" className={cm.flex({ direction: 'col', gap: 'lg' })}>
      <section
        className={cm.cn(cm.sp('p', 8))}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '2rem',
          background:
            'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-primary-dark) 50%, var(--mol-color-secondary) 100%)',
          color: 'var(--mol-color-surface)',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            right: '-80px',
            bottom: '-80px',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)',
            filter: 'blur(48px)',
          }}
        />
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'flex-wrap')}
          style={{ position: 'relative' }}
        >
          <div
            className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.22)',
              backdropFilter: 'blur(12px)',
              fontSize: '32px',
              fontWeight: 800,
              flexShrink: 0,
              border: '3px solid rgba(255,255,255,0.4)',
            }}
          >
            {initials.toUpperCase() || '?'}
          </div>
          <div style={{ flex: '1 1 320px' }}>
            {cohort && (
              <p
                className="text-[10px] font-black uppercase tracking-[0.2em]"
                style={{ color: 'rgba(255,255,255,0.85)' }}
              >
                {cohort}
              </p>
            )}
            <h1
              data-mol-id="profile-name"
              className="font-extrabold tracking-tight"
              style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.05, marginTop: '4px' }}
            >
              {fullName}
            </h1>
            {me?.user.email && (
              <p style={{ marginTop: '4px', color: 'rgba(255,255,255,0.92)' }}>{me.user.email}</p>
            )}
          </div>
        </div>
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: '32px',
        }}
      >
        <section className={cm.flex({ direction: 'col', gap: 'md' })}>
          <article
            className={cm.sp('p', 6)}
            style={{
              background: 'var(--color-surface, var(--mol-color-surface))',
              borderRadius: '20px',
              border: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
            }}
          >
            <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant">
              {t('profile.detailsHeading', {}, { defaultValue: 'Onboarding details' })}
            </h2>
            <dl
              className={cm.sp('mt', 4)}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '20px',
              }}
            >
              <div>
                <dt className="uppercase tracking-[0.12em] text-on-surface-variant">
                  {t('form.startDate', {}, { defaultValue: 'Start date' })}
                </dt>
                <dd
                  data-mol-id="profile-start-date"
                  className={cm.cn(cm.fontWeight('semibold'), cm.sp('mt', 1), 'text-sm')}
                >
                  {startDateLabel}
                </dd>
              </div>
              <div>
                <dt className="uppercase tracking-[0.12em] text-on-surface-variant">
                  {t('profile.dayNumber', {}, { defaultValue: 'Day' })}
                </dt>
                <dd className={cm.cn(cm.fontWeight('semibold'), cm.sp('mt', 1), 'text-sm')}>
                  {me?.derived.dayNumber ?? 1} / 90
                </dd>
              </div>
              <div>
                <dt className="uppercase tracking-[0.12em] text-on-surface-variant">
                  {t('profile.tasks', {}, { defaultValue: 'Tasks' })}
                </dt>
                <dd className={cm.cn(cm.fontWeight('semibold'), cm.sp('mt', 1), 'text-sm')}>
                  {me?.counts.completedTasks ?? 0} / {me?.counts.totalTasks ?? 0}
                </dd>
              </div>
              <div>
                <dt className="uppercase tracking-[0.12em] text-on-surface-variant">
                  {t('profile.milestones', {}, { defaultValue: 'Milestones' })}
                </dt>
                <dd className={cm.cn(cm.fontWeight('semibold'), cm.sp('mt', 1), 'text-sm')}>
                  {me?.counts.achievedMilestones ?? 0} / {me?.counts.totalMilestones ?? 0}
                </dd>
              </div>
            </dl>
          </article>
        </section>

        <aside
          className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), cm.sp('p', 8))}
          style={{
            background:
              'linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
            borderRadius: '20px',
            border: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
            textAlign: 'center',
          }}
        >
          <p
            className="text-[10px] font-black uppercase tracking-[0.18em]"
            style={{ color: 'var(--mol-color-secondary)' }}
          >
            {t('profile.progressEyebrow', {}, { defaultValue: 'Onboarding progress' })}
          </p>
          <div className={cm.sp('mt', 4)}>
            <ProgressRing
              value={completionPct}
              size={140}
              stroke={12}
              label={t('common.complete', {}, { defaultValue: 'Complete' })}
            />
          </div>
          <p
            data-mol-id="profile-completion-pct"
            className={cm.cn(cm.fontWeight('bold'), cm.sp('mt', 4), 'text-base')}
          >
            {t(
              'profile.completionLine',
              { pct: completionPct },
              {
                defaultValue:
                  completionPct === 0
                    ? 'Just getting started.'
                    : `${completionPct}% of your checklist done.`,
              },
            )}
          </p>
          <p className={cm.cn(cm.textMuted, cm.sp('mt', 2), 'text-sm leading-relaxed')}>
            {t(
              'profile.encouragementBody',
              {},
              { defaultValue: 'Keep your buddy and manager in the loop — small steps compound.' },
            )}
          </p>
        </aside>
      </div>
    </div>
  )
}
