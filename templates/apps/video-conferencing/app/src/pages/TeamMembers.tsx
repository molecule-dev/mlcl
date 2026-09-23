import { useCallback, useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ApiWorkspace {
  id: string
  name: string
  slug: string
}

interface ApiMember {
  id: string
  workspace_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at?: string
}

function unwrap<T>(value: unknown, fallback: T): T {
  let current: unknown = value
  for (let i = 0; i < 3; i++) {
    if (Array.isArray(current)) return current as T
    if (current && typeof current === 'object' && 'data' in current) {
      current = (current as { data: unknown }).data
      continue
    }
    break
  }
  return Array.isArray(current) ? (current as T) : fallback
}

const ROLE_STYLES: Record<string, string> = {
  owner: 'bg-primary/15 text-primary',
  admin: 'bg-secondary/15 text-secondary',
  member: 'bg-on-surface-variant/10 text-on-surface-variant',
}

function memberInitial(m: ApiMember): string {
  return m.user_id.slice(0, 1).toUpperCase()
}

export function TeamMembers() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [workspace, setWorkspace] = useState<ApiWorkspace | null>(null)
  const [members, setMembers] = useState<ApiMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  const loadMembers = useCallback(
    (ws: ApiWorkspace) => {
      return http
        .get(`/api/workspace-members/${ws.id}`)
        .then((res) => setMembers(unwrap<ApiMember[]>(res, [])))
        .catch(() => setMembers([]))
    },
    [http],
  )

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/workspaces')
      .then(async (res) => {
        const list = unwrap<ApiWorkspace[]>(res, [])
        const first = list[0]
        if (cancelled) return
        if (first) {
          setWorkspace(first)
          await loadMembers(first)
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, loadMembers])

  const submitInvite = useCallback(async () => {
    if (!workspace) return
    setInviteError(null)
    setInviteSuccess(null)
    if (!inviteEmail.trim()) {
      setInviteError(t('team.emailRequired', {}, { defaultValue: 'Email required' }))
      return
    }
    setInviteSubmitting(true)
    try {
      await http.post('/api/workspace-members/invite', {
        workspace_id: workspace.id,
        email: inviteEmail.trim(),
        role: inviteRole,
      })
      // No PII in telemetry — role + workspace are enough for the funnel.
      track({
        name: 'member.invited',
        properties: { workspace_id: workspace.id, role: inviteRole },
      })
      setInviteSuccess(
        t(
          'team.invited',
          { email: inviteEmail.trim() },
          { defaultValue: `Invited ${inviteEmail.trim()}` },
        ),
      )
      setInviteEmail('')
      await loadMembers(workspace)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setInviteSubmitting(false)
    }
  }, [http, inviteEmail, inviteRole, loadMembers, t, workspace])

  return (
    <div className={cm.stack(8)}>
      <header
        className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 6 }), 'flex-wrap')}
      >
        <div className={cm.stack(2)}>
          <span
            data-testid="member-count"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
          <h1 className={cm.cn('text-4xl font-extrabold tracking-tight text-on-surface')}>
            {t('team.title', {}, { defaultValue: 'Team members' })}
          </h1>
          <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
            {workspace
              ? t(
                  'team.subtitleWithWorkspace',
                  { name: workspace.name },
                  { defaultValue: `Workspace: ${workspace.name}` },
                )
              : t('team.subtitle', {}, { defaultValue: 'Everyone in your workspace.' })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowInvite((v) => !v)}
          data-testid="open-invite"
          disabled={!workspace}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'bg-gradient-to-r from-primary to-secondary text-on-primary shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/45 transition-all disabled:opacity-50',
          )}
        >
          <span className={'material-symbols-outlined text-lg'}>person_add</span>
          {t('team.invite', {}, { defaultValue: 'Invite member' })}
        </button>
      </header>

      {showInvite && (
        <section
          data-testid="invite-member-form"
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(3),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('team.invite', {}, { defaultValue: 'Invite member' })}
          </h2>
          <label className={cm.stack(1)}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.email', {}, { defaultValue: 'Email' })}
            </span>
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              type="email"
              aria-label={t('team.inviteEmailAria', {}, { defaultValue: 'Invite email' })}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none',
              )}
            />
          </label>
          <label className={cm.stack(1)}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('team.role', {}, { defaultValue: 'Role' })}
            </span>
            <select
              value={inviteRole}
              aria-label={t('team.inviteRoleAria', {}, { defaultValue: 'Invite role' })}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none',
              )}
            >
              <option value="member">{t('team.roleMember', {}, { defaultValue: 'Member' })}</option>
              <option value="admin">{t('team.roleAdmin', {}, { defaultValue: 'Admin' })}</option>
            </select>
          </label>
          {inviteError && (
            <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
              {inviteError}
            </p>
          )}
          {inviteSuccess && (
            <p
              role="status"
              data-testid="invite-success"
              className={cm.cn(cm.textSize('sm'), 'text-success')}
            >
              {inviteSuccess}
            </p>
          )}
          <button
            type="button"
            onClick={submitInvite}
            disabled={inviteSubmitting}
            data-testid="submit-invite-member"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'self-start bg-primary text-on-primary hover:bg-primary-dark disabled:opacity-50',
            )}
          >
            {inviteSubmitting
              ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
              : t('nav.invite', {}, { defaultValue: 'Send invite' })}
          </button>
        </section>
      )}

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : !workspace ? (
        <p
          data-testid="no-workspace"
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
        >
          {t(
            'team.noWorkspace',
            {},
            { defaultValue: 'You are not a member of any workspace yet.' },
          )}
        </p>
      ) : (
        <section
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
        >
          {members.length === 0 ? (
            <p
              data-testid="no-members"
              className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
            >
              {t('team.empty', {}, { defaultValue: 'No members yet.' })}
            </p>
          ) : (
            <table className={'w-full'}>
              <thead>
                <tr className={'border-b border-outline-variant/40'}>
                  <th
                    className={
                      'px-2 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant'
                    }
                  >
                    {t('team.columnMember', {}, { defaultValue: 'Member' })}
                  </th>
                  <th
                    className={
                      'px-2 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant'
                    }
                  >
                    {t('team.role', {}, { defaultValue: 'Role' })}
                  </th>
                  <th
                    className={
                      'px-2 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant'
                    }
                  >
                    {t('team.columnJoined', {}, { defaultValue: 'Joined' })}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {members.map((m) => (
                  <tr key={m.id} data-testid={`member-row-${m.id}`}>
                    <td className={cm.cn(cm.sp('px', 2), cm.sp('py', 3))}>
                      <div className={cm.flex({ align: 'center', gap: 3 })}>
                        <div
                          className={
                            'w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-sm font-bold text-on-primary-container'
                          }
                        >
                          {memberInitial(m)}
                        </div>
                        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                          {m.user_id}
                        </p>
                      </div>
                    </td>
                    <td className={cm.cn(cm.sp('px', 2), cm.sp('py', 3))}>
                      <span
                        className={cm.cn(
                          'px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full',
                          ROLE_STYLES[m.role] ?? ROLE_STYLES.member,
                        )}
                      >
                        {m.role}
                      </span>
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'text-on-surface-variant',
                      )}
                    >
                      {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  )
}
