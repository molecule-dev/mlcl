import { useCallback, useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { SeverityPill } from '../components/SeverityPill.js'

interface Member {
  id: string
  user_id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'dev' | 'viewer'
  oncall: boolean
  member_status: 'active' | 'invited' | 'suspended' | 'resolved'
  active: boolean
  last_active: string | null
  created_at: string
}

interface Invite {
  id: string
  email: string
  role: string
  status: string
  created_at: string
}

const ROTATION_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

function deriveRotation(members: Member[]): Array<{ day: string; name: string }> {
  const oncall = members.filter((m) => m.oncall && m.active)
  const pool = (oncall.length > 0 ? oncall : members.filter((m) => m.active)).map((m) => m.name)
  return ROTATION_DAYS.map((day, i) => ({
    day,
    name: pool.length > 0 ? (pool[i % pool.length] ?? '—') : '—',
  }))
}

export function Team() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [showInvite, setShowInvite] = useState(false)
  // Two-step destructive confirm: the id of the member whose Remove is armed.
  const [armingRemoveId, setArmingRemoveId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'dev' | 'viewer'>('dev')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const res = await http.get<{ members: Member[]; invites: Invite[] }>('/api/team')
      const data = res.data
      setMembers(Array.isArray(data?.members) ? data.members : [])
      setInvites(Array.isArray(data?.invites) ? data.invites : [])
    } catch (error) {
      logError('team.reload', error)
      setError(t('team.loadError', {}, { defaultValue: "Couldn't load team." }))
    }
  }, [http, t])

  useEffect(() => {
    void reload()
  }, [reload])

  const sendInvite = useCallback(async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setError(null)
    try {
      await http.post('/api/team/invite', { email: inviteEmail.trim(), role: inviteRole })
      void track({
        name: 'team.invite_sent',
        properties: { email: inviteEmail.trim(), role: inviteRole },
      })
      setInviteEmail('')
      setShowInvite(false)
      await reload()
    } catch (error) {
      logError('team.sendInvite', error)
      setError(t('team.inviteError', {}, { defaultValue: "Couldn't send invite." }))
    } finally {
      setInviting(false)
    }
  }, [http, inviteEmail, inviteRole, reload, t])

  const removeMember = useCallback(
    async (id: string) => {
      try {
        await http.delete(`/api/team/members/${id}`)
        void track({ name: 'team.member_removed', properties: { member_id: id } })
        await reload()
      } catch (error) {
        logError('team.removeMember', error)
        setError(t('team.removeError', {}, { defaultValue: "Couldn't remove member." }))
      }
    },
    [http, reload, t],
  )

  const toggleOncall = useCallback(
    async (m: Member) => {
      try {
        await http.put(`/api/team/members/${m.id}`, { oncall: !m.oncall })
        await reload()
      } catch (error) {
        logError('team.toggleOncall', error)
        setError(t('team.toggleError', {}, { defaultValue: "Couldn't update on-call." }))
      }
    },
    [http, reload, t],
  )

  const cancelInvite = useCallback(
    async (id: string) => {
      try {
        await http.delete(`/api/team/invites/${id}`)
        await reload()
      } catch (error) {
        logError('team.cancelInvite', error)
        setError(t('team.cancelInviteError', {}, { defaultValue: "Couldn't cancel invite." }))
      }
    },
    [http, reload, t],
  )

  const oncallCount = members.filter((m) => m.oncall && m.active).length
  const rotation = useMemo(() => deriveRotation(members), [members])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-8')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t(
              'team.eyebrow',
              { app: APP_NAME.toLowerCase() },
              { defaultValue: '$ {{app}} team --members' },
            )}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t('nav.team', {}, { defaultValue: 'Team' })}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t(
              'team.subheading',
              { count: members.length, oncall: oncallCount },
              { defaultValue: '{{count}} members · {{oncall}} on-call' },
            )}
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          type="button"
          data-testid="team-invite-open"
          className={cm.cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-90',
          )}
          style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            person_add
          </span>
          {t('team.invite', {}, { defaultValue: 'Invite' })}
        </button>
      </header>

      {error ? (
        <p
          role="alert"
          data-testid="team-error"
          className={cm.cn('mb-4 font-mono text-xs')}
          style={{ color: 'var(--color-severity-critical)' }}
        >
          {error}
        </p>
      ) : null}

      {showInvite ? (
        <section
          role="dialog"
          aria-label={t('team.inviteDialog', {}, { defaultValue: 'Invite team member' })}
          className={cm.cn('mb-6 rounded-2xl p-5')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
          }}
        >
          <h2
            className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('team.inviteEyebrow', {}, { defaultValue: '// invite by email' })}
          </h2>
          <div className={cm.cn('flex flex-col md:flex-row gap-2 md:items-center')}>
            <input
              type="email"
              data-testid="team-invite-email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={t(
                'team.inviteEmailPlaceholder',
                {},
                { defaultValue: 'teammate@company.com' },
              )}
              className={cm.cn('flex-1 px-3 py-2 rounded font-mono text-sm')}
              style={{
                backgroundColor: 'var(--color-background-secondary)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            />
            <select
              data-testid="team-invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
              className={cm.cn('px-2 py-2 rounded font-mono text-sm')}
              style={{
                backgroundColor: 'var(--color-background-secondary)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            >
              <option value="admin">admin</option>
              <option value="dev">dev</option>
              <option value="viewer">viewer</option>
            </select>
            <button
              type="button"
              data-testid="team-invite-send"
              disabled={inviting}
              onClick={() => void sendInvite()}
              className={cm.cn(
                'px-4 py-2 rounded font-mono text-xs font-bold uppercase tracking-widest disabled:opacity-50',
              )}
              style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
            >
              {inviting ? '…' : t('nav.invite', {}, { defaultValue: 'Send invite' })}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowInvite(false)
                setInviteEmail('')
              }}
              className={cm.cn(
                'px-4 py-2 rounded font-mono text-xs font-bold uppercase tracking-widest hover:bg-surface/5',
              )}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        </section>
      ) : null}

      {invites.length > 0 ? (
        <section
          className={cm.cn('mb-6 rounded-2xl p-5')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p
            className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t(
              'team.invitesEyebrow',
              { count: invites.length },
              { defaultValue: '// pending invites · {{count}}' },
            )}
          </p>
          <ul data-testid="team-invites" className={cm.cn('space-y-2')}>
            {invites.map((inv) => (
              <li
                key={inv.id}
                data-testid="invite-row"
                className={cm.cn('flex items-center gap-3 rounded-md px-3 py-2.5')}
                style={{ backgroundColor: 'var(--color-background-tertiary)' }}
              >
                <span
                  className={cm.cn('font-mono text-sm flex-1 truncate')}
                  style={{ color: 'var(--color-text)' }}
                >
                  {inv.email}
                </span>
                <span
                  className={cm.cn(
                    'font-mono text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded',
                  )}
                  style={{
                    backgroundColor: 'var(--color-surface-overlay)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {inv.role}
                </span>
                <button
                  type="button"
                  data-testid="invite-cancel"
                  onClick={() => void cancelInvite(inv.id)}
                  className={cm.cn(
                    'inline-flex min-h-[36px] items-center -my-2 px-2 font-mono text-[10px] font-bold uppercase tracking-widest hover:opacity-80',
                  )}
                  style={{ color: 'var(--color-severity-critical)' }}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        className={cm.cn('mb-6 rounded-2xl p-5')}
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <p
          className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('team.rotation', {}, { defaultValue: '// on-call rotation · this week' })}
        </p>
        <div className={cm.cn('grid grid-cols-7 gap-2')}>
          {rotation.map((r) => (
            <div
              key={r.day}
              className={cm.cn('rounded-md p-3 text-center')}
              style={{
                backgroundColor: 'var(--color-background-tertiary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <p
                className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                style={{ color: 'var(--color-severity-muted)' }}
              >
                {r.day}
              </p>
              <p
                className={cm.cn('mt-1 font-bold text-sm truncate')}
                style={{ color: 'var(--color-text)' }}
              >
                {r.name}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        className={cm.cn('rounded-2xl overflow-hidden')}
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div
          className={cm.cn(
            'hidden md:grid md:grid-cols-12 px-5 py-3 border-b font-mono text-[9px] font-black uppercase tracking-widest',
          )}
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-severity-muted)' }}
        >
          <span className={cm.cn('col-span-4')}>
            {t('form.name', {}, { defaultValue: 'Name' })}
          </span>
          <span className={cm.cn('col-span-3')}>
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </span>
          <span className={cm.cn('col-span-1')}>
            {t('form.role', {}, { defaultValue: 'Role' })}
          </span>
          <span className={cm.cn('col-span-2')}>
            {t('team.col.oncall', {}, { defaultValue: 'On-call' })}
          </span>
          <span className={cm.cn('col-span-1 text-right')}>
            {t('team.col.last', {}, { defaultValue: 'Last' })}
          </span>
          <span className={cm.cn('col-span-1 text-right')} aria-hidden="true">
            ·
          </span>
        </div>
        {members.length === 0 ? (
          <p
            data-testid="team-empty"
            className={cm.cn('px-5 py-6 font-mono text-xs text-center')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('team.empty', {}, { defaultValue: 'No team yet — invite your first teammate.' })}
          </p>
        ) : (
          <ul
            data-testid="team-members"
            className={cm.cn('divide-y')}
            style={{ borderColor: 'var(--color-border-subtle)' }}
          >
            {members.map((m) => (
              <li
                key={m.id}
                data-testid="team-row"
                data-member-id={m.id}
                className={cm.cn(
                  'px-5 py-4 md:py-3 hover:bg-surface/5 transition-colors md:grid md:grid-cols-12 md:items-center md:gap-2',
                )}
              >
                <div className={cm.cn('flex items-center gap-3 min-w-0 md:col-span-4')}>
                  <span
                    className={cm.cn(
                      'h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
                    )}
                    style={{
                      backgroundColor: 'var(--color-severity-info-light)',
                      color: 'var(--color-severity-info)',
                      border: '2px solid var(--color-border)',
                    }}
                    aria-hidden="true"
                  >
                    {(m.name?.[0] ?? '?').toUpperCase()}
                  </span>
                  <div className={cm.cn('min-w-0 flex-1')}>
                    <p
                      className={cm.cn('font-bold truncate')}
                      style={{ color: 'var(--color-text)' }}
                    >
                      {m.name}
                    </p>
                    <p
                      className={cm.cn('md:hidden font-mono text-xs truncate')}
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {m.email}
                    </p>
                  </div>
                </div>
                <span
                  className={cm.cn('hidden md:block md:col-span-3 font-mono text-xs truncate')}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {m.email}
                </span>
                <span className={cm.cn('mt-2 md:mt-0 md:col-span-1 inline-flex')}>
                  <span
                    className={cm.cn(
                      'inline-flex items-center font-mono text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded',
                    )}
                    style={{
                      backgroundColor: 'var(--color-surface-overlay)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {m.role}
                  </span>
                </span>
                <span
                  className={cm.cn('mt-3 md:mt-0 md:col-span-2 flex flex-wrap items-center gap-2')}
                >
                  {m.oncall ? (
                    <SeverityPill
                      severity="resolved"
                      label={t('team.onCallNow', {}, { defaultValue: 'On call' })}
                    />
                  ) : (
                    <span
                      className={cm.cn('font-mono text-xs')}
                      style={{ color: 'var(--color-severity-muted)' }}
                    >
                      —
                    </span>
                  )}
                  <button
                    type="button"
                    data-testid="team-toggle-oncall"
                    onClick={() => void toggleOncall(m)}
                    className={cm.cn(
                      'inline-flex min-h-[36px] items-center -my-2 px-2 font-mono text-[9px] font-bold uppercase tracking-widest hover:opacity-80',
                    )}
                    style={{ color: 'var(--color-text-code)' }}
                  >
                    {m.oncall
                      ? t('team.standDown', {}, { defaultValue: 'Stand down' })
                      : t('team.takeOncall', {}, { defaultValue: 'Take call' })}
                  </button>
                </span>
                <span
                  className={cm.cn(
                    'mt-1 md:mt-0 md:col-span-1 block md:text-right font-mono text-xs',
                  )}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {m.last_active ?? '—'}
                </span>
                <span className={cm.cn('mt-2 md:mt-0 md:col-span-1 md:text-right inline-flex')}>
                  <button
                    type="button"
                    data-testid="team-member-remove"
                    onClick={() => {
                      if (armingRemoveId !== m.id) {
                        setArmingRemoveId(m.id)
                        return
                      }
                      setArmingRemoveId(null)
                      void removeMember(m.id)
                    }}
                    className={cm.cn(
                      'inline-flex min-h-[36px] items-center -my-2 px-2 font-mono text-[10px] font-bold uppercase tracking-widest hover:opacity-80',
                    )}
                    style={{ color: 'var(--color-severity-critical)' }}
                  >
                    {armingRemoveId === m.id
                      ? t('common.confirmRemove', {}, { defaultValue: 'Confirm?' })
                      : t('common.remove', {}, { defaultValue: 'Remove' })}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
