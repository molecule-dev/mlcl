import { type FormEvent, useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LanguagePairBadge } from '../components/LanguagePairBadge.js'
import { PageHeading } from '../components/PageHeading.js'
import { unwrapList } from '../lib/unwrap.js'

interface Member {
  id: string
  name: string
  initials: string
  email: string
  role: 'owner' | 'admin' | 'reviewer' | 'linguist'
  pairs: ReadonlyArray<{ source: string; target: string }>
  status: 'active' | 'invited'
  created_at?: string
}

interface ApiTeamRow {
  id?: unknown
  email?: unknown
  role?: unknown
  member_user_id?: unknown
  created_at?: unknown
}

const ROLE_TONE: Record<Member['role'], string> = {
  owner: 'bg-tertiary-container/15 text-tertiary',
  admin: 'bg-primary-fixed text-on-primary-fixed',
  reviewer: 'bg-warning-light text-warning',
  linguist: 'bg-secondary-fixed/50 text-on-secondary-fixed',
}

const ROLE_LABEL: Record<Member['role'], string> = {
  owner: 'Owner',
  admin: 'Admin',
  reviewer: 'Reviewer',
  linguist: 'Linguist',
}

const PERMISSIONS = [
  { role: 'owner', description: 'Full workspace control. Billing, member changes, deletion.' },
  { role: 'admin', description: 'Add and remove members, configure integrations, edit glossary.' },
  { role: 'reviewer', description: 'Approve segments, sign-off on releases, comment.' },
  { role: 'linguist', description: 'Translate, edit, and propose glossary additions.' },
] as const

function normalizeRole(raw: string): Member['role'] {
  const r = raw.toLowerCase()
  if (r === 'owner' || r === 'admin' || r === 'reviewer') return r
  if (r === 'translator' || r === 'linguist') return 'linguist'
  return 'linguist'
}

function initialsFromEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  const parts = local.split(/[.\-_+]/).filter(Boolean)
  if (parts.length === 0) return email.slice(0, 2).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function adapt(row: ApiTeamRow, idx: number): Member {
  const email = String(row.email ?? '')
  const role = normalizeRole(String(row.role ?? 'linguist'))
  return {
    id: String(row.id ?? `t_${idx}`),
    name: email.split('@')[0] ?? email,
    initials: initialsFromEmail(email),
    email,
    role,
    pairs: [],
    status: row.member_user_id ? 'active' : 'invited',
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? ''),
  }
}

