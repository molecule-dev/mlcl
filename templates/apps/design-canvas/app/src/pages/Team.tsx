import { useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DesignCanvasLayout } from '../components/DesignCanvasLayout.js'

interface Member {
  id: string
  name: string
  email: string | null
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  avatarColor: string
  joined: string
  online?: boolean
  projectsShared?: number
}

interface PendingInvite {
  id: string
  email: string
  invitedBy: string
  role: string
  invitedAt: string | null
}

interface TeamResponse {
  members: Member[]
  pending: PendingInvite[]
  stats: {
    members: number
    pending: number
    online: number
    seatsRemaining: number
    byRole: { owner: number; admin: number; editor: number; viewer: number }
  }
}

const ROLE_TINTS: Record<Member['role'], { bg: string; label: string }> = {
  owner: { bg: 'bg-primary text-white', label: 'Owner' },
  admin: { bg: 'bg-secondary text-white', label: 'Admin' },
  editor: { bg: 'bg-tertiary/15 text-tertiary', label: 'Editor' },
  viewer: { bg: 'bg-surface-container text-on-surface-variant', label: 'Viewer' },
}

const PERMISSIONS = [
  {
    key: 'viewFiles',
    capability: 'View files',
    owner: true,
    admin: true,
    editor: true,
    viewer: true,
  },
  { key: 'comment', capability: 'Comment', owner: true, admin: true, editor: true, viewer: true },
  {
    key: 'editSave',
    capability: 'Edit & save',
    owner: true,
    admin: true,
    editor: true,
    viewer: false,
  },
  {
    key: 'publishLibrary',
    capability: 'Publish library',
    owner: true,
    admin: true,
    editor: false,
    viewer: false,
  },
  {
    key: 'manageBilling',
    capability: 'Manage billing',
    owner: true,
    admin: true,
    editor: false,
    viewer: false,
  },
  {
    key: 'inviteMembers',
    capability: 'Invite members',
    owner: true,
    admin: true,
    editor: false,
    viewer: false,
  },
  {
    key: 'deleteWorkspace',
    capability: 'Delete workspace',
    owner: true,
    admin: false,
    editor: false,
    viewer: false,
  },
]

