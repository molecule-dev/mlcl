import { useCallback, useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface WorkspaceRow {
  id: string
  name?: string | null
  owner_id?: string | null
}

interface MemberRow {
  id: string
  workspace_id?: string | null
  user_id?: string | null
  role?: 'owner' | 'admin' | 'member' | string | null
  joined_at?: string | null
  invited_by?: string | null
  email?: string | null
}

interface UserRow {
  id: string
  email?: string | null
  name?: string | null
}

interface EnrichedMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  initials: string
  joinedAt: string | null
  status: 'active' | 'pending'
}

const ROLE_TINT: Record<EnrichedMember['role'], string> = {
  owner: 'bg-fuchsia-100 text-fuchsia-700 ring-fuchsia-200',
  admin: 'bg-violet-100 text-violet-700 ring-violet-200',
  member: 'bg-cyan-100 text-cyan-700 ring-cyan-200',
  viewer: 'bg-surface-secondary text-foreground ring-border',
}

function unwrapWorkspace(payload: unknown): WorkspaceRow | null {
  if (!payload || typeof payload !== 'object') return null
  const direct = payload as WorkspaceRow & { data?: unknown }
  if (typeof direct.id === 'string') return direct
  if (direct.data && typeof direct.data === 'object') {
    const inner = direct.data as WorkspaceRow
    if (typeof inner.id === 'string') return inner
  }
  return null
}

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (payload && typeof payload === 'object') {
    const data = (payload as { data?: unknown }).data
    if (Array.isArray(data)) return data as T[]
  }
  return []
}

