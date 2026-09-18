import { useMemo, useState } from 'react'

import { getClient as getHttpClient } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { StatusPill } from '../components/StatusPill.js'
import { useApi } from '../lib/useApi.js'
import { SettingsTabs } from './Settings.js'

const PANEL_BG = 'color-mix(in srgb, var(--mol-color-surface) 60%, transparent)'
const PANEL_BORDER = 'var(--mol-color-border)'
const FIELD_BORDER = 'var(--mol-color-border)'

type Role = 'admin' | 'developer' | 'viewer'

interface ApiTeamMember {
  id: string
  user_id: string
  member_id: string | null
  email: string
  name: string | null
  role: Role
  status: 'pending' | 'active'
  last_active_at: string | null
  created_at: string
  updated_at: string
}

const ROLE_TINT: Record<Role, { fg: string; bg: string; ring: string }> = {
  admin: {
    fg: 'var(--mol-color-success)',
    bg: 'color-mix(in srgb, var(--mol-color-success) 15%, transparent)',
    ring: 'color-mix(in srgb, var(--mol-color-success) 30%, transparent)',
  },
  developer: {
    fg: 'var(--mol-color-secondary)',
    bg: 'color-mix(in srgb, var(--mol-color-secondary) 15%, transparent)',
    ring: 'color-mix(in srgb, var(--mol-color-secondary) 30%, transparent)',
  },
  viewer: {
    fg: 'var(--mol-color-text-secondary)',
    bg: 'color-mix(in srgb, var(--mol-color-text-secondary) 15%, transparent)',
    ring: 'color-mix(in srgb, var(--mol-color-text-secondary) 30%, transparent)',
  },
}

const ROLE_DESCRIPTION: Record<Role, { perms: string[] }> = {
  admin: {
    perms: [
      '*  full workspace control',
      '*  manage team + billing',
      '*  rotate signing secrets',
      '*  delete workspace',
    ],
  },
  developer: {
    perms: [
      '*  create / edit endpoints',
      '*  replay deliveries',
      '*  view audit log',
      '✗  no billing access',
    ],
  },
  viewer: {
    perms: [
      '*  read deliveries + endpoints',
      '*  view payload contents',
      '✗  no replay or config edits',
      '✗  no audit log access',
    ],
  },
}