export function Team() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [members, setMembers] = useState<ReadonlyArray<Member>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'reviewer' | 'translator'>('translator')
  const [inviteStatus, setInviteStatus] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editRoleDraft, setEditRoleDraft] = useState<'admin' | 'reviewer' | 'translator'>(
    'translator',
  )
  const [resentId, setResentId] = useState<string | null>(null)
  const [actionStatus, setActionStatus] = useState<string | null>(null)

  const refresh = () => {
    setLoading(true)
    setError(null)
    http
      .get('/team')
      .then((res) => {
        const list = unwrapList<ApiTeamRow>(res)
        setMembers(list.map((m, i) => adapt(m, i)))
      })
      .catch(() => {
        setError(t('team.loadError', {}, { defaultValue: 'Failed to load team.' }))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/team')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<ApiTeamRow>(res)
        setMembers(list.map((m, i) => adapt(m, i)))
      })
      .catch(() => {
        if (!cancelled) setError(t('team.loadError', {}, { defaultValue: 'Failed to load team.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const handleInviteSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return
    try {
      await http.post('/team', { email: inviteEmail, role: inviteRole })
      setInviteStatus(
        t('team.inviteSent', { email: inviteEmail }, { defaultValue: 'Invite sent to {{email}}.' }),
      )
      setInviteEmail('')
      setShowInvite(false)
      refresh()
    } catch (_error) {
      // Invite request failed — surface the error message to the user.
      setInviteStatus(
        t('team.inviteFailed', {}, { defaultValue: 'Could not send invite. Please retry.' }),
      )
    }
  }

  const startEdit = (m: Member) => {
    if (editId === m.id) {
      setEditId(null)
      return
    }
    setEditId(m.id)
    const role = m.role === 'linguist' ? 'translator' : m.role === 'owner' ? 'admin' : m.role
    setEditRoleDraft(role as 'admin' | 'reviewer' | 'translator')
  }

  const saveEditedRole = async (memberId: string) => {
    try {
      await http.put(`/team/${encodeURIComponent(memberId)}`, { role: editRoleDraft })
      setActionStatus(t('team.roleUpdated', {}, { defaultValue: 'Role updated.' }))
      setEditId(null)
      refresh()
    } catch (_error) {
      // Role update failed — surface the error message to the user.
      setActionStatus(t('team.roleUpdateFailed', {}, { defaultValue: 'Could not update role.' }))
    }
  }

  const removeMember = async (memberId: string) => {
    if (
      !window.confirm(
        t('team.removeConfirm', {}, { defaultValue: 'Remove this member from the workspace?' }),
      )
    )
      return
    try {
      await http.delete(`/team/${encodeURIComponent(memberId)}`)
      setActionStatus(t('team.removed', {}, { defaultValue: 'Member removed.' }))
      setEditId(null)
      refresh()
    } catch (_error) {
      // Member removal failed — surface the error message to the user.
      setActionStatus(t('team.removeFailed', {}, { defaultValue: 'Could not remove member.' }))
    }
  }

  const resendInvite = async (memberId: string) => {
    try {
      const member = members.find((m) => m.id === memberId)
      if (!member) return
      const apiRole =
        member.role === 'linguist' ? 'translator' : member.role === 'owner' ? 'admin' : member.role
      await http.put(`/team/${encodeURIComponent(memberId)}`, { role: apiRole })
      setResentId(memberId)
      setActionStatus(
        t(
          'team.resentStatus',
          { email: member.email },
          { defaultValue: 'Invite refreshed for {{email}}.' },
        ),
      )
    } catch (_error) {
      // Resend invite failed — surface the error message to the user.
      setActionStatus(t('team.resendFailed', {}, { defaultValue: 'Could not resend the invite.' }))
    }
  }

  const pending = useMemo(() => members.filter((m) => m.status === 'invited'), [members])
  const active = useMemo(() => members.filter((m) => m.status === 'active'), [members])

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'lg' }),
        cm.sp('p', 8),
        cm.maxW('7xl'),
        cm.mxAuto,
        cm.minH('screen'),
        'w-full',
      )}
    >
      <PageHeading
        eyebrow={t('nav.workspace', {}, { defaultValue: 'Workspace' })}
        title={t('nav.team', {}, { defaultValue: 'Team' })}
        subtitle={t(
          'team.subtitle',
          {},
          { defaultValue: 'Workspace members and pending invites.' },
        )}
        actions={
          <button
            onClick={() => setShowInvite((prev) => !prev)}
            type="button"
            aria-expanded={showInvite}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full inline-flex items-center gap-2 text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 shadow-sm shadow-primary/30',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              {showInvite ? 'close' : 'person_add'}
            </span>
            {showInvite
              ? t('common.cancel', {}, { defaultValue: 'Cancel' })
              : t('team.invite', {}, { defaultValue: 'Invite member' })}
          </button>
        }
      />

      {showInvite && (
        <form
          onSubmit={handleInviteSubmit}
          className={cm.cn(
            cm.sp('p', 5),
            cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
            'rounded-xl bg-surface-container-low border border-surface-container/50',
          )}
        >
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder={t(
              'team.emailPlaceholder',
              {},
              { defaultValue: 'colleague@workspace.com' },
            )}
            className={cm.cn(
              'flex-1 min-w-[16rem] px-4 py-2 rounded-lg border-0 bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 focus:outline-none',
            )}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as 'admin' | 'reviewer' | 'translator')}
            className={cm.cn(
              'px-3 py-2 rounded-lg border-0 bg-surface-container-lowest text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none',
            )}
          >
            <option value="translator">
              {t('team.role.linguist', {}, { defaultValue: 'Linguist' })}
            </option>
            <option value="reviewer">
              {t('team.role.reviewer', {}, { defaultValue: 'Reviewer' })}
            </option>
            <option value="admin">{t('team.role.admin', {}, { defaultValue: 'Admin' })}</option>
          </select>
          <button
            type="submit"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full text-on-primary bg-primary hover:opacity-90 transition-opacity',
            )}
          >
            {t('nav.invite', {}, { defaultValue: 'Send invite' })}
          </button>
        </form>
      )}

      {inviteStatus && (
        <div
          role="status"
          className={cm.cn(
            cm.sp('p', 3),
            'rounded-xl bg-primary-fixed/40 text-on-primary-fixed text-sm',
          )}
        >
          {inviteStatus}
        </div>
      )}

      {actionStatus && (
        <div
          role="status"
          data-mol-id="team-action-status"
          className={cm.cn(
            cm.sp('p', 3),
            'rounded-xl bg-primary-fixed/40 text-on-primary-fixed text-sm',
          )}
        >
          {actionStatus}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl bg-error-container text-on-error-container text-sm',
          )}
        >
          {error}
        </div>
      )}

      {loading && (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('team.loading', {}, { defaultValue: 'Loading team…' })}
        </p>
      )}

      {!loading && active.length === 0 && !error && (
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.textCenter,
            cm.sp('py', 12),
            'text-on-surface-variant',
          )}
        >
          {t(
            'team.empty',
            {},
            { defaultValue: 'No active team members yet — invite someone to start collaborating.' },
          )}
        </p>
      )}

      {active.length > 0 && (
        <section
          className={cm.cn(
            'bg-surface-container-lowest rounded-2xl border border-surface-container/50 shadow-sm overflow-hidden',
          )}
        >
          <table className={cm.cn('w-full text-sm')}>
            <thead>
              <tr className={cm.cn('text-on-surface-variant bg-surface-container-low')}>
                <th
                  className={cm.cn(
                    'text-left px-5 py-3 font-bold text-[10px] uppercase tracking-widest',
                  )}
                >
                  {t('status.member', {}, { defaultValue: 'Member' })}
                </th>
                <th
                  className={cm.cn(
                    'text-left px-5 py-3 font-bold text-[10px] uppercase tracking-widest',
                  )}
                >
                  {t('form.role', {}, { defaultValue: 'Role' })}
                </th>
                <th
                  className={cm.cn(
                    'text-left px-5 py-3 font-bold text-[10px] uppercase tracking-widest',
                  )}
                >
                  {t('team.col.pairs', {}, { defaultValue: 'Locale pairs' })}
                </th>
                <th
                  className={cm.cn(
                    'text-right px-5 py-3 font-bold text-[10px] uppercase tracking-widest',
                  )}
                >
                  {t('nav.actions', {}, { defaultValue: 'Actions' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-surface-container')}>
              {active.map((m) => (
                <tr key={m.id} className={cm.cn('hover:bg-surface-container-low ')}>
                  <td className={cm.cn('px-5 py-4')}>
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          cm.w(8),
                          cm.h(8),
                          cm.fontWeight('bold'),
                          cm.textSize('xs'),
                          'rounded-full bg-primary text-on-primary',
                        )}
                      >
                        {m.initials}
                      </span>
                      <div>
                        <p className={cm.cn(cm.fontWeight('semibold'))}>{m.name}</p>
                        <p
                          className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant font-mono')}
                        >
                          {m.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={cm.cn('px-5 py-4')}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase tracking-widest',
                        ROLE_TONE[m.role],
                      )}
                    >
                      {t(`team.role.${m.role}`, {}, { defaultValue: ROLE_LABEL[m.role] })}
                    </span>
                  </td>
                  <td className={cm.cn('px-5 py-4')}>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
                      {m.pairs.map((p, i) => (
                        <LanguagePairBadge key={i} source={p.source} target={p.target} size="sm" />
                      ))}
                      {m.pairs.length === 0 && (
                        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          —
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={cm.cn('px-5 py-4 text-right')}>
                    <button
                      data-mol-id={`team-edit-${m.id}`}
                      onClick={() => startEdit(m)}
                      type="button"
                      aria-expanded={editId === m.id}
                      className={cm.cn(cm.textSize('xs'), 'font-bold text-primary hover:underline')}
                    >
                      {editId === m.id
                        ? t('team.editClose', {}, { defaultValue: 'Close' })
                        : t('common.edit', {}, { defaultValue: 'Edit' })}
                    </button>
                    {editId === m.id && (
                      <div
                        className={cm.cn(
                          cm.flex({ direction: 'col', gap: 'sm' }),
                          cm.sp('mt', 2),
                          'items-stretch text-left',
                        )}
                      >
                        <select
                          data-mol-id={`team-edit-role-${m.id}`}
                          value={editRoleDraft}
                          onChange={(e) =>
                            setEditRoleDraft(e.target.value as 'admin' | 'reviewer' | 'translator')
                          }
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 2),
                            'rounded-lg border-0 bg-surface-container-low text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none',
                          )}
                        >
                          <option value="translator">
                            {t('team.role.linguist', {}, { defaultValue: 'Linguist' })}
                          </option>
                          <option value="reviewer">
                            {t('team.role.reviewer', {}, { defaultValue: 'Reviewer' })}
                          </option>
                          <option value="admin">
                            {t('team.role.admin', {}, { defaultValue: 'Admin' })}
                          </option>
                        </select>
                        <div className={cm.flex({ align: 'center', gap: 'sm', justify: 'end' })}>
                          <button
                            data-mol-id={`team-edit-save-${m.id}`}
                            type="button"
                            onClick={() => {
                              void saveEditedRole(m.id)
                            }}
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.sp('py', 1),
                              cm.fontWeight('semibold'),
                              cm.textSize('xs'),
                              'rounded-full bg-primary text-on-primary',
                            )}
                          >
                            {t('common.save', {}, { defaultValue: 'Save' })}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void removeMember(m.id)
                            }}
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.sp('py', 1),
                              cm.fontWeight('semibold'),
                              cm.textSize('xs'),
                              'rounded-full text-error hover:bg-error-container/30',
                            )}
                          >
                            {t('common.remove', {}, { defaultValue: 'Remove' })}
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-2')}>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl border border-surface-container/50 shadow-sm',
          )}
        >
          <h3
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mb', 4),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('team.pendingHeading', {}, { defaultValue: 'Pending invites' })}
          </h3>
          {pending.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('team.pendingEmpty', {}, { defaultValue: 'No pending invites.' })}
            </p>
          ) : (
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              {pending.map((p) => (
                <li
                  key={p.id}
                  className={cm.cn(
                    cm.sp('p', 3),
                    cm.flex({ align: 'center', justify: 'between' }),
                    'rounded-lg bg-surface-container-low',
                  )}
                >
                  <div>
                    <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'font-mono')}>
                      {p.email}
                    </p>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant uppercase tracking-widest font-bold',
                      )}
                    >
                      {t(`team.role.${p.role}`, {}, { defaultValue: ROLE_LABEL[p.role] })}
                    </p>
                  </div>
                  <button
                    data-mol-id={`team-resend-${p.id}`}
                    onClick={() => {
                      void resendInvite(p.id)
                    }}
                    type="button"
                    className={cm.cn(cm.textSize('xs'), 'font-bold text-primary hover:underline')}
                  >
                    {resentId === p.id
                      ? t('team.resent', {}, { defaultValue: 'Resent ✓' })
                      : t('team.resend', {}, { defaultValue: 'Resend' })}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl border border-surface-container/50 shadow-sm',
          )}
        >
          <h3
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mb', 4),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('team.permissionsHeading', {}, { defaultValue: 'Roles & permissions' })}
          </h3>
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {PERMISSIONS.map((p) => (
              <li
                key={p.role}
                className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }), cm.textSize('sm'))}
              >
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest mt-0.5',
                    ROLE_TONE[p.role as Member['role']],
                  )}
                >
                  {t(
                    `team.role.${p.role}`,
                    {},
                    { defaultValue: ROLE_LABEL[p.role as Member['role']] },
                  )}
                </span>
                <span className={cm.cn('text-on-surface-variant flex-1')}>
                  {t(`team.permission.${p.role}`, {}, { defaultValue: p.description })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

export default Team
export { Team as TeamPage }
