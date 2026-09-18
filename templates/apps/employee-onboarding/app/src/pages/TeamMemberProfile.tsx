import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TeamMemberApi {
  id: string
  name: string
  role?: string | null
  department?: string | null
  bio?: string | null
  slack_handle?: string | null
  email?: string | null
  start_date?: string | null
}

export function TeamMemberProfile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [member, setMember] = useState<TeamMemberApi | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!http || !id) return
    setLoading(true)
    http
      .get<TeamMemberApi>(`/api/team-members/${id}`)
      .then((r) => setMember(r.data))
      .catch(() => setMember(null))
      .finally(() => setLoading(false))
  }, [http, id])

  if (loading) {
    return (
      <div data-mol-id="page-team-profile" className={cm.flex({ direction: 'col', gap: 'lg' })}>
        <p className={cm.textMuted}>
          {t('teamProfile.loading', {}, { defaultValue: 'Loading teammate…' })}
        </p>
      </div>
    )
  }

  if (!member) {
    return (
      <div data-mol-id="page-team-profile" className={cm.flex({ direction: 'col', gap: 'lg' })}>
        <nav className="uppercase tracking-[0.18em] text-on-surface-variant">
          <Link to="/team">{t('nav.team', {}, { defaultValue: 'Team' })}</Link>
        </nav>
        <div className={cm.cn(cm.emptyState, cm.sp('py', 12))}>
          <p className={cm.emptyStateTitle}>
            {t('teamProfile.notFound', {}, { defaultValue: 'Teammate not found' })}
          </p>
        </div>
      </div>
    )
  }

  const initials = member.name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const startMonth = member.start_date
    ? new Date(member.start_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : null

  return (
    <div data-mol-id="page-team-profile" className={cm.flex({ direction: 'col', gap: 'lg' })}>
      <nav className="uppercase tracking-[0.18em] text-on-surface-variant">
        <Link to="/team">{t('nav.team', {}, { defaultValue: 'Team' })}</Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <span data-mol-id="team-profile-name">{member.name}</span>
      </nav>

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
            background: 'rgba(255,255,255,0.2)',
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
              color: 'var(--mol-color-surface)',
              flexShrink: 0,
              border: '3px solid rgba(255,255,255,0.4)',
            }}
          >
            {initials}
          </div>
          <div style={{ flex: '1 1 320px' }}>
            <p
              className="text-[10px] font-black uppercase tracking-[0.2em]"
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              {member.department ?? ''}
            </p>
            <h1
              className="font-extrabold tracking-tight"
              style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.05, marginTop: '4px' }}
            >
              {member.name}
            </h1>
            {member.role && (
              <p style={{ marginTop: '8px', color: 'rgba(255,255,255,0.92)' }}>{member.role}</p>
            )}
          </div>
          <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
            {member.email && (
              <a
                href={`mailto:${member.email}`}
                data-mol-id="team-profile-email-link"
                className="font-bold"
                style={{
                  padding: '10px 18px',
                  borderRadius: '999px',
                  background: 'var(--mol-color-surface)',
                  color: 'var(--mol-color-primary)',
                  textDecoration: 'none',
                }}
              >
                {t('teamProfile.message', {}, { defaultValue: 'Send email' })}
              </a>
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
        <section
          className={cm.sp('p', 6)}
          style={{
            background: 'var(--color-surface, var(--mol-color-surface))',
            borderRadius: '20px',
            border: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
          }}
        >
          <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl tracking-tight')}>
            {t('nav.about', {}, { defaultValue: 'About' })}
          </h2>
          <p className={cm.cn(cm.sp('mt', 3), 'leading-relaxed')}>
            {member.bio ??
              t('teamProfile.noBio', {}, { defaultValue: 'No bio yet — say hi to learn more.' })}
          </p>
        </section>

        <aside
          className={cm.sp('p', 6)}
          style={{
            background: 'var(--color-surface, var(--mol-color-surface))',
            borderRadius: '20px',
            border: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
          }}
        >
          <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant">
            {t('teamProfile.factsHeading', {}, { defaultValue: 'Quick facts' })}
          </h2>
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('mt', 4))}>
            {member.department && (
              <li className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <span className="uppercase tracking-[0.12em] text-on-surface-variant">
                  {t('teamProfile.department', {}, { defaultValue: 'Department' })}
                </span>
                <span className="font-semibold">{member.department}</span>
              </li>
            )}
            {startMonth && (
              <li className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <span className="uppercase tracking-[0.12em] text-on-surface-variant">
                  {t('teamProfile.joined', {}, { defaultValue: 'Joined' })}
                </span>
                <span className="font-semibold">{startMonth}</span>
              </li>
            )}
            {member.email && (
              <li className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <span className="uppercase tracking-[0.12em] text-on-surface-variant">
                  {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                </span>
                <a href={`mailto:${member.email}`} className="font-semibold text-primary">
                  {member.email}
                </a>
              </li>
            )}
            {member.slack_handle && (
              <li className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <span className="uppercase tracking-[0.12em] text-on-surface-variant">
                  {t('teamProfile.slack', {}, { defaultValue: 'Slack' })}
                </span>
                <span className="font-semibold">{member.slack_handle}</span>
              </li>
            )}
          </ul>
        </aside>
      </div>
    </div>
  )
}
