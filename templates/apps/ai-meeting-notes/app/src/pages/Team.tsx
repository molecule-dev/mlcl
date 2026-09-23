import { useCallback, useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface TeamMember {
  id: string
  name: string
  email: string
  initial: string
  role: 'Owner' | 'Admin' | 'Member' | 'Guest'
  speaker_color: 1 | 2 | 3 | 4 | 5
  last_active: string
  joined_at: string
  pending: boolean
}

const SPEAKER_BG: Record<TeamMember['speaker_color'], string> = {
  1: 'var(--color-speaker-1)',
  2: 'var(--color-speaker-2)',
  3: 'var(--color-speaker-3)',
  4: 'var(--color-speaker-4)',
  5: 'var(--color-speaker-5)',
}

const ROLE_COLOR: Record<TeamMember['role'], string> = {
  Owner: 'bg-secondary/15 text-secondary',
  Admin: 'bg-primary/15 text-primary',
  Member: 'bg-surface-container',
  Guest: 'bg-surface-container line-through',
}

function fmtRelative(iso: string, t: ReturnType<typeof useTranslation>['t']): string {
  const d = new Date(iso)
  const diffH = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60))
  if (diffH < 1) return t('common.justNow', {}, { defaultValue: 'just now' })
  if (diffH < 24) return t('common.hoursAgo', { count: diffH }, { defaultValue: '{{count}}h ago' })
  return t('common.daysAgo', { count: Math.floor(diffH / 24) }, { defaultValue: '{{count}}d ago' })
}