const initialsFor = (name: string | null, email: string): string => {
  const v = (name ?? '').trim()
  if (v) {
    const parts = v.split(/\s+/)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return v.slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

const fmtRelative = (s: string | null): string => {
  if (!s) return 'never'
  const ms = Date.now() - new Date(s).getTime()
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return 'now'
  const mins = Math.floor(sec / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function Team() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { data: members, refetch } = useApi<ApiTeamMember[]>('/team_members')

  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('developer')
  const [inviteName, setInviteName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const list = useMemo(() => members ?? [], [members])
  const active = list.filter((m) => m.status === 'active')
  const pending = list.filter((m) => m.status === 'pending')

  const sendInvite = async () => {
    if (submitting) return
    if (!inviteEmail.includes('@')) {
      setError(t('team.error.invalidEmail', {}, { defaultValue: 'Enter a valid email.' }))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const client = getHttpClient()
      await client.post('/team_members', {
        email: inviteEmail.trim(),
        role: inviteRole,
        name: inviteName.trim() || undefined,
      })
      setInviteEmail('')
      setInviteName('')
      setInviteRole('developer')
      setShowInvite(false)
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const updateRole = async (id: string, role: Role) => {
    try {
      const client = getHttpClient()
      await client.patch(`/team_members/${id}`, { role })
      setOpenMenuId(null)
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.')
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm(t('team.confirmRemove', {}, { defaultValue: 'Remove this member?' })))
      return
    try {
      const client = getHttpClient()
      await client.delete(`/team_members/${id}`)
      setOpenMenuId(null)
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed.')
    }
  }

  const resend = async (id: string) => {
    try {
      const client = getHttpClient()
      await client.post(`/team_members/${id}/resend`, {})
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resend failed.')
    }
  }

  return (
    <div
      className={cm.cn(cm.sp('p', 6), 'max-w-6xl mx-auto')}
      style={{ color: 'var(--mol-color-text)' }}
      data-mol-id="team-root"
    >
      <div className={cm.cn('mb-6')}>
        <p
          className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
          style={{ color: BRAND_COLOR }}
        >
          {t('team.eyebrow', {}, { defaultValue: 'workspace · members' })}
        </p>
        <h1
          className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}
          style={{ color: 'var(--mol-color-text)' }}
        >
          {t('nav.team', {}, { defaultValue: 'Team' })}
        </h1>
        <p
          className={cm.cn('mt-2 text-sm max-w-xl')}
          style={{ color: 'var(--mol-color-text-secondary)' }}
        >
          {t(
            'team.body',
            {},
            { defaultValue: 'Manage who can access endpoints, secrets, and audit logs.' },
          )}
        </p>
      </div>

      <SettingsTabs active="team" />

      {error && (
        <p
          className={cm.cn('mb-4 text-xs font-mono')}
          style={{ color: 'var(--mol-color-error)' }}
          role="alert"
        >
          {error}
        </p>
      )}

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <section className={cm.cn('lg:col-span-8 flex flex-col gap-4')}>
          <div className={cm.cn('flex items-center justify-between flex-wrap gap-2')}>
            <p
              className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
              style={{ color: 'var(--mol-color-text-secondary)' }}
            >
              {t(
                'team.activeCount',
                { count: active.length },
                { defaultValue: '{{count}} active members' },
              )}
            </p>
            <button
              type="button"
              onClick={() => setShowInvite((v) => !v)}
              className={cm.cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono font-semibold text-sm transition-all hover:opacity-90 shadow-lg',
              )}
              style={{
                backgroundColor: BRAND_COLOR,
                color: 'var(--color-on-primary)',
                boxShadow:
                  '0 8px 24px -8px color-mix(in srgb, var(--mol-color-primary) 40%, transparent)',
              }}
              data-mol-id="team-toggle-invite"
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                {showInvite ? 'close' : 'person_add'}
              </span>
              {showInvite
                ? t('common.cancel', {}, { defaultValue: 'Cancel' })
                : t('team.invite', {}, { defaultValue: 'Invite member' })}
            </button>
          </div>

          {showInvite && (
            <div
              className={cm.cn('rounded-xl p-5')}
              style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
              data-mol-id="team-invite-form"
            >
              <div className={cm.cn('grid gap-3 grid-cols-1 sm:grid-cols-2 mb-3')}>
                <div>
                  <label
                    className={cm.cn(
                      'block font-mono text-[10px] font-black uppercase tracking-widest mb-2',
                    )}
                    style={{ color: 'var(--mol-color-text-secondary)' }}
                    htmlFor="invite-email"
                  >
                    {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="someone@your-org.com"
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('py', 3),
                      cm.sp('px', 4),
                      'rounded-md font-mono text-sm',
                    )}
                    style={{
                      backgroundColor: 'var(--mol-color-background-secondary)',
                      border: `1px solid ${FIELD_BORDER}`,
                      color: 'var(--mol-color-text)',
                    }}
                    data-mol-id="team-invite-email"
                  />
                </div>
                <div>
                  <label
                    className={cm.cn(
                      'block font-mono text-[10px] font-black uppercase tracking-widest mb-2',
                    )}
                    style={{ color: 'var(--mol-color-text-secondary)' }}
                    htmlFor="invite-name"
                  >
                    {t('team.fieldName', {}, { defaultValue: 'Display name (optional)' })}
                  </label>
                  <input
                    id="invite-name"
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Riley Park"
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('py', 3),
                      cm.sp('px', 4),
                      'rounded-md text-sm',
                    )}
                    style={{
                      backgroundColor: 'var(--mol-color-background-secondary)',
                      border: `1px solid ${FIELD_BORDER}`,
                      color: 'var(--mol-color-text)',
                    }}
                    data-mol-id="team-invite-name"
                  />
                </div>
              </div>
              <p
                className={cm.cn(
                  'block font-mono text-[10px] font-black uppercase tracking-widest mt-2 mb-2',
                )}
                style={{ color: 'var(--mol-color-text-secondary)' }}
              >
                {t('form.role', {}, { defaultValue: 'Role' })}
              </p>
              <div className={cm.cn('flex items-center gap-2 flex-wrap')}>
                {(['admin', 'developer', 'viewer'] as const).map((r) => {
                  const tint = ROLE_TINT[r]
                  const isActive = inviteRole === r
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setInviteRole(r)}
                      className={cm.cn(
                        'px-3 py-1.5 rounded-md font-mono text-xs font-bold uppercase tracking-widest',
                      )}
                      style={{
                        backgroundColor: isActive ? tint.bg : 'transparent',
                        color: isActive ? tint.fg : 'var(--mol-color-text-secondary)',
                        boxShadow: `inset 0 0 0 1px ${isActive ? tint.fg : FIELD_BORDER}`,
                      }}
                      data-mol-id={`team-invite-role-${r}`}
                    >
                      {r}
                    </button>
                  )
                })}
              </div>
              <div className={cm.cn('mt-5 flex justify-end gap-2')}>
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className={cm.cn('px-4 py-2 rounded-md font-mono text-sm font-semibold')}
                  style={{
                    border: '1px solid var(--mol-color-border)',
                    color: 'var(--mol-color-text)',
                  }}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="button"
                  onClick={sendInvite}
                  disabled={submitting}
                  className={cm.cn(
                    'px-5 py-2 rounded-md font-mono text-sm font-semibold disabled:opacity-60',
                  )}
                  style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
                  data-mol-id="team-invite-submit"
                >
                  {submitting
                    ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                    : t('nav.invite', {}, { defaultValue: 'Send invite' })}
                </button>
              </div>
            </div>
          )}

          <div
            className={cm.cn('rounded-xl overflow-hidden')}
            style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
            data-mol-id="team-active-list"
          >
            {active.length === 0 ? (
              <div className={cm.cn('px-8 py-12 text-center')} data-mol-id="team-empty-active">
                <p
                  className={cm.cn('font-mono text-sm font-bold mb-1')}
                  style={{ color: 'var(--mol-color-text-secondary)' }}
                >
                  {t(
                    'team.empty',
                    {},
                    { defaultValue: 'You are the only member of this workspace.' },
                  )}
                </p>
                <p className={cm.cn('text-xs')} style={{ color: 'var(--mol-color-text-tertiary)' }}>
                  {t(
                    'team.emptyHint',
                    {},
                    { defaultValue: 'Click "Invite member" to add teammates.' },
                  )}
                </p>
              </div>
            ) : (
              <ul>
                {active.map((member, i) => {
                  const tint = ROLE_TINT[member.role]
                  return (
                    <li
                      key={member.id}
                      className={cm.cn(
                        'flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface/5 relative',
                      )}
                      style={{
                        borderBottom:
                          i < active.length - 1
                            ? '1px solid color-mix(in srgb, var(--mol-color-border) 50%, transparent)'
                            : 'none',
                      }}
                      data-mol-id={`team-member-${member.id}`}
                    >
                      <span
                        className={cm.cn(
                          'inline-flex h-9 w-9 items-center justify-center rounded-full font-mono text-xs font-extrabold',
                        )}
                        style={{ backgroundColor: tint.bg, color: tint.fg }}
                        aria-hidden="true"
                      >
                        {initialsFor(member.name, member.email)}
                      </span>
                      <div className={cm.cn('flex-1 min-w-0')}>
                        <p
                          className={cm.cn('text-sm font-bold')}
                          style={{ color: 'var(--mol-color-text)' }}
                        >
                          {member.name ?? member.email}
                        </p>
                        <p
                          className={cm.cn('text-xs')}
                          style={{ color: 'var(--mol-color-text-secondary)' }}
                        >
                          {member.email}
                        </p>
                      </div>
                      <span
                        className={cm.cn(
                          'inline-flex px-2 py-0.5 rounded-full font-mono text-[10px] font-extrabold uppercase tracking-widest',
                        )}
                        style={{
                          backgroundColor: tint.bg,
                          color: tint.fg,
                          boxShadow: `inset 0 0 0 1px ${tint.ring}`,
                        }}
                      >
                        {t(`team.role.${member.role}`, {}, { defaultValue: member.role })}
                      </span>
                      <span
                        className={cm.cn('font-mono text-[11px] hidden sm:block w-20 text-right')}
                        style={{ color: 'var(--mol-color-text-tertiary)' }}
                      >
                        {fmtRelative(member.last_active_at)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                        className={cm.cn(
                          'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-surface/5',
                        )}
                        style={{ color: 'var(--mol-color-text-secondary)' }}
                        aria-label={t(
                          'team.actions.menu',
                          { name: member.name ?? member.email },
                          { defaultValue: 'Manage {{name}}' },
                        )}
                        data-mol-id={`team-member-menu-${member.id}`}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-base')}
                          aria-hidden="true"
                        >
                          more_vert
                        </span>
                      </button>
                      {openMenuId === member.id && (
                        <div
                          className={cm.cn(
                            'absolute right-3 top-12 rounded-md shadow-lg p-2 z-10 flex flex-col gap-1',
                          )}
                          style={{
                            backgroundColor: 'var(--mol-color-background-secondary)',
                            border: '1px solid var(--mol-color-border)',
                            minWidth: '200px',
                          }}
                          data-mol-id={`team-member-menu-popover-${member.id}`}
                        >
                          {(['admin', 'developer', 'viewer'] as const).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => updateRole(member.id, r)}
                              className={cm.cn(
                                'text-left px-3 py-1.5 rounded font-mono text-xs hover:bg-surface/5',
                              )}
                              style={{
                                color:
                                  r === member.role
                                    ? 'var(--mol-color-success)'
                                    : 'var(--mol-color-text-secondary)',
                              }}
                              data-mol-id={`team-member-set-${r}-${member.id}`}
                            >
                              {r === member.role ? '✓ ' : '  '}
                              {t(`team.setRole.${r}`, {}, { defaultValue: `Set role: ${r}` })}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => remove(member.id)}
                            className={cm.cn(
                              'text-left px-3 py-1.5 rounded font-mono text-xs hover:bg-surface/5',
                            )}
                            style={{ color: 'var(--mol-color-error)' }}
                            data-mol-id={`team-member-remove-${member.id}`}
                          >
                            {t('team.remove', {}, { defaultValue: 'Remove member' })}
                          </button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div
            className={cm.cn('rounded-xl p-5')}
            style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
            data-mol-id="team-pending-list"
          >
            <div className={cm.cn('flex items-center justify-between mb-3')}>
              <h2
                className={cm.cn('text-base font-extrabold tracking-tight')}
                style={{ color: 'var(--mol-color-text)' }}
              >
                {t(
                  'team.pendingInvites',
                  { count: pending.length },
                  { defaultValue: 'Pending invites ({{count}})' },
                )}
              </h2>
              {pending.length > 0 && <StatusPill status="pending" label="WAITING" />}
            </div>
            {pending.length === 0 ? (
              <p
                className={cm.cn('text-sm font-mono')}
                style={{ color: 'var(--mol-color-text-tertiary)' }}
              >
                {t('team.pendingEmpty', {}, { defaultValue: 'No outstanding invites.' })}
              </p>
            ) : (
              <ul className={cm.cn('flex flex-col gap-2')}>
                {pending.map((invite) => (
                  <li
                    key={invite.id}
                    className={cm.cn('flex items-center gap-3 px-3 py-2 rounded-md flex-wrap')}
                    style={{
                      backgroundColor:
                        'color-mix(in srgb, var(--mol-color-surface) 60%, transparent)',
                      border: '1px solid var(--mol-color-border)',
                    }}
                    data-mol-id={`team-pending-${invite.id}`}
                  >
                    <span
                      className={cm.cn('font-mono text-xs flex-1 min-w-0 truncate')}
                      style={{ color: 'var(--mol-color-text-secondary)' }}
                    >
                      {invite.email}
                    </span>
                    <span
                      className={cm.cn(
                        'font-mono text-[10px] font-black uppercase tracking-widest',
                      )}
                      style={{ color: 'var(--mol-color-text-secondary)' }}
                    >
                      {invite.role}
                    </span>
                    <span
                      className={cm.cn('font-mono text-[11px]')}
                      style={{ color: 'var(--mol-color-text-tertiary)' }}
                    >
                      sent {fmtRelative(invite.updated_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => resend(invite.id)}
                      className={cm.cn('font-mono text-[11px] font-bold tracking-wider uppercase')}
                      style={{ color: 'var(--mol-color-secondary)' }}
                      data-mol-id={`team-pending-resend-${invite.id}`}
                    >
                      {t('team.resend', {}, { defaultValue: 'Resend' })}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(invite.id)}
                      className={cm.cn('font-mono text-[11px] font-bold tracking-wider uppercase')}
                      style={{ color: 'var(--mol-color-error)' }}
                      data-mol-id={`team-pending-revoke-${invite.id}`}
                    >
                      {t('common.revoke', {}, { defaultValue: 'Revoke' })}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className={cm.cn('lg:col-span-4 flex flex-col gap-3')}>
          <h2
            className={cm.cn('text-base font-extrabold tracking-tight')}
            style={{ color: 'var(--mol-color-text)' }}
          >
            {t('team.rolesTitle', {}, { defaultValue: 'Roles' })}
          </h2>
          {(['admin', 'developer', 'viewer'] as const).map((role) => {
            const tint = ROLE_TINT[role]
            return (
              <div
                key={role}
                className={cm.cn('rounded-xl p-5')}
                style={{
                  backgroundColor: PANEL_BG,
                  border: '1px solid var(--mol-color-border)',
                  borderLeft: `4px solid ${tint.fg}`,
                }}
              >
                <p
                  className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                  style={{ color: tint.fg }}
                >
                  {role}
                </p>
                <ul
                  className={cm.cn('mt-2 flex flex-col gap-1 font-mono text-xs')}
                  style={{ color: 'var(--mol-color-text-secondary)' }}
                >
                  {ROLE_DESCRIPTION[role].perms.map((line) => (
                    <li key={line} className={cm.cn('truncate')}>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </aside>
      </div>
    </div>
  )
}