function deriveInitials(name: string, email: string): string {
  const candidate = (name || email || '?').trim()
  if (!candidate) return '?'
  const parts = candidate.split(/[@\s._-]+/).filter(Boolean)
  if (parts.length === 0) return candidate.slice(0, 2).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function normaliseRole(raw: string | null | undefined): EnrichedMember['role'] {
  const r = (raw ?? '').toLowerCase()
  if (r === 'owner') return 'owner'
  if (r === 'admin') return 'admin'
  if (r === 'viewer') return 'viewer'
  return 'member'
}

export function Team() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [workspace, setWorkspace] = useState<WorkspaceRow | null>(null)
  const [members, setMembers] = useState<EnrichedMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviting, setInviting] = useState(false)
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const wsRes = await http.get<WorkspaceRow>('/api/workspaces/me/primary')
      const ws = unwrapWorkspace(wsRes?.data)
      if (!ws?.id) throw new Error('No workspace found')
      setWorkspace(ws)
      const membersRes = await http.get(`/api/workspace-members/${ws.id}`)
      const rawMembers = unwrapList<MemberRow>(membersRes?.data)
      const userIds = Array.from(
        new Set(rawMembers.map((m) => m.user_id).filter(Boolean) as string[]),
      )
      const userById = new Map<string, UserRow>()
      await Promise.all(
        userIds.map(async (id) => {
          try {
            const u = await http.get(`/api/users/${id}`)
            const data = u?.data as { props?: UserRow } & UserRow
            const row = data.props ?? data
            if (row && typeof row.id === 'string') userById.set(id, row)
          } catch (_error) {
            // user fetch failures are non-fatal — member row renders with id only
          }
        }),
      )
      const enriched: EnrichedMember[] = rawMembers.map((m) => {
        const user = userById.get(String(m.user_id ?? ''))
        const email = user?.email ?? m.email ?? ''
        const name = user?.name ?? email.split('@')[0] ?? 'Member'
        return {
          id: m.id,
          name,
          email,
          role: normaliseRole(m.role),
          initials: deriveInitials(name, email),
          joinedAt: m.joined_at ?? null,
          status: m.joined_at ? 'active' : 'pending',
        }
      })
      setMembers(enriched)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('team.error.load', {}, { defaultValue: 'Failed to load team.' }),
      )
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const totalMembers = members.length
  const pendingCount = useMemo(
    () => members.filter((m) => m.status === 'pending').length,
    [members],
  )

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspace?.id || !inviteEmail.trim() || inviting) return
    setInviting(true)
    setInviteStatus('idle')
    setInviteMessage(null)
    try {
      await http.post('/api/workspace-members/invite', {
        workspace_id: workspace.id,
        email: inviteEmail.trim(),
        role: inviteRole,
      })
      track({
        name: 'member.invited',
        properties: { workspace_id: workspace.id, role: inviteRole },
      })
      setInviteEmail('')
      setInviteStatus('sent')
      setInviteMessage(
        t(
          'team.invite.success',
          { email: inviteEmail.trim() },
          { defaultValue: 'Invitation sent to {{email}}.' },
        ),
      )
      await refresh()
    } catch (err) {
      setInviteStatus('error')
      setInviteMessage(
        err instanceof Error
          ? err.message
          : t('team.invite.error', {}, { defaultValue: 'Failed to send invitation.' }),
      )
    } finally {
      setInviting(false)
    }
  }

  return (
    <div data-mol-id="team-page" className={cm.cn(cm.stack(8), cm.maxW('2xl'), 'mx-auto')}>
      <header className={cm.stack(2)}>
        <span
          className={cm.cn(
            'inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant w-fit',
          )}
        >
          <span
            className={cm.cn(
              'material-symbols-outlined text-base text-[var(--color-brand-gradient-from)]',
            )}
          >
            groups
          </span>
          {t('team.eyebrow', {}, { defaultValue: 'Workspace members' })}
        </span>
        <h1
          data-mol-id="team-workspace-name"
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-4xl md:text-5xl tracking-tight leading-[1.05] font-extrabold text-on-surface',
          )}
        >
          {workspace?.name ??
            t('team.title', { appName: APP_NAME }, { defaultValue: 'Your {{appName}} workspace' })}
        </h1>
      </header>

      <section className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2')}>
        <StatTile
          id="members"
          icon="groups"
          label={t('nav.members', {}, { defaultValue: 'Members' })}
          value={totalMembers.toString()}
          accent="border-[var(--color-brand-gradient-from)]"
          tile="bg-violet-50 text-violet-600"
        />
        <StatTile
          id="pending"
          icon="pending"
          label={t('team.stat.pending', {}, { defaultValue: 'Pending invites' })}
          value={pendingCount.toString()}
          accent="border-amber-500"
          tile="bg-warning-light text-warning"
        />
      </section>

      <section
        data-mol-id="team-invite-section"
        className={cm.cn(
          cm.sp('p', 6),
          cm.stack(3),
          'rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm',
        )}
      >
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-sm uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('team.invite.title', {}, { defaultValue: 'Invite a teammate' })}
        </h2>
        <form
          data-mol-id="team-invite-form"
          onSubmit={handleInvite}
          className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'flex-wrap')}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.flex1,
              cm.sp('px', 3),
              cm.sp('py', 2),
              'min-w-[280px] rounded-full border border-outline-variant bg-surface-container-lowest focus-within:ring-2 focus-within:ring-[var(--color-brand-gradient-from)]/40',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-on-surface-variant')}>mail</span>
            <input
              type="email"
              data-mol-id="team-invite-email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              aria-label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
              placeholder={t(
                'team.invite.placeholder',
                {},
                { defaultValue: 'teammate@yourcompany.com' },
              )}
              disabled={inviting}
              className={cm.cn(
                cm.flex1,
                cm.textSize('sm'),
                'bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant',
              )}
            />
          </div>
          <select
            data-mol-id="team-invite-role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
            disabled={inviting}
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface',
            )}
          >
            <option value="admin">{t('team.role.admin', {}, { defaultValue: 'Admin' })}</option>
            <option value="member">{t('status.member', {}, { defaultValue: 'Member' })}</option>
          </select>
          <button
            type="submit"
            data-mol-id="team-invite-submit"
            disabled={!inviteEmail.trim() || inviting || !workspace}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.sp('px', 5),
              cm.sp('py', 2),
              'rounded-full text-white bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] shadow-md shadow-[var(--color-brand-gradient-from)]/30 hover:opacity-90 disabled:opacity-40 transition-opacity',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>send</span>
            {inviting
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('nav.invite', {}, { defaultValue: 'Send invite' })}
          </button>
        </form>
        {inviteStatus === 'sent' ? (
          <p
            data-mol-id="team-invite-success"
            role="status"
            className={cm.cn(cm.textSize('xs'), 'text-success')}
          >
            {inviteMessage}
          </p>
        ) : null}
        {inviteStatus === 'error' ? (
          <p
            data-mol-id="team-invite-error"
            role="alert"
            className={cm.cn(cm.textSize('xs'), 'text-error')}
          >
            {inviteMessage}
          </p>
        ) : null}
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.stack(3),
          'rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm',
        )}
      >
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-sm uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('nav.members', {}, { defaultValue: 'Members' })}
          </h2>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t('team.list.count', { count: totalMembers }, { defaultValue: '{{count}} total' })}
          </span>
        </header>
        {error ? (
          <p
            data-mol-id="team-error"
            role="alert"
            className={cm.cn(cm.textSize('sm'), 'text-error')}
          >
            {error}
          </p>
        ) : loading ? (
          <ul data-mol-id="team-loading" className={cm.stack(2)}>
            {Array.from({ length: 4 }).map((_, i) => (
              <li
                key={i}
                aria-hidden="true"
                className={cm.cn('h-14 rounded-xl bg-surface-container animate-pulse')}
              />
            ))}
          </ul>
        ) : members.length === 0 ? (
          <p data-mol-id="team-empty" className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'team.empty',
              {},
              { defaultValue: 'No members yet — invite teammates above to get started.' },
            )}
          </p>
        ) : (
          <ul data-mol-id="team-members" className={cm.cn('divide-y divide-outline-variant/40')}>
            {members.map((m) => (
              <li
                key={m.id}
                data-mol-id={`team-member-${m.id}`}
                className={cm.cn(cm.flex({ align: 'center', gap: 4 }), cm.sp('py', 3))}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(11),
                    cm.h(11),
                    cm.fontWeight('bold'),
                    'rounded-full bg-gradient-to-br from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] text-white text-sm shrink-0',
                  )}
                >
                  {m.initials}
                </div>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'flex-wrap')}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        cm.textSize('sm'),
                        'text-on-surface truncate',
                      )}
                    >
                      {m.name || m.email || t('status.member', {}, { defaultValue: 'Member' })}
                    </span>
                    {m.status === 'pending' && (
                      <span
                        className={cm.cn(
                          'inline-flex items-center gap-1 rounded-full bg-warning-light ring-1 ring-amber-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-warning',
                        )}
                      >
                        {t('status.pending', {}, { defaultValue: 'Pending' })}
                      </span>
                    )}
                  </div>
                  <div className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                    {m.email}
                  </div>
                </div>
                <span
                  className={cm.cn(
                    'inline-flex items-center gap-1 rounded-full ring-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest',
                    ROLE_TINT[m.role],
                  )}
                >
                  {t(`team.role.${m.role}`, {}, { defaultValue: m.role })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatTile({
  id,
  icon,
  label,
  value,
  accent,
  tile,
}: {
  id: string
  icon: string
  label: string
  value: string
  accent: string
  tile: string
}) {
  const cm = getClassMap()
  return (
    <div
      data-mol-id={`team-stat-${id}`}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 3 }),
        cm.sp('p', 5),
        'rounded-2xl border-l-4 bg-surface-container-lowest shadow-sm hover:-translate-y-0.5 transition-transform',
        accent,
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(11),
          cm.h(11),
          'rounded-xl shrink-0',
          tile,
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-xl')}>{icon}</span>
      </div>
      <div>
        <div
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {label}
        </div>
        <div className={cm.cn('text-3xl font-extrabold tracking-tight text-on-surface')}>
          {value}
        </div>
      </div>
    </div>
  )
}
