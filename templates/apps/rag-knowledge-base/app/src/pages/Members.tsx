import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EngramMetricTile } from '../components/EngramMetricTile.js'
import { unwrapList } from '../lib/unwrap.js'

type Role = 'admin' | 'member' | 'viewer'

interface MemberRow {
  id: string
  invitee_email: string
  role: Role
  invited_at?: string | null
  joined_at?: string | null
  questions_30d?: number
}

const ROLE_HEX: Record<Role, string> = {
  admin: 'var(--color-info)',
  member: 'var(--color-success)',
  viewer: 'var(--color-on-surface-variant)',
}

const ROLE_DEFAULT: Record<Role, string> = {
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

const ROLE_OPTIONS: Role[] = ['admin', 'member', 'viewer']

function fmtRelative(iso?: string | null): string {
  if (!iso) return '\u2014'
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return `${d}d ago`
}

function initials(email: string): string {
  const parts = email.split('@')[0].split(/[._-]/)
  return parts
    .map((p) => p[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

interface InviteForm {
  email: string
  role: Role
}

export function Members() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [form, setForm] = useState<InviteForm>({ email: '', role: 'member' })
  const [submitting, setSubmitting] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const refresh = () =>
    http.get('/api/members').then((res) => {
      setMembers(unwrapList<MemberRow>(res))
    })

  useEffect(() => {
    setLoading(true)
    refresh()
      .catch(() =>
        setError(t('members.error.load', {}, { defaultValue: 'Could not load members.' })),
      )
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http]) // refresh and t are stable across renders; run once on http change

  async function submitInvite(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    if (!form.email.trim()) {
      setError(t('user.error.emailRequired', {}, { defaultValue: 'Email is required.' }))
      setSubmitting(false)
      return
    }
    try {
      await http.post('/api/members', { email: form.email.trim(), role: form.role })
      setShowInvite(false)
      setForm({ email: '', role: 'member' })
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('members.error.invite', {}, { defaultValue: 'Could not invite member.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function revokeMember(id: string) {
    setRevokingId(id)
    setError(null)
    try {
      await http.delete(`/api/members/${id}`)
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('members.error.revoke', {}, { defaultValue: 'Could not revoke member.' }),
      )
    } finally {
      setRevokingId(null)
    }
  }

  const counts = useMemo(() => {
    let active = 0
    let invited = 0
    let admins = 0
    let queries = 0
    for (const m of members) {
      if (m.joined_at) active += 1
      else invited += 1
      if (m.role === 'admin') admins += 1
      queries += m.questions_30d ?? 0
    }
    return { active, invited, admins, queries }
  }, [members])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-primary font-bold')}
          style={{ fontSize: 10 }}
        >
          {t('nav.team', {}, { defaultValue: 'Team' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('nav.members', {}, { defaultValue: 'Members' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('members.subheading', {}, { defaultValue: 'Invite teammates and set roles.' })}
        </p>
        {error ? (
          <p
            data-testid="members-error"
            className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
          >
            {error}
          </p>
        ) : null}
      </header>

      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 sm:grid-cols-4')}>
        <EngramMetricTile
          label={t('status.active', {}, { defaultValue: 'Active' })}
          value={counts.active.toLocaleString()}
          icon="group"
          tone="success"
        />
        <EngramMetricTile
          label={t('members.metric.invited', {}, { defaultValue: 'Pending invites' })}
          value={counts.invited.toLocaleString()}
          icon="forward_to_inbox"
          tone="info"
        />
        <EngramMetricTile
          label={t('members.metric.admins', {}, { defaultValue: 'Admins' })}
          value={counts.admins.toLocaleString()}
          icon="shield"
          tone="primary"
        />
        <EngramMetricTile
          label={t('members.metric.queries', {}, { defaultValue: 'Queries / 30d' })}
          value={counts.queries.toLocaleString()}
          icon="forum"
          tone="cited"
        />
      </section>

      <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' })}>
        <h2 className={cm.cn(cm.textSize('xl'), 'font-bold')}>
          {t('members.tableHeading', { count: members.length }, { defaultValue: 'Roster' })}
        </h2>
        <button
          type="button"
          onClick={() => {
            setShowInvite(true)
            setError(null)
          }}
          data-testid="members-invite-button"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity inline-flex items-center gap-1 shadow-md shadow-primary/20',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontSize: 18 }}
            aria-hidden="true"
          >
            person_add
          </span>
          {t('members.invite', {}, { defaultValue: 'Invite member' })}
        </button>
      </div>

      {showInvite ? (
        <form
          onSubmit={submitInvite}
          data-testid="members-invite-form"
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', gap: 'sm' }),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-md',
          )}
        >
          <h3 className={cm.cn(cm.textSize('lg'), 'font-bold')}>
            {t('members.invite.heading', {}, { defaultValue: 'Invite a teammate' })}
          </h3>
          <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest font-bold text-on-surface-variant',
              )}
              style={{ fontSize: 10 }}
            >
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            </span>
            <input
              data-testid="members-invite-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="teammate@example.com"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant bg-surface text-on-surface',
              )}
            />
          </label>
          <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest font-bold text-on-surface-variant',
              )}
              style={{ fontSize: 10 }}
            >
              {t('form.role', {}, { defaultValue: 'Role' })}
            </span>
            <select
              data-testid="members-invite-role"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant bg-surface text-on-surface',
              )}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {t(`members.role.${r}`, {}, { defaultValue: ROLE_DEFAULT[r] })}
                </option>
              ))}
            </select>
          </label>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <button
              type="submit"
              disabled={submitting}
              data-testid="members-invite-submit"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-full bg-primary text-on-primary disabled:opacity-50 hover:opacity-90 transition-opacity',
              )}
            >
              {submitting
                ? t('members.invite.submitting', {}, { defaultValue: 'Sending\u2026' })
                : t('nav.invite', {}, { defaultValue: 'Send invite' })}
            </button>
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      ) : null}

      <div
        className={cm.cn(
          'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm overflow-hidden',
        )}
      >
        <table className={cm.cn('w-full text-left')}>
          <thead className={cm.cn('bg-surface-container')}>
            <tr>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('status.member', {}, { defaultValue: 'Member' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.role', {}, { defaultValue: 'Role' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right',
                )}
              >
                {t('members.col.invited', {}, { defaultValue: 'Invited' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right',
                )}
              >
                {t('nav.actions', {}, { defaultValue: 'Actions' })}
              </th>
            </tr>
          </thead>
          <tbody data-testid="members-list" className={cm.cn('divide-y divide-surface-container')}>
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 8),
                    cm.textCenter,
                    'text-on-surface-variant',
                  )}
                >
                  {t('members.loading', {}, { defaultValue: 'Loading members\u2026' })}
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td
                  data-testid="members-empty"
                  colSpan={4}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 8),
                    cm.textCenter,
                    'text-on-surface-variant',
                  )}
                >
                  {t(
                    'members.empty',
                    {},
                    {
                      defaultValue: 'No teammates yet. Click \u201cInvite member\u201d to add one.',
                    },
                  )}
                </td>
              </tr>
            ) : (
              members.map((m) => {
                const roleColor = ROLE_HEX[m.role] ?? 'var(--color-on-surface-variant)'
                const status: 'active' | 'invited' = m.joined_at ? 'active' : 'invited'
                return (
                  <tr
                    key={m.id}
                    className={cm.cn('hover:bg-surface-container-low transition-colors')}
                  >
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                        <span
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'center' }),
                            cm.w(8),
                            cm.h(8),
                            'rounded-full font-bold text-on-surface shrink-0 text-xs',
                          )}
                          style={{ background: roleColor }}
                        >
                          {initials(m.invitee_email)}
                        </span>
                        <div className={cm.flex({ direction: 'col' })}>
                          <span
                            className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface')}
                          >
                            {m.invitee_email}
                          </span>
                          {status === 'invited' ? (
                            <span
                              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')}
                            >
                              {t('members.invited', {}, { defaultValue: 'Pending acceptance' })}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          'rounded-full font-bold uppercase tracking-widest',
                        )}
                        style={{
                          background: `color-mix(in srgb, ${roleColor} 15%, transparent)`,
                          color: roleColor,
                          fontSize: 10,
                        }}
                      >
                        {t(`members.role.${m.role}`, {}, { defaultValue: ROLE_DEFAULT[m.role] })}
                      </span>
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'text-right tabular-nums text-on-surface-variant',
                      )}
                    >
                      {fmtRelative(m.invited_at)}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'text-right',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => revokeMember(m.id)}
                        disabled={revokingId === m.id}
                        data-testid={`members-revoke-${m.id}`}
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          'rounded-full text-error border border-error/40 hover:bg-error/10 transition-colors disabled:opacity-50',
                        )}
                      >
                        {revokingId === m.id
                          ? t('members.revoke.loading', {}, { defaultValue: 'Removing\u2026' })
                          : t('common.remove', {}, { defaultValue: 'Remove' })}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
