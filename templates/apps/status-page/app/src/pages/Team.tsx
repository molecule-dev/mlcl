import { useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { MetricKpiCard } from '../components/MetricKpiCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface TeamMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'operator' | 'viewer'
  on_call?: boolean
  shift?: string | null
  avatar_initial?: string | null
  tz?: string | null
}

function initialFor(name: string): string {
  const trimmed = (name || '').trim()
  if (!trimmed) return '?'
  return trimmed.slice(0, 1).toUpperCase()
}

const ROLE_TINT: Record<TeamMember['role'], { bg: string; text: string }> = {
  owner: { bg: 'rgba(16, 185, 129, 0.18)', text: '#6ee7b7' },
  operator: { bg: 'rgba(99, 102, 241, 0.18)', text: '#a5b4fc' },
  viewer: { bg: 'rgba(148, 163, 184, 0.18)', text: 'var(--color-chip-text)' },
}

const ROLE_LABEL: Record<TeamMember['role'], string> = {
  owner: 'Owner',
  operator: 'Operator',
  viewer: 'Viewer',
}

export function Team() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TeamMember['role']>('operator')

  const refresh = async () => {
    const res = await http.get('/api/team')
    setMembers(unwrapList<TeamMember>(res))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    refresh()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setInviteError(null)
    try {
      const res = await http.post('/api/team', {
        name: name.trim(),
        email: email.trim(),
        role,
      })
      const created = (res.data ?? {}) as { id?: string }
      track({ name: 'team.member_added', properties: { id: created.id, role } })
      setName('')
      setEmail('')
      setShowInvite(false)
      await refresh()
    } catch (err) {
      setInviteError(
        err instanceof Error
          ? err.message
          : t('team.inviteError', {}, { defaultValue: 'Could not invite member' }),
      )
    } finally {
      setInviting(false)
    }
  }

  const counts = useMemo(() => {
    return {
      total: members.length,
      operators: members.filter((m) => m.role === 'operator' || m.role === 'owner').length,
      onCall: members.filter((m) => m.on_call).length,
      viewers: members.filter((m) => m.role === 'viewer').length,
    }
  }, [members])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))} data-mol-id="page-team">
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-8')}>
        <div>
          <p
            className={cm.cn(
              'font-mono text-xs font-bold uppercase tracking-widest text-primary mb-2',
            )}
          >
            {t('team.eyebrow', { app: APP_NAME }, { defaultValue: '$ {{app}} team --on-call' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('team.heading', {}, { defaultValue: 'Team & on-call' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'team.subheading',
              {},
              {
                defaultValue:
                  'Operators, viewers, and the active on-call rotation for incident pages.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          data-testid="invite-team-btn"
          onClick={() => setShowInvite((s) => !s)}
          className={cm.cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90',
          )}
          style={{
            backgroundColor: 'var(--color-status-operational)',
            color: 'var(--color-on-status-operational)',
          }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            person_add
          </span>
          {t('team.invite', {}, { defaultValue: 'Invite member' })}
        </button>
      </header>

      {showInvite ? (
        <form
          onSubmit={onInvite}
          data-testid="invite-team-form"
          className={cm.cn('rounded-2xl p-6 mb-8')}
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.65)',
            border: '1px solid var(--color-border-card)',
          }}
        >
          <p
            className={cm.cn(
              'font-mono text-[10px] font-black uppercase tracking-widest text-primary mb-3',
            )}
          >
            {t('team.inviteHeading', {}, { defaultValue: 'Invite a team member' })}
          </p>
          <div className={cm.cn('grid gap-3 grid-cols-1 md:grid-cols-3')}>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="invite-team-name"
              placeholder={t('form.name', {}, { defaultValue: 'Name' })}
              className={cm.cn('px-3 py-2 rounded-md font-mono text-sm')}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--color-border-card)',
                color: 'var(--mol-color-text)',
              }}
            />
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="invite-team-email"
              placeholder="name@example.com"
              className={cm.cn('px-3 py-2 rounded-md font-mono text-sm')}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--color-border-card)',
                color: 'var(--mol-color-text)',
              }}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as TeamMember['role'])}
              data-testid="invite-team-role"
              className={cm.cn('px-3 py-2 rounded-md font-mono text-sm')}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--color-border-card)',
                color: 'var(--mol-color-text)',
              }}
            >
              <option value="owner">{t('team.role.owner', {}, { defaultValue: 'Owner' })}</option>
              <option value="operator">
                {t('team.role.operator', {}, { defaultValue: 'Operator' })}
              </option>
              <option value="viewer">
                {t('team.role.viewer', {}, { defaultValue: 'Viewer' })}
              </option>
            </select>
          </div>
          {inviteError ? (
            <p
              role="alert"
              data-testid="invite-team-error"
              className={cm.cn('mt-3 font-mono text-[11px]')}
              style={{ color: 'var(--color-error-text-vivid-on-dark)' }}
            >
              {inviteError}
            </p>
          ) : null}
          <div className={cm.cn('mt-4 flex items-center justify-end gap-2')}>
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              className={cm.cn(
                'px-3 py-1.5 rounded-md font-mono text-xs font-bold uppercase tracking-widest',
              )}
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                color: 'var(--color-chip-text)',
                border: '1px solid var(--color-border-card)',
              }}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={inviting || !name.trim() || !email.trim()}
              data-testid="invite-team-submit"
              className={cm.cn(
                'px-3 py-1.5 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50',
              )}
              style={{
                backgroundColor: 'var(--color-status-operational)',
                color: 'var(--color-on-status-operational)',
              }}
            >
              {inviting
                ? t('team.inviting', {}, { defaultValue: 'Inviting…' })
                : t('team.inviteSubmit', {}, { defaultValue: 'Add member' })}
            </button>
          </div>
        </form>
      ) : null}

      <section className={cm.cn('grid gap-4 grid-cols-2 md:grid-cols-4 mb-8')}>
        <MetricKpiCard
          eyebrow={t('nav.members', {}, { defaultValue: 'Members' })}
          value={String(counts.total)}
          icon="group"
          tone="operational"
        />
        <MetricKpiCard
          eyebrow={t('team.kpi.operators', {}, { defaultValue: 'Operators' })}
          value={String(counts.operators)}
          icon="engineering"
          tone="operational"
        />
        <MetricKpiCard
          eyebrow={t('team.kpi.onCall', {}, { defaultValue: 'On-call now' })}
          value={String(counts.onCall)}
          icon="phone_paused"
          tone="maintenance"
        />
        <MetricKpiCard
          eyebrow={t('team.kpi.viewers', {}, { defaultValue: 'Viewers' })}
          value={String(counts.viewers)}
          icon="visibility"
          tone="neutral"
        />
      </section>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('team.loading', {}, { defaultValue: 'Loading team…' })}
        </p>
      ) : (
        <ul className={cm.cn('grid gap-3 grid-cols-1 md:grid-cols-2')}>
          {members.map((m) => {
            const tint = ROLE_TINT[m.role]
            return (
              <li
                key={m.id}
                className={cm.cn('rounded-xl px-5 py-4 flex items-center gap-4')}
                style={{
                  backgroundColor: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid var(--color-border-card)',
                  borderLeft: m.on_call ? '4px solid var(--color-status-operational)' : undefined,
                }}
              >
                <span
                  className={cm.cn(
                    'inline-flex h-12 w-12 items-center justify-center rounded-full text-lg font-extrabold shrink-0',
                  )}
                  style={{
                    backgroundColor: 'rgba(99, 102, 241, 0.25)',
                    color: '#c7d2fe',
                    border: '2px solid rgba(11, 17, 32, 0.9)',
                  }}
                  aria-hidden="true"
                >
                  {m.avatar_initial || initialFor(m.name)}
                </span>
                <div className={cm.cn('min-w-0 flex-1')}>
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <p className={cm.cn('font-bold text-on-surface truncate')}>{m.name}</p>
                    <span
                      className={cm.cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-extrabold uppercase tracking-widest',
                      )}
                      style={{ backgroundColor: tint.bg, color: tint.text }}
                    >
                      {t(`team.role.${m.role}`, {}, { defaultValue: ROLE_LABEL[m.role] ?? m.role })}
                    </span>
                    {m.on_call ? (
                      <span
                        className={cm.cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-extrabold uppercase tracking-widest',
                        )}
                        style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.20)',
                          color: 'var(--color-link-hover)',
                        }}
                      >
                        <span
                          className={cm.cn('inline-block h-1.5 w-1.5 rounded-full animate-pulse')}
                          style={{ backgroundColor: 'var(--color-status-operational)' }}
                          aria-hidden="true"
                        />
                        {t('team.onCallTag', {}, { defaultValue: 'On call' })}
                      </span>
                    ) : null}
                  </div>
                  <p className={cm.cn('mt-0.5 font-mono text-xs text-on-surface-variant truncate')}>
                    {m.email}
                    {m.tz ? ` · ${m.tz}` : ''}
                  </p>
                  {m.shift ? (
                    <p className={cm.cn('mt-1 font-mono text-[11px] text-on-surface-variant')}>
                      {m.shift}
                    </p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
