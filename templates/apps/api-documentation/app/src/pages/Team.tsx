import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

type Role = 'admin' | 'developer' | 'viewer'

interface Member {
  id: string
  email?: string | null
  role?: Role | null
  joined_at?: string | null
  invited_at?: string | null
}

const ROLE_LABEL_DEFAULT: Record<Role, string> = {
  admin: 'Admin',
  developer: 'Developer',
  viewer: 'Viewer',
}

const ROLE_TINT: Record<Role, string> = {
  admin: 'bg-violet-500/15 text-violet-300',
  developer: 'bg-emerald-500/15 text-emerald-300',
  viewer: 'bg-blue-500/15 text-blue-300',
}

function fmtRelative(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function Team() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('developer')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/team_members')
      .then((res) => {
        if (!cancelled) setMembers(unwrapList<Member>(res))
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

  const active = members.filter((m) => m.joined_at)
  const pending = members.filter((m) => !m.joined_at)
  const roleLabel = (r: Role): string =>
    t(`team.role.${r}`, {}, { defaultValue: ROLE_LABEL_DEFAULT[r] })

  function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // Read directly from the form so password managers, autofill, and
    // automated probes that set `input.value` without triggering React's
    // synthetic onChange still get their values picked up.
    const formData = new FormData(e.currentTarget)
    const emailValue = (formData.get('email') as string | null) ?? inviteEmail
    const roleValue = ((formData.get('role') as string | null) ?? inviteRole) as Role
    if (!emailValue || !emailValue.includes('@')) {
      setInviteError(
        t('team.inviteEmailRequired', {}, { defaultValue: 'Enter a valid email address.' }),
      )
      return
    }
    setInviting(true)
    setInviteError(null)
    http
      .post<Member>('/api/team_members', {
        team_id: 'self',
        email: emailValue,
        role: roleValue,
      })
      .then((res) => {
        const created = (
          res.data && typeof res.data === 'object'
            ? ((res.data as { data?: Member }).data ?? (res.data as Member))
            : null
        ) as Member | null
        const fallback: Member = {
          id: created?.id ?? `temp_${Date.now()}`,
          email: inviteEmail,
          role: inviteRole,
          invited_at: new Date().toISOString(),
          joined_at: null,
        }
        setMembers((prev) => [...prev, created ?? fallback])
        setInviteEmail('')
      })
      .catch(() => {
        setInviteError(t('team.inviteError', {}, { defaultValue: 'Could not send invitation.' }))
      })
      .finally(() => setInviting(false))
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn(
            'text-[11px] font-bold uppercase tracking-widest text-emerald-400 font-mono mb-2',
          )}
        >
          {t('team.eyebrow', {}, { defaultValue: 'TEAM' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('team.heading', {}, { defaultValue: 'Workspace members' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'team.subheading',
            { active: active.length, pending: pending.length },
            { defaultValue: '{{active}} active · {{pending}} pending invitation' },
          )}
        </p>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <section className={cm.cn('bg-surface-container-lowest rounded-2xl overflow-hidden')}>
          {active.length === 0 ? (
            <p
              className={cm.cn(
                cm.sp('py', 12),
                cm.sp('px', 6),
                cm.textCenter,
                'text-on-surface-variant',
              )}
            >
              {t(
                'team.empty',
                {},
                { defaultValue: 'No active team members yet — invite someone below.' },
              )}
            </p>
          ) : (
            <table className={cm.cn('w-full')}>
              <thead className={cm.cn('border-b border-outline-variant/30')}>
                <tr>
                  {(
                    [
                      ['email', 'Email'],
                      ['role', 'Role'],
                      ['lastActive', 'Last active'],
                    ] as const
                  ).map(([h, label]) => (
                    <th
                      key={h}
                      className={cm.cn(
                        'text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-mono',
                      )}
                    >
                      {t(`team.col.${h}`, {}, { defaultValue: label })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {active.map((m) => {
                  const role: Role = (m.role as Role) ?? 'viewer'
                  const initial = (m.email ?? '?').charAt(0).toUpperCase()
                  return (
                    <tr
                      key={m.id}
                      className={cm.cn('hover:bg-surface-container-low transition-colors')}
                    >
                      <td className={cm.cn('px-6 py-4')}>
                        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                          <div
                            className={cm.cn(
                              'w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-300',
                            )}
                            aria-hidden="true"
                          >
                            {initial}
                          </div>
                          <span className={cm.cn('text-sm font-mono')}>{m.email ?? '—'}</span>
                        </div>
                      </td>
                      <td className={cm.cn('px-6 py-4')}>
                        <span
                          className={cm.cn(
                            'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest',
                            ROLE_TINT[role],
                          )}
                        >
                          {roleLabel(role)}
                        </span>
                      </td>
                      <td className={cm.cn('px-6 py-4 text-xs text-on-surface-variant font-mono')}>
                        {fmtRelative(m.joined_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      <section className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl')}>
        <h2
          className={cm.cn(
            'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant font-mono mb-4',
          )}
        >
          {t('team.inviteHeading', {}, { defaultValue: 'INVITE_MEMBER' })}
        </h2>
        <form
          onSubmit={handleInvite}
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}
        >
          <input
            type="email"
            name="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder={t(
              'team.invitePlaceholder',
              {},
              { defaultValue: 'colleague@yourcompany.com' },
            )}
            className={cm.cn(
              'flex-1 min-w-[260px] px-4 py-2 rounded-full border border-outline-variant bg-surface-container-low font-mono text-sm focus:outline-none focus:border-primary',
            )}
          />
          <select
            name="role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as Role)}
            className={cm.cn(
              'px-4 py-2 rounded-full border border-outline-variant bg-surface-container-low font-mono text-sm',
            )}
          >
            <option value="admin">{roleLabel('admin')}</option>
            <option value="developer">{roleLabel('developer')}</option>
            <option value="viewer">{roleLabel('viewer')}</option>
          </select>
          <button
            type="submit"
            disabled={inviting}
            className={cm.cn(
              'px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {inviting
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('nav.invite', {}, { defaultValue: 'Send invite' })}
          </button>
        </form>
        {inviteError ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-error', cm.sp('mt', 2))}>{inviteError}</p>
        ) : null}

        {pending.length > 0 && (
          <div className={cm.cn('mt-6 pt-4 border-t border-outline-variant/30')}>
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-mono mb-3',
              )}
            >
              {t('team.pendingHeading', {}, { defaultValue: 'PENDING_INVITATIONS' })}
            </p>
            <ul className={cm.cn('space-y-2')}>
              {pending.map((p) => {
                const role: Role = (p.role as Role) ?? 'viewer'
                return (
                  <li
                    key={p.id ?? p.email ?? Math.random()}
                    className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}
                  >
                    <span className={cm.cn('text-sm font-mono')}>{p.email ?? '—'}</span>
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span
                        className={cm.cn(
                          'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest',
                          ROLE_TINT[role],
                        )}
                      >
                        {roleLabel(role)}
                      </span>
                      <span className={cm.cn('text-xs text-on-surface-variant font-mono')}>
                        {fmtRelative(p.invited_at)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