export function Team() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [filter, setFilter] = useState<'all' | Member['role']>('all')
  const [data, setData] = useState<TeamResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer' | 'admin'>('editor')
  const [inviting, setInviting] = useState(false)
  const [inviteStatus, setInviteStatus] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    http
      .get('/api/team')
      .then((resp) => {
        const payload = ((resp as { data?: unknown }).data ?? null) as TeamResponse | null
        setData(payload)
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteStatus(null)
    try {
      await http.post('/api/team/invite', { email: inviteEmail.trim(), role: inviteRole })
      setInviteStatus(t('team.inviteSent', {}, { defaultValue: 'Invite sent' })!)
      setInviteEmail('')
      void track({
        name: 'team.invited',
        properties: { role: inviteRole },
      })
      load()
    } catch (err) {
      setInviteStatus(
        ((err as { message?: string }).message ?? null) ||
          t('team.inviteFailed', {}, { defaultValue: 'Could not send invite' })!,
      )
    } finally {
      setInviting(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- members derives from data?.members ?? [] which creates a new array each render; stabilizing it with a nested useMemo would duplicate the fallback logic
  const members = data?.members ?? []
  const pending = data?.pending ?? []
  const stats = data?.stats ?? {
    members: 0,
    pending: 0,
    online: 0,
    seatsRemaining: 10,
    byRole: { owner: 0, admin: 0, editor: 0, viewer: 0 },
  }

  const filtered = useMemo(
    () => (filter === 'all' ? members : members.filter((m) => m.role === filter)),
    [filter, members],
  )

  return (
    <DesignCanvasLayout
      eyebrow={t('team.eyebrow', {}, { defaultValue: 'Workspace · Team' })}
      title={t('nav.team', {}, { defaultValue: 'Team' })}
      actions={
        <button
          onClick={() => setShowInvite((v) => !v)}
          type="button"
          data-mol-id="team-invite-toggle"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.flex({ align: 'center', gap: 'xs' }),
            'bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-md shadow-primary/30 hover:scale-[1.02] transition-transform',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>person_add</span>
          {t('team.inviteCta', {}, { defaultValue: 'Invite members' })}
        </button>
      }
    >
      <div className={cm.cn(cm.stack(8))}>
        {showInvite && (
          <form
            onSubmit={submitInvite}
            data-mol-id="team-invite-form"
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
            )}
          >
            <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('team.inviteTitle', {}, { defaultValue: 'Invite a teammate' })}
            </h3>
            <div className={cm.cn(cm.flex({ gap: 'sm', align: 'end' }), 'flex-wrap')}>
              <label className={cm.cn(cm.stack(1), cm.flex1)}>
                <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                  {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                </span>
                <input
                  type="email"
                  required
                  data-mol-id="team-invite-email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={t(
                    'team.invite.emailPlaceholder',
                    {},
                    { defaultValue: 'teammate@studio.com' },
                  )!}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-lg border border-outline-variant/40 bg-surface w-full',
                  )}
                />
              </label>
              <label className={cm.cn(cm.stack(1))}>
                <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                  {t('form.role', {}, { defaultValue: 'Role' })}
                </span>
                <select
                  data-mol-id="team-invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer' | 'admin')}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-lg border border-outline-variant/40 bg-surface',
                  )}
                >
                  <option value="editor">
                    {t('team.role.editor', {}, { defaultValue: 'Editor' })}
                  </option>
                  <option value="viewer">
                    {t('team.role.viewer', {}, { defaultValue: 'Viewer' })}
                  </option>
                  <option value="admin">
                    {t('team.role.admin', {}, { defaultValue: 'Admin' })}
                  </option>
                </select>
              </label>
              <button
                type="submit"
                disabled={inviting}
                data-mol-id="team-invite-submit"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  'rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-60',
                )}
              >
                {inviting
                  ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                  : t('nav.invite', {}, { defaultValue: 'Send invite' })}
              </button>
            </div>
            {inviteStatus && (
              <p
                data-mol-id="team-invite-status"
                className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
              >
                {inviteStatus}
              </p>
            )}
          </form>
        )}

        <div className={cm.cn(cm.grid({ cols: 4, gap: 'lg' }))} data-mol-id="team-stats">
          {[
            {
              key: 'members',
              label: 'Members',
              value: stats.members,
              icon: 'group',
              accent: '#7c3aed',
            },
            {
              key: 'online',
              label: 'Online now',
              value: stats.online,
              icon: 'fiber_manual_record',
              accent: '#10b981',
            },
            {
              key: 'pending',
              label: 'Pending invites',
              value: stats.pending,
              icon: 'mark_email_unread',
              accent: '#ec4899',
            },
            {
              key: 'seats',
              label: 'Seats remaining',
              value: stats.seatsRemaining,
              icon: 'event_seat',
              accent: '#06b6d4',
            },
          ].map((s) => (
            <article
              key={s.key}
              data-mol-id={`team-stat-${s.key}`}
              className={cm.cn(
                cm.sp('p', 5),
                cm.stack(2),
                'bg-surface-container-lowest rounded-2xl shadow-sm border-l-4 hover:-translate-y-0.5 transition-transform',
              )}
              style={{ borderLeftColor: s.accent }}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[16px]')}
                  style={{ color: s.accent }}
                >
                  {s.icon}
                </span>
                {t(`team.stat.${s.key}`, {}, { defaultValue: s.label })}
              </span>
              <span className={cm.cn('text-4xl font-extrabold tracking-tighter text-on-surface')}>
                {s.value}
              </span>
            </article>
          ))}
        </div>

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          {(['all', 'owner', 'admin', 'editor', 'viewer'] as const).map((r) => {
            const active = r === filter
            return (
              <button
                key={r}
                type="button"
                onClick={() => setFilter(r)}
                data-mol-id={`team-filter-${r}`}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  active
                    ? 'bg-primary text-white rounded-xl shadow-sm shadow-primary/30'
                    : 'bg-surface-container-lowest text-on-surface-variant rounded-xl border border-outline-variant/30 hover:bg-surface-container transition-colors',
                )}
              >
                {t(`team.filter.${r}`, {}, { defaultValue: r === 'all' ? 'All' : r })}
              </button>
            )
          })}
        </div>

        <article
          data-mol-id="team-members-table"
          className={cm.cn(
            'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden',
          )}
        >
          <header
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 5),
              cm.sp('py', 3),
              'bg-surface-container-low border-b border-outline-variant/30',
            )}
          >
            {[
              { label: 'Member', flex: 'flex-[3]' },
              { label: 'Role', flex: 'flex-[1.5]' },
              { label: 'Projects', flex: 'flex-[1.5]' },
              { label: 'Joined', flex: 'flex-[1.5]' },
            ].map((col) => (
              <span
                key={col.label}
                className={cm.cn(
                  col.flex,
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t(`team.col.${col.label}`, {}, { defaultValue: col.label })}
              </span>
            ))}
          </header>
          <ul className={cm.cn('divide-y divide-outline-variant/20')}>
            {loading ? (
              <li className={cm.cn(cm.sp('px', 5), cm.sp('py', 4), cm.textSize('sm'))}>
                {t('team.loading', {}, { defaultValue: 'Loading team…' })}
              </li>
            ) : filtered.length === 0 ? (
              <li
                data-mol-id="team-members-empty"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 6),
                  cm.textCenter,
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                )}
              >
                {t('team.empty', {}, { defaultValue: 'No teammates yet — invite someone above.' })}
              </li>
            ) : (
              filtered.map((m) => (
                <li
                  key={m.id}
                  data-mol-id={`team-member-${m.id}`}
                  className={cm.cn(cm.flex({ align: 'center' }), cm.sp('px', 5), cm.sp('py', 4))}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-[3]')}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.w(10),
                        cm.h(10),
                        cm.roundedFull,
                        cm.fontWeight('bold'),
                        'shrink-0 text-white text-sm relative',
                      )}
                      style={{ backgroundColor: m.avatarColor }}
                    >
                      {(m.name || '?').charAt(0).toUpperCase()}
                      {m.online && (
                        <span
                          className={cm.cn(
                            'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-tertiary border-2 border-surface-container-lowest',
                          )}
                        ></span>
                      )}
                    </span>
                    <div className={cm.stack(0)}>
                      <span
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          cm.textSize('sm'),
                          'text-on-surface',
                        )}
                      >
                        {m.name}
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {m.email ?? '—'}
                      </span>
                    </div>
                  </div>
                  <div className={cm.cn('flex-[1.5]')}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest rounded-full inline-block',
                        ROLE_TINTS[m.role].bg,
                      )}
                    >
                      {t(`team.role.${m.role}`, {}, { defaultValue: ROLE_TINTS[m.role].label })}
                    </span>
                  </div>
                  <span
                    className={cm.cn(
                      'flex-[1.5]',
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'text-on-surface-variant',
                    )}
                  >
                    {m.projectsShared ?? 0}
                  </span>
                  <span
                    className={cm.cn(
                      'flex-[1.5]',
                      cm.fontWeight('semibold'),
                      cm.textSize('xs'),
                      'text-on-surface-variant',
                    )}
                  >
                    {m.joined}
                  </span>
                </li>
              ))
            )}
          </ul>
        </article>

        <article
          data-mol-id="team-pending-invites"
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(4),
            'bg-surface-container-lowest rounded-2xl border border-outline-variant/30',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <h3
              className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t('team.pending.title', {}, { defaultValue: 'Pending invitations' })}
            </h3>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(
                'team.pending.count',
                { count: pending.length },
                { defaultValue: '{{count}} sent' },
              )}
            </span>
          </div>
          {pending.length === 0 ? (
            <p
              data-mol-id="team-pending-empty"
              className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
            >
              {t('team.pending.empty', {}, { defaultValue: 'No invites awaiting acceptance.' })}
            </p>
          ) : (
            <ul className={cm.cn('divide-y divide-outline-variant/20')}>
              {pending.map((p) => (
                <li
                  key={p.id}
                  data-mol-id={`team-pending-${p.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('py', 3),
                  )}
                >
                  <div className={cm.stack(0)}>
                    <span
                      className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-on-surface')}
                    >
                      {p.email}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {p.invitedBy} ·{' '}
                      {p.invitedAt ? new Date(p.invitedAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest rounded-full bg-tertiary/15 text-tertiary',
                    )}
                  >
                    {t(`team.role.${p.role}`, {}, { defaultValue: p.role })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article
          className={cm.cn(
            'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden',
          )}
        >
          <header
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 5),
              cm.sp('py', 3),
              'bg-surface-container-low border-b border-outline-variant/30',
            )}
          >
            <span
              className={cm.cn(
                'flex-[3]',
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('team.permissions.title', {}, { defaultValue: 'Permission matrix' })}
            </span>
            {(['owner', 'admin', 'editor', 'viewer'] as const).map((r) => (
              <span
                key={r}
                className={cm.cn(
                  'flex-1 text-center',
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t(`team.role.${r}`, {}, { defaultValue: r })}
              </span>
            ))}
          </header>
          <ul className={cm.cn('divide-y divide-outline-variant/20')}>
            {PERMISSIONS.map((row) => (
              <li
                key={row.capability}
                className={cm.cn(cm.flex({ align: 'center' }), cm.sp('px', 5), cm.sp('py', 3))}
              >
                <span
                  className={cm.cn(
                    'flex-[3]',
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'text-on-surface',
                  )}
                >
                  {t(`team.permission.${row.key}`, {}, { defaultValue: row.capability })}
                </span>
                {(['owner', 'admin', 'editor', 'viewer'] as const).map((r) => (
                  <span key={r} className={cm.cn('flex-1 text-center')}>
                    <span
                      className={cm.cn(
                        'material-symbols-outlined text-[18px]',
                        row[r] ? 'text-tertiary' : 'text-on-surface-variant/30',
                      )}
                      style={{ fontVariationSettings: row[r] ? "'FILL' 1" : undefined }}
                    >
                      {row[r] ? 'check_circle' : 'remove_circle'}
                    </span>
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </DesignCanvasLayout>
  )
}

export default Team
