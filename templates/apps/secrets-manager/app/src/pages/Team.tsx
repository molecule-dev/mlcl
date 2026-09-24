import { type FormEvent, useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { SecretsManagerLayout } from '../components/SecretsManagerLayout.js'
import { SecretStatusPill, type SecretStatusTone } from '../components/SecretStatusPill.js'

interface TeamMemberApi {
  id: string
  email: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  status: 'invited' | 'active' | 'suspended'
  sso_group?: string | null
  vaults?: string[] | null
  last_active_at?: string | null
}

const STATUS_TONE: Record<TeamMemberApi['status'], SecretStatusTone> = {
  invited: 'pending',
  active: 'active',
  suspended: 'revoked',
}

const ROLES = ['owner', 'admin', 'editor', 'viewer'] as const

export function Team() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [members, setMembers] = useState<TeamMemberApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TeamMemberApi['role']>('editor')
  const [submitting, setSubmitting] = useState(false)

  const reload = async () => {
    try {
      const res = await http.get<TeamMemberApi[]>('/api/team-members')
      setMembers(Array.isArray(res.data) ? (res.data as TeamMemberApi[]) : [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed')
    }
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await reload()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    try {
      await http.post('/api/team-members', { email: email.trim(), role })
      // Role only — the invited email is PII and stays out of telemetry.
      void track({ name: 'member.invited', properties: { role } })
      setEmail('')
      setRole('editor')
      setInviting(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'invite failed')
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await http.delete(`/api/team-members/${id}`)
      void track({ name: 'member.removed', properties: { member_id: id } })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'remove failed')
    }
  }

  return (
    <SecretsManagerLayout
      topAction={
        <button
          type="button"
          onClick={() => setInviting((v) => !v)}
          data-mol-id="team-invite-toggle"
          className={cm.cn(
            'inline-flex h-8 items-center gap-1 rounded bg-primary px-3 font-headline text-[12px] font-bold text-on-primary transition-colors hover:bg-primary/90',
          )}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
            person_add
          </span>
          {t('team.invite', {}, { defaultValue: 'Invite member' })}
        </button>
      }
    >
      <div className={cm.cn('flex flex-col gap-5 p-6 pb-12 md:p-8')}>
        <header className={cm.cn('flex flex-col gap-2')}>
          <span className={cm.cn('font-mono text-[11px] uppercase tracking-widest text-muted')}>
            {t(
              'nav.team',
              { count: members.length },
              { defaultValue: `${members.length} team members` },
            )}
          </span>
          <h1 className={cm.cn('font-headline text-3xl font-extrabold tracking-tight text-text')}>
            {t('team.heading', {}, { defaultValue: 'Team' })}
          </h1>
          <p className={cm.cn('font-body text-sm text-muted')}>
            {t(
              'team.subheading',
              {},
              {
                defaultValue:
                  'Owners, admins, engineers, auditors. Per-vault scoping inherited from groups.',
              },
            )}
          </p>
        </header>

        {inviting ? (
          <form
            onSubmit={submit}
            className={cm.cn(
              'flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 md:flex-row md:items-end md:gap-2',
            )}
          >
            <label
              className={cm.cn(
                'flex flex-1 flex-col gap-1 font-mono text-xs uppercase tracking-widest text-muted',
              )}
            >
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-mol-id="team-invite-email"
                className={cm.cn(
                  'h-9 rounded-md border border-border bg-background px-3 font-mono text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                )}
              />
            </label>
            <label
              className={cm.cn(
                'flex flex-col gap-1 font-mono text-xs uppercase tracking-widest text-muted',
              )}
            >
              {t('form.role', {}, { defaultValue: 'Role' })}
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as TeamMemberApi['role'])}
                data-mol-id="team-invite-role"
                className={cm.cn(
                  'h-9 rounded-md border border-border bg-background px-3 font-mono text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                )}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={submitting}
              data-mol-id="team-invite-submit"
              className={cm.cn(
                'inline-flex h-9 items-center gap-1 rounded bg-primary px-3 font-headline text-xs font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {submitting
                ? t('common.inviting', {}, { defaultValue: 'Inviting…' })
                : t('nav.invite', {}, { defaultValue: 'Send invite' })}
            </button>
          </form>
        ) : null}

        {loading ? (
          <div
            data-mol-id="team-loading"
            className={cm.cn(
              'rounded-lg border border-border bg-surface p-6 text-center font-mono text-xs text-muted',
            )}
          >
            {t('team.loading', {}, { defaultValue: 'Loading team…' })}
          </div>
        ) : error ? (
          <div
            data-mol-id="team-error"
            className={cm.cn(
              'rounded-lg border border-error/40 bg-error/10 p-4 font-mono text-xs text-error',
            )}
          >
            {error}
          </div>
        ) : members.length === 0 ? (
          <div
            data-mol-id="team-empty"
            className={cm.cn(
              'flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-surface p-10 text-center',
            )}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[28px] text-muted">
              group_add
            </span>
            <p className={cm.cn('font-body text-sm text-muted')}>
              {t(
                'team.empty',
                {},
                { defaultValue: 'No teammates yet — invite collaborators to share access.' },
              )}
            </p>
          </div>
        ) : (
          <section className={cm.cn('overflow-hidden rounded-xl border border-border bg-surface')}>
            <header
              className={cm.cn(
                'flex h-9 items-center gap-3 border-b border-border bg-surface-secondary px-4 font-mono text-[10px] font-black uppercase tracking-widest text-muted',
              )}
            >
              <span className={cm.cn('flex-1')}>
                {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              </span>
              <span className={cm.cn('w-24')}>{t('form.role', {}, { defaultValue: 'Role' })}</span>
              <span className={cm.cn('w-24')}>
                {t('nav.status', {}, { defaultValue: 'Status' })}
              </span>
              <span className={cm.cn('hidden w-44 text-right md:inline')}>
                {t('team.col.lastActive', {}, { defaultValue: 'Last active' })}
              </span>
              <span className={cm.cn('w-32 text-right')}>
                {t('team.col.actions', {}, { defaultValue: '' })}
              </span>
            </header>
            <ol data-mol-id="team-list">
              {members.map((m) => (
                <li
                  key={m.id}
                  className={cm.cn(
                    'flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0',
                  )}
                >
                  <span className={cm.cn('flex-1 truncate font-mono text-sm text-text')}>
                    {m.email}
                  </span>
                  <span
                    className={cm.cn(
                      'w-24 font-mono text-[11px] uppercase tracking-widest text-muted',
                    )}
                  >
                    {m.role}
                  </span>
                  <span className={cm.cn('w-24')}>
                    <SecretStatusPill tone={STATUS_TONE[m.status]} label={m.status} compact />
                  </span>
                  <span
                    className={cm.cn(
                      'hidden w-44 text-right font-mono text-[11px] text-muted md:inline',
                    )}
                  >
                    {m.last_active_at ? new Date(m.last_active_at).toLocaleString() : '—'}
                  </span>
                  <span className={cm.cn('w-32 flex justify-end')}>
                    {/* Two-step destructive confirm (arm → "Remove this
                        member?" → commit, 6s auto-disarm, Escape, aria-live)
                        replacing window.confirm; the old icon-only button's
                        aria-label is now the visible label. */}
                    <ConfirmButton
                      label={t('team.remove', {}, { defaultValue: 'Remove member' })}
                      confirmLabel={t(
                        'team.confirmRemove',
                        {},
                        { defaultValue: 'Remove this member?' },
                      )}
                      onConfirm={() => remove(m.id)}
                      color="error"
                      size="sm"
                      disarmSeconds={6}
                      data-mol-id={`team-remove-${m.id}`}
                    />
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </SecretsManagerLayout>
  )
}

export default Team
