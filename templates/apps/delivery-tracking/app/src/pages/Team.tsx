import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface TeamMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'operator' | 'viewer'
  joined_at: string
  last_active: string | null
  shipments_handled_30d: number
}

const ROLE_COLOR: Record<TeamMember['role'], string> = {
  owner: 'bg-error-container text-on-error-container',
  admin: 'bg-warning-container text-on-warning-container',
  operator: 'bg-primary-container text-on-primary-container',
  viewer: 'bg-surface-container text-on-surface',
}

const ROLE_OPTIONS: Array<TeamMember['role']> = ['admin', 'operator', 'viewer']

export function Team() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [draft, setDraft] = useState({ email: '', role: 'operator' as TeamMember['role'] })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function refresh() {
    return http.get('/api/team-members').then((res) => setMembers(unwrapList<TeamMember>(res)))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    refresh()
      .catch(() => {
        if (!cancelled) setError(t('team.loadError', {}, { defaultValue: 'Failed to load team.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, t])

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!draft.email.includes('@')) {
      setSubmitError(
        t('team.emailError', {}, { defaultValue: 'A valid email address is required.' }),
      )
      return
    }
    setSubmitting(true)
    try {
      await http.post('/api/team-members/invite', {
        email: draft.email.trim().toLowerCase(),
        role: draft.role,
      })
      setInviteOpen(false)
      setDraft({ email: '', role: 'operator' })
      await refresh()
    } catch (err) {
      setSubmitError(
        (err as Error)?.message ??
          t('team.inviteFailed', {}, { defaultValue: 'Could not send invitation.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('team.eyebrow', {}, { defaultValue: 'Members & permissions' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('nav.team', {}, { defaultValue: 'Team' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t('team.subheading', { count: members.length }, { defaultValue: '{{count}} members' })}
          </p>
          {!loading && !error && members.length > 0 ? (
            <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 4))}>
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'bg-primary-container text-primary uppercase tracking-wider tabular-nums',
                )}
              >
                {t(
                  'team.shipments30dTotal',
                  {
                    count: members
                      .reduce((s, x) => s + x.shipments_handled_30d, 0)
                      .toLocaleString(),
                  },
                  { defaultValue: '{{count}} shipments handled (30d)' },
                )}
              </span>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          data-mol-id="button-invite-member"
          onClick={() => setInviteOpen(true)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          + {t('team.inviteLabel', {}, { defaultValue: 'Invite member' })}
        </button>
      </header>

      {inviteOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          data-mol-id="dialog-invite-member"
          className={cm.cn(cm.overlay, cm.flex({ align: 'center', justify: 'center' }), 'z-50')}
        >
          <form
            onSubmit={submitInvite}
            className={cm.cn(cm.card(), cm.sp('p', 6), cm.maxW('md'), 'w-full space-y-4')}
          >
            <header>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                {t('team.inviteDialog.heading', {}, { defaultValue: 'Invite a teammate' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
                {t(
                  'team.inviteDialog.subheading',
                  {},
                  {
                    defaultValue:
                      'They will receive a join link by email and gain access according to their role.',
                  },
                )}
              </p>
            </header>
            <label className="block">
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant uppercase tracking-wider',
                  cm.sp('mb', 1),
                  'block',
                )}
              >
                {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
              </span>
              <input
                data-mol-id="input-email"
                type="email"
                required
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                placeholder={t(
                  'team.inviteDialog.emailPlaceholder',
                  {},
                  { defaultValue: 'teammate@yourcompany.com' },
                )}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md w-full bg-surface text-on-surface',
                )}
              />
            </label>
            <label className="block">
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant uppercase tracking-wider',
                  cm.sp('mb', 1),
                  'block',
                )}
              >
                {t('form.role', {}, { defaultValue: 'Role' })}
              </span>
              <select
                data-mol-id="select-role"
                value={draft.role}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, role: e.target.value as TeamMember['role'] }))
                }
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md w-full bg-surface text-on-surface',
                )}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {t(`team.role.${r}`, {}, { defaultValue: r })}
                  </option>
                ))}
              </select>
            </label>
            {submitError ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{submitError}</p>
            ) : null}
            <footer className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }), cm.sp('pt', 2))}>
              <button
                type="button"
                data-mol-id="button-cancel"
                onClick={() => {
                  setInviteOpen(false)
                  setSubmitError(null)
                }}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-md border border-outline-variant text-on-surface',
                )}
              >
                {t('team.inviteDialog.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                data-mol-id="button-submit"
                disabled={submitting}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-md disabled:opacity-50',
                )}
              >
                {submitting
                  ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                  : t('nav.invite', {}, { defaultValue: 'Send invite' })}
              </button>
            </footer>
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
        <ul className={'space-y-2'}>
          {members.map((m) => (
            <li key={m.id}>
              <article
                className={cm.cn(cm.card(), cm.sp('p', 4), cm.flex({ align: 'center', gap: 'md' }))}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.h(11),
                    cm.w(11),
                    'rounded-full shrink-0 bg-primary-container text-on-primary-container',
                  )}
                >
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                    {m.name
                      .split(' ')
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                </div>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'truncate')}>
                    {m.name}
                  </p>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'truncate')}>
                    {m.email}
                  </p>
                </div>
                <div className={cm.cn(cm.shrink0, cm.textCenter)}>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t('team.shipments30d', {}, { defaultValue: 'Shipments (30d)' })}
                  </p>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {m.shipments_handled_30d}
                  </p>
                </div>
                <div className={cm.cn(cm.shrink0, cm.textCenter)}>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t('team.lastActive', {}, { defaultValue: 'Last active' })}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {m.last_active ? new Date(m.last_active).toLocaleDateString() : '—'}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    'rounded shrink-0',
                    ROLE_COLOR[m.role],
                  )}
                >
                  {t(`team.role.${m.role}`, {}, { defaultValue: m.role })}
                </span>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
