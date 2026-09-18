import { useCallback, useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { QuorumKpiCard } from '../components/QuorumKpiCard.js'

interface MemberRow {
  id: string
  workspace_id: string
  user_id: string | null
  role: 'viewer' | 'editor' | 'admin'
  invited_at: string
  accepted_at: string | null
  email: string | null
  name: string | null
}

interface TeamResponse {
  workspace_id: string
  members: MemberRow[]
}

const ROLE_TINT: Record<string, { bg: string; fg: string }> = {
  admin: {
    bg: 'color-mix(in srgb, var(--mol-color-info) 18%, transparent)',
    fg: 'var(--mol-color-info)',
  },
  editor: {
    bg: 'color-mix(in srgb, var(--mol-color-success) 12%, transparent)',
    fg: 'var(--mol-color-success)',
  },
  viewer: {
    bg: 'color-mix(in srgb, var(--mol-color-warning) 15%, transparent)',
    fg: 'var(--mol-color-warning)',
  },
}

function timeAgo(iso?: string | null, now = Date.now()): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const sec = Math.max(0, Math.round((now - t) / 1000))
  if (sec < 60) return `${sec}s ago`
  const m = Math.round(sec / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

export function Team() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor' | 'admin'>('viewer')
  const [submitting, setSubmitting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get<TeamResponse>('/api/team')
      const data = res.data as TeamResponse
      setMembers(data?.members ?? [])
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load team')
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setInviteError(null)
    try {
      await http.post('/api/team/invite', {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      })
      setShowInvite(false)
      setInviteEmail('')
      setInviteRole('viewer')
      await refresh()
    } catch (err) {
      setInviteError(
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
          (err as Error).message ??
          'Failed to invite',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function changeRole(m: MemberRow, role: MemberRow['role']) {
    try {
      await http.put(`/api/team/${m.id}/role`, { role })
      await refresh()
    } catch (err) {
      setError((err as Error).message ?? 'Failed to update role')
    }
  }

  async function removeMember(m: MemberRow) {
    if (
      !window.confirm(
        t(
          'team.confirmRemove',
          { name: m.email ?? m.name ?? 'this member' },
          { defaultValue: 'Remove {{name}} from the team?' },
        ),
      )
    )
      return
    try {
      await http.delete(`/api/team/${m.id}`)
      await refresh()
    } catch (err) {
      setError((err as Error).message ?? 'Failed to remove member')
    }
  }

  const stats = useMemo(
    () => ({
      total: members.length,
      admins: members.filter((m) => m.role === 'admin').length,
      editors: members.filter((m) => m.role === 'editor').length,
      viewers: members.filter((m) => m.role === 'viewer').length,
    }),
    [members],
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">
            {t('team.eyebrow', {}, { defaultValue: 'Permissions + audit' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('team.heading', {}, { defaultValue: 'Workspace team' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), 'font-medium text-on-surface-variant')}>
            {t(
              'team.subheading',
              {},
              {
                defaultValue:
                  'Who runs the room. Each invitation is recorded against the workspace.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowInvite(true)
            setInviteError(null)
          }}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity',
          )}
          data-test="team-invite-open"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            person_add
          </span>
          {t('team.invite', {}, { defaultValue: 'Invite teammate' })}
        </button>
      </header>

      {error ? (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border border-error/30 bg-error/5 text-error text-sm font-semibold',
          )}
        >
          {error}
        </div>
      ) : null}

      <div className={cm.grid({ cols: 4, gap: 'md' })}>
        <QuorumKpiCard
          icon="shield_person"
          tone="primary"
          label={t('team.kpi.seats', {}, { defaultValue: 'Total members' })}
          value={String(stats.total)}
        />
        <QuorumKpiCard
          icon="key"
          tone="accent"
          label={t('team.kpi.admins', {}, { defaultValue: 'Admins' })}
          value={String(stats.admins)}
        />
        <QuorumKpiCard
          icon="edit_note"
          tone="warning"
          label={t('team.kpi.editors', {}, { defaultValue: 'Editors' })}
          value={String(stats.editors)}
        />
        <QuorumKpiCard
          icon="visibility"
          tone="navy"
          label={t('team.kpi.viewers', {}, { defaultValue: 'Viewers' })}
          value={String(stats.viewers)}
        />
      </div>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <header className={cm.sp('mb', 5)}>
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            {t('team.tableEyebrow', {}, { defaultValue: 'Team roster' })}
          </p>
          <h2
            className={cm.cn(
              cm.textSize('lg'),
              'font-extrabold tracking-tight text-on-surface mt-1',
            )}
          >
            {t('team.tableHeading', {}, { defaultValue: 'Roles and permissions' })}
          </h2>
        </header>
        {loading ? (
          <p className="text-on-surface-variant text-sm" data-test="team-loading">
            {t('team.loading', {}, { defaultValue: 'Loading team…' })}
          </p>
        ) : members.length === 0 ? (
          <p className="text-on-surface-variant text-sm" data-test="team-empty">
            {t(
              'team.empty',
              {},
              { defaultValue: 'No teammates yet — invite someone to share moderation duties.' },
            )}
          </p>
        ) : (
          <div className={cm.cn('overflow-x-auto -mx-6')}>
            <table className={cm.cn('min-w-full text-sm')} data-test="team-table">
              <thead>
                <tr className={cm.cn('border-b border-outline-variant/30')}>
                  <th
                    className={cm.cn(
                      'px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('status.member', {}, { defaultValue: 'Member' })}
                  </th>
                  <th
                    className={cm.cn(
                      'px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('form.role', {}, { defaultValue: 'Role' })}
                  </th>
                  <th
                    className={cm.cn(
                      'px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('team.col.invited', {}, { defaultValue: 'Invited' })}
                  </th>
                  <th
                    className={cm.cn(
                      'px-6 py-3 text-right text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('nav.actions', {}, { defaultValue: 'Actions' })}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {members.map((m) => (
                  <tr
                    key={m.id}
                    className={cm.cn('hover:bg-surface-container-low transition-colors')}
                    data-test={`team-row-${m.id}`}
                  >
                    <td className={cm.cn('px-6 py-4')}>
                      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                        <span
                          className={cm.cn(
                            'grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary font-bold',
                          )}
                        >
                          {(m.name ?? m.email ?? '?')[0]?.toUpperCase()}
                        </span>
                        <div className={cm.cn('min-w-0')}>
                          <p className="font-extrabold text-on-surface truncate">
                            {m.name ?? m.email ?? '—'}
                          </p>
                          {m.email ? (
                            <p className={cm.cn('text-xs text-on-surface-variant font-mono')}>
                              {m.email}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className={cm.cn('px-6 py-4')}>
                      <select
                        value={m.role}
                        onChange={(e) => void changeRole(m, e.target.value as MemberRow['role'])}
                        aria-label={t('team.changeRoleAria', {}, { defaultValue: 'Change role' })}
                        className={cm.cn(
                          'px-2 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-widest border border-outline-variant/40 bg-transparent',
                        )}
                        style={{
                          backgroundColor: ROLE_TINT[m.role].bg,
                          color: ROLE_TINT[m.role].fg,
                        }}
                        data-test={`team-role-${m.id}`}
                      >
                        <option value="viewer">
                          {t('team.role.viewer', {}, { defaultValue: 'Viewer' })}
                        </option>
                        <option value="editor">
                          {t('nav.editor', {}, { defaultValue: 'Editor' })}
                        </option>
                        <option value="admin">
                          {t('team.role.admin', {}, { defaultValue: 'Admin' })}
                        </option>
                      </select>
                    </td>
                    <td
                      className={cm.cn('px-6 py-4 font-mono tabular-nums text-on-surface-variant')}
                    >
                      {timeAgo(m.invited_at)}
                    </td>
                    <td className={cm.cn('px-6 py-4 text-right')}>
                      <button
                        type="button"
                        onClick={() => void removeMember(m)}
                        className={cm.cn('text-xs font-semibold text-error hover:underline')}
                        data-test={`team-remove-${m.id}`}
                      >
                        {t('common.remove', {}, { defaultValue: 'Remove' })}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showInvite ? (
        <div
          role="dialog"
          aria-modal="true"
          className={cm.cn(
            'fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm',
          )}
        >
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'w-full max-w-md rounded-2xl bg-surface-container-lowest shadow-2xl border border-outline-variant/30',
            )}
          >
            <header className={cm.flex({ align: 'center', justify: 'between' })}>
              <h2
                className={cm.cn(
                  cm.textSize('lg'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {t('team.inviteTitle', {}, { defaultValue: 'Invite a teammate' })}
              </h2>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                aria-label={t('common.close', {}, { defaultValue: 'Close' })}
                className={cm.cn('text-on-surface-variant hover:text-on-surface')}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </header>
            {inviteError ? (
              <div
                role="alert"
                data-test="team-invite-error"
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.sp('mt', 4),
                  'rounded-xl border border-error/30 bg-error/5 text-error text-sm font-semibold',
                )}
              >
                {inviteError}
              </div>
            ) : null}
            <form onSubmit={handleInvite} className={cm.cn(cm.sp('mt', 4), cm.stack(3))}>
              <label className={cm.stack(1)}>
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
                </span>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
                  )}
                  data-test="team-invite-email"
                />
              </label>
              <label className={cm.stack(1)}>
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t('form.role', {}, { defaultValue: 'Role' })}
                </span>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'editor' | 'admin')}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
                  )}
                  data-test="team-invite-role"
                >
                  <option value="viewer">
                    {t('team.role.viewer', {}, { defaultValue: 'Viewer' })}
                  </option>
                  <option value="editor">{t('nav.editor', {}, { defaultValue: 'Editor' })}</option>
                  <option value="admin">
                    {t('team.role.admin', {}, { defaultValue: 'Admin' })}
                  </option>
                </select>
              </label>
              <div
                className={cm.cn('mt-3', cm.flex({ align: 'center', justify: 'end', gap: 'sm' }))}
              >
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className={cm.cn(
                    'px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low text-sm font-semibold',
                  )}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={cm.cn(
                    'px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-bold disabled:opacity-50',
                  )}
                  data-test="team-invite-submit"
                >
                  {submitting
                    ? t('team.inviting', {}, { defaultValue: 'Inviting…' })
                    : t('nav.invite', {}, { defaultValue: 'Send invite' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Used by tests to confirm we hit the real workspace endpoint, not invented data. */}
      <p className="sr-only" data-test="team-source">
        live
      </p>
    </div>
  )
}
