import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WhiteboardLayout } from '../components/WhiteboardLayout.js'

interface UserProfile {
  id: string
  email?: string
  name?: string
  username?: string
}

interface BoardRow {
  id: string
  title?: string
  updated_at?: string
}

interface CollaboratorRow {
  id: string
  board_id: string
  user_id?: string | null
  email?: string | null
  role?: string
  status?: string
  created_at?: string
}

const ACCENTS = ['#5b5bf7', '#00c4a8', '#a855f7', '#f97316', '#ec4899', '#84cc16', '#06b6d4']

function accentForId(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return ACCENTS[h % ACCENTS.length]!
}

const ROLE_FILTERS: Array<'all' | 'editor' | 'commenter' | 'viewer'> = [
  'all',
  'editor',
  'commenter',
  'viewer',
]

const ROLE_BADGE: Record<string, string> = {
  editor: 'bg-secondary/20 text-on-surface',
  commenter: 'bg-warning-light text-warning',
  viewer: 'bg-border text-foreground',
}

interface AggregatedMember {
  key: string
  identifier: string
  userId?: string | null
  email?: string | null
  role: string
  status: string
  boardCount: number
  joined?: string
}

export function Workspace() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserProfile>()
  const [boards, setBoards] = useState<BoardRow[]>([])
  const [collaboratorsByBoard, setCollaboratorsByBoard] = useState<
    Record<string, CollaboratorRow[]>
  >({})
  const [filter, setFilter] = useState<(typeof ROLE_FILTERS)[number]>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteBoardId, setInviteBoardId] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'commenter' | 'viewer'>('editor')
  const [inviting, setInviting] = useState(false)
  const [inviteStatus, setInviteStatus] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await http.get<BoardRow[]>('/api/boards')
      const list = Array.isArray(res.data) ? res.data : []
      setBoards(list)
      if (!inviteBoardId && list[0]?.id) setInviteBoardId(list[0].id)
      const map: Record<string, CollaboratorRow[]> = {}
      await Promise.all(
        list.map(async (b) => {
          try {
            const cr = await http.get<CollaboratorRow[]>(`/api/collaborators/${b.id}`)
            map[b.id] = Array.isArray(cr.data) ? cr.data : []
          } catch (_error) {
            // best-effort: a failed collab fetch defaults to an empty list for this board
            map[b.id] = []
          }
        }),
      )
      setCollaboratorsByBoard(map)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [http, inviteBoardId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleInvite = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!inviteBoardId || !inviteEmail.trim()) return
      setInviting(true)
      setInviteStatus(null)
      try {
        await http.post(`/api/collaborators/${inviteBoardId}`, {
          email: inviteEmail.trim(),
          role: inviteRole,
        })
        setInviteStatus(t('workspace.inviteSent', {}, { defaultValue: 'Invitation sent.' })!)
        setInviteEmail('')
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setInviting(false)
      }
    },
    [http, inviteBoardId, inviteEmail, inviteRole, refresh, t],
  )

  const aggregated = useMemo<AggregatedMember[]>(() => {
    const buckets = new Map<string, AggregatedMember>()
    for (const list of Object.values(collaboratorsByBoard)) {
      for (const c of list) {
        const key = c.user_id ?? c.email ?? c.id
        const existing = buckets.get(key)
        if (existing) {
          existing.boardCount += 1
          continue
        }
        buckets.set(key, {
          key,
          identifier: c.email ?? c.user_id ?? c.id,
          userId: c.user_id ?? null,
          email: c.email ?? null,
          role: c.role ?? 'viewer',
          status: c.status ?? 'pending',
          boardCount: 1,
          joined: c.created_at,
        })
      }
    }
    return Array.from(buckets.values())
  }, [collaboratorsByBoard])

  const visible = filter === 'all' ? aggregated : aggregated.filter((m) => m.role === filter)

  const totalBoards = boards.length
  const totalCollaborators = aggregated.length
  const acceptedCount = aggregated.filter(
    (m) => m.status === 'accepted' || m.status === 'active',
  ).length
  const pendingCount = aggregated.filter((m) => m.status === 'pending').length

  return (
    <WhiteboardLayout
      eyebrow={t(
        'workspace.eyebrow',
        { name: user?.name || user?.email || 'You' },
        { defaultValue: '{{name}} · workspace' },
      )}
      title={t('workspace.title', {}, { defaultValue: 'Members & roles' })}
      actions={
        <button
          type="button"
          data-mol-id="workspace-invite-toggle"
          onClick={() => setShowInvite((s) => !s)}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.flex({ align: 'center', gap: 'xs' }),
            'bg-gradient-to-br from-primary to-primary-hover text-white rounded-xl shadow-md shadow-primary/30',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>person_add</span>
          {t('workspace.invite', {}, { defaultValue: 'Invite collaborators' })}
        </button>
      }
    >
      <div className={cm.stack(6)}>
        {error && (
          <div
            role="alert"
            data-mol-id="workspace-error"
            className={cm.cn(
              cm.sp('p', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl bg-error-container/40 text-on-error-container',
            )}
          >
            {error}
          </div>
        )}

        {showInvite && (
          <form
            onSubmit={handleInvite}
            data-mol-id="workspace-invite-form"
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(3),
              'bg-surface-container-lowest rounded-2xl border border-outline-variant/30',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
              <label className={cm.cn(cm.stack(1), cm.flex1)}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('workspace.boardLabel', {}, { defaultValue: 'Board' })}
                </span>
                <select
                  required
                  data-mol-id="workspace-invite-board"
                  value={inviteBoardId}
                  onChange={(e) => setInviteBoardId(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'rounded-xl border border-outline-variant/40 bg-surface-container-low',
                  )}
                >
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title || 'Untitled Board'}
                    </option>
                  ))}
                </select>
              </label>
              <label className={cm.cn(cm.stack(1), cm.flex1)}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                </span>
                <input
                  required
                  type="email"
                  data-mol-id="workspace-invite-email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'rounded-xl border border-outline-variant/40 bg-surface-container-low',
                  )}
                />
              </label>
              <label className={cm.cn(cm.stack(1))}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.role', {}, { defaultValue: 'Role' })}
                </span>
                <select
                  data-mol-id="workspace-invite-role"
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as 'editor' | 'commenter' | 'viewer')
                  }
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'rounded-xl border border-outline-variant/40 bg-surface-container-low',
                  )}
                >
                  <option value="editor">
                    {t('workspace.role.editor', {}, { defaultValue: 'Editor' })}
                  </option>
                  <option value="commenter">
                    {t('workspace.role.commenter', {}, { defaultValue: 'Commenter' })}
                  </option>
                  <option value="viewer">
                    {t('workspace.role.viewer', {}, { defaultValue: 'Viewer' })}
                  </option>
                </select>
              </label>
              <button
                type="submit"
                disabled={inviting || boards.length === 0}
                data-mol-id="workspace-invite-submit"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  'self-end bg-primary text-white rounded-xl disabled:opacity-60',
                )}
              >
                {inviting
                  ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                  : t('nav.invite', {}, { defaultValue: 'Send invite' })}
              </button>
            </div>
            {inviteStatus && (
              <p
                data-mol-id="workspace-invite-status"
                className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'text-success')}
              >
                {inviteStatus}
              </p>
            )}
          </form>
        )}

        <div data-mol-id="workspace-kpis" className={cm.cn(cm.grid({ cols: 4, gap: 'lg' }))}>
          {[
            {
              icon: 'space_dashboard',
              label: 'totalBoards',
              fallback: 'Boards owned',
              value: totalBoards,
              accent: 'border-primary',
            },
            {
              icon: 'group',
              label: 'totalCollaborators',
              fallback: 'Collaborators',
              value: totalCollaborators,
              accent: 'border-emerald-500',
            },
            {
              icon: 'check_circle',
              label: 'accepted',
              fallback: 'Accepted',
              value: acceptedCount,
              accent: 'border-secondary',
            },
            {
              icon: 'mark_email_unread',
              label: 'pending',
              fallback: 'Pending',
              value: pendingCount,
              accent: 'border-amber-500',
            },
          ].map((kpi) => (
            <article
              key={kpi.label}
              data-mol-id={`workspace-kpi-${kpi.label}`}
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(2),
                'bg-surface-container-lowest rounded-2xl border-l-4 shadow-sm hover:-translate-y-0.5 transition-transform',
                kpi.accent,
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    'bg-primary-fixed/40 text-primary-dark',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-[18px]')}>{kpi.icon}</span>
                </span>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(`workspace.kpi.${kpi.label}`, {}, { defaultValue: kpi.fallback })}
                </span>
              </div>
              <p
                className={cm.cn(
                  cm.textSize('4xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {kpi.value}
              </p>
            </article>
          ))}
        </div>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
          )}
        >
          <header
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 5))}
          >
            <h2
              className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t('workspace.membersTitle', {}, { defaultValue: 'Team members' })}
            </h2>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              {ROLE_FILTERS.map((role) => (
                <button
                  key={role}
                  type="button"
                  data-mol-id={`workspace-filter-${role}`}
                  onClick={() => setFilter(role)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'uppercase tracking-widest rounded-full transition-colors',
                    filter === role
                      ? 'bg-on-surface text-surface'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                  )}
                >
                  {t(
                    `workspace.role.${role}`,
                    {},
                    {
                      defaultValue:
                        role === 'all'
                          ? 'All'
                          : role === 'editor'
                            ? 'Editor'
                            : role === 'commenter'
                              ? 'Commenter'
                              : 'Viewer',
                    },
                  )}
                </button>
              ))}
            </div>
          </header>

          {!loading && visible.length === 0 ? (
            <div
              data-mol-id="workspace-empty"
              className={cm.cn(
                cm.sp('p', 8),
                cm.textCenter,
                'rounded-xl border border-dashed border-outline-variant/40 text-on-surface-variant',
              )}
            >
              {t(
                'workspace.empty',
                {},
                { defaultValue: 'No collaborators yet — invite someone to your boards.' },
              )}
            </div>
          ) : (
            <table
              data-mol-id="workspace-members"
              className={cm.cn(cm.w('full'), 'border-collapse')}
            >
              <thead>
                <tr className={cm.cn('border-b border-outline-variant/30')}>
                  {[
                    { key: 'name', label: 'Member' },
                    { key: 'role', label: 'Role' },
                    { key: 'status', label: 'Status' },
                    { key: 'boardCount', label: 'Boards' },
                  ].map((h) => (
                    <th
                      key={h.key}
                      className={cm.cn(
                        cm.sp('py', 3),
                        cm.sp('px', 3),
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-on-surface-variant text-left',
                      )}
                    >
                      {t(`workspace.col.${h.key}`, {}, { defaultValue: h.label })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={cm.cn('divide-y divide-outline-variant/20')}>
                {visible.map((m) => {
                  const accent = accentForId(m.identifier)
                  return (
                    <tr
                      key={m.key}
                      data-mol-id={`workspace-member-${m.key}`}
                      className={cm.cn('hover:bg-surface-container-low transition-colors')}
                    >
                      <td className={cm.cn(cm.sp('py', 4), cm.sp('px', 3))}>
                        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                          <span
                            className={cm.cn(
                              cm.flex({ align: 'center', justify: 'center' }),
                              cm.w(9),
                              cm.h(9),
                              cm.roundedFull,
                              cm.fontWeight('bold'),
                              'text-white text-sm',
                            )}
                            style={{ backgroundColor: accent }}
                          >
                            {(m.identifier ?? '?').charAt(0).toUpperCase()}
                          </span>
                          <span
                            className={cm.cn(
                              cm.textSize('sm'),
                              cm.fontWeight('semibold'),
                              'text-on-surface',
                            )}
                          >
                            {m.identifier}
                          </span>
                        </div>
                      </td>
                      <td className={cm.cn(cm.sp('py', 4), cm.sp('px', 3))}>
                        <span
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 1),
                            cm.fontWeight('bold'),
                            'text-[10px] uppercase tracking-widest rounded-full',
                            ROLE_BADGE[m.role] ?? 'bg-border text-foreground',
                          )}
                        >
                          {m.role}
                        </span>
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('py', 4),
                          cm.sp('px', 3),
                          cm.textSize('sm'),
                          cm.fontWeight('medium'),
                          'text-on-surface-variant capitalize',
                        )}
                      >
                        {m.status}
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('py', 4),
                          cm.sp('px', 3),
                          cm.textSize('sm'),
                          'text-on-surface-variant',
                        )}
                      >
                        {m.boardCount}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </WhiteboardLayout>
  )
}

export default Workspace