export function Team() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'Member' | 'Admin'>('Member')
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [inviteError, setInviteError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/team')
      .then((res) => {
        if (!cancelled) setMembers(unwrapList<TeamMember>(res))
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

  useEffect(() => {
    return refresh()
  }, [refresh])

  const submitInvite = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!inviteEmail.trim()) return
    setInviteStatus('submitting')
    setInviteError(null)
    try {
      const res = await http.post('/api/team', {
        email: inviteEmail.trim(),
        role: inviteRole.toLowerCase(),
      })
      // Surface backend error if API returned 4xx with an error payload.
      const single = unwrapSingle<{ id?: string; error?: string }>(res)
      if (!single?.id && single?.error) {
        throw new Error(single.error)
      }
      setInviteOpen(false)
      setInviteEmail('')
      setInviteRole('Member')
      setInviteStatus('idle')
      track({ name: 'team.invite_sent', properties: { role: inviteRole.toLowerCase() } })
      refresh()
    } catch (err) {
      setInviteStatus('error')
      setInviteError(
        err instanceof Error
          ? err.message
          : t('team.inviteFailed', {}, { defaultValue: 'Could not send invitation.' }),
      )
    }
  }

  const cancelInvite = async (id: string) => {
    try {
      // Await the server delete BEFORE dropping the row locally, so the UI
      // only reports the member gone once the backend has actually removed
      // it (otherwise an out-of-band read can still observe the stale row).
      await http.delete(`/api/team/${id}`)
      setMembers((prev) => prev.filter((m) => m.id !== id))
    } catch (_error) {
      // delete failed — reload authoritative list from server
      refresh()
    }
  }

  const removeMember = async (id: string) => {
    if (id.startsWith('self:')) return
    try {
      // Await the server delete BEFORE dropping the row locally, so the UI
      // only reports the member gone once the backend has actually removed
      // it (otherwise an out-of-band read can still observe the stale row).
      await http.delete(`/api/team/${id}`)
      setMembers((prev) => prev.filter((m) => m.id !== id))
    } catch (_error) {
      // delete failed — reload authoritative list from server
      refresh()
    }
  }

  const active = members.filter((m) => !m.pending)
  const pending = members.filter((m) => m.pending)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('nav.team', {}, { defaultValue: 'Team' })}
        </h1>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          {t('team.inviteCta', {}, { defaultValue: 'Invite teammate' })}
        </button>
      </header>

      {inviteOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-title"
          className={cm.cn(
            'fixed inset-0 z-50 grid place-items-center',
            cm.sp('p', 4),
            'bg-foreground/40',
          )}
        >
          <form
            onSubmit={submitInvite}
            className={cm.cn(cm.card(), cm.sp('p', 6), 'w-full max-w-md space-y-4')}
          >
            <div>
              <h2 id="invite-title" className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('team.inviteTitle', {}, { defaultValue: 'Invite a teammate' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                {t(
                  'team.inviteSubtitle',
                  {},
                  { defaultValue: 'They will receive an email with a join link.' },
                )}
              </p>
            </div>
            <label className={cm.cn(cm.stack(1))}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
              </span>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t(
                  'team.invitePlaceholder',
                  {},
                  { defaultValue: 'teammate@company.com' },
                )}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'w-full border border-outline-variant rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30',
                )}
              />
            </label>
            <label className={cm.cn(cm.stack(1))}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('form.role', {}, { defaultValue: 'Role' })}
              </span>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'Member' | 'Admin')}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'w-full border border-outline-variant rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30',
                )}
              >
                <option value="Member">
                  {t('team.role.member', {}, { defaultValue: 'Member' })}
                </option>
                <option value="Admin">{t('team.role.admin', {}, { defaultValue: 'Admin' })}</option>
              </select>
            </label>
            {inviteError ? (
              <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
                {inviteError}
              </p>
            ) : null}
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'end', gap: 'sm' }))}>
              <button
                type="button"
                onClick={() => {
                  setInviteOpen(false)
                  setInviteError(null)
                  setInviteStatus('idle')
                }}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'text-on-surface-variant hover:bg-surface-container rounded-md',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                disabled={inviteStatus === 'submitting' || !inviteEmail.trim()}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-md disabled:opacity-60',
                )}
              >
                {inviteStatus === 'submitting'
                  ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                  : t('team.inviteSubmit', {}, { defaultValue: 'Send invitation' })}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <>
          <section className={cm.cn(cm.card(), 'overflow-hidden')}>
            <header
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                'bg-surface-container border-b border-outline-variant',
              )}
            >
              <h2
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-wide',
                )}
              >
                {t(
                  'team.activeHeading',
                  { count: active.length },
                  { defaultValue: 'Active members ({{count}})' },
                )}
              </h2>
            </header>
            <ul className="divide-y divide-outline-variant">
              {active.map((m) => {
                const isSelf = m.id.startsWith('self:') || m.role === 'Owner'
                return (
                  <li
                    key={m.id}
                    data-mol-id={`team-member-${m.id}`}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 4),
                      cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
                    )}
                  >
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'min-w-0')}>
                      <span
                        className={cm.cn(
                          'h-10 w-10',
                          cm.roundedFull,
                          'grid place-items-center text-on-primary',
                          cm.fontWeight('bold'),
                          cm.shrink0,
                        )}
                        style={{ backgroundColor: SPEAKER_BG[m.speaker_color] }}
                      >
                        {m.initial}
                      </span>
                      <div className={cm.cn('min-w-0')}>
                        <p className={cm.cn(cm.fontWeight('semibold'), 'truncate')}>{m.name}</p>
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                          {m.email} ·{' '}
                          {t(
                            'team.lastActive',
                            { when: fmtRelative(m.last_active, t) },
                            { defaultValue: 'last active {{when}}' },
                          )}
                        </p>
                      </div>
                    </div>
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          cm.roundedFull,
                          ROLE_COLOR[m.role],
                        )}
                      >
                        {t(`team.role.${m.role.toLowerCase()}`, {}, { defaultValue: m.role })}
                      </span>
                      {isSelf ? null : (
                        <button
                          type="button"
                          data-mol-id={`team-remove-${m.id}`}
                          onClick={() => void removeMember(m.id)}
                          className={cm.cn(cm.textSize('sm'), 'text-error hover:underline')}
                        >
                          {t('common.remove', {}, { defaultValue: 'Remove' })}
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          {pending.length > 0 ? (
            <section className={cm.cn(cm.card(), 'overflow-hidden')}>
              <header
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  'bg-surface-container border-b border-outline-variant',
                )}
              >
                <h2
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-wide',
                  )}
                >
                  {t(
                    'team.pendingHeading',
                    { count: pending.length },
                    { defaultValue: 'Pending invitations ({{count}})' },
                  )}
                </h2>
              </header>
              <ul className="divide-y divide-outline-variant">
                {pending.map((m) => (
                  <li
                    key={m.id}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 3),
                      cm.flex({ align: 'center', justify: 'between' }),
                    )}
                  >
                    <div>
                      <p className={cm.fontWeight('medium')}>{m.email}</p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          'team.invitedAs',
                          { role: m.role },
                          { defaultValue: 'Invited as {{role}}' },
                        )}
                      </p>
                    </div>
                    <div className={cm.flex({ gap: 'sm' })}>
                      <button
                        type="button"
                        onClick={() => cancelInvite(m.id)}
                        className={cm.cn(cm.textSize('sm'), 'text-error hover:underline')}
                      >
                        {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
