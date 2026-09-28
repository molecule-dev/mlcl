import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

const SCOPES = [
  { id: 'all', label: 'Full record', desc: 'Everything in your timeline.' },
  {
    id: 'medications',
    label: 'Medications & allergies',
    desc: 'Active prescriptions and sensitivities.',
  },
  { id: 'labs', label: 'Recent labs', desc: 'Results from the past 12 months.' },
  { id: 'visits', label: 'Visit summaries', desc: 'Provider notes and encounters.' },
] as const

const ROLES = [
  { id: 'provider', label: 'Provider', icon: 'medical_services' },
  { id: 'caregiver', label: 'Caregiver', icon: 'volunteer_activism' },
  { id: 'readonly', label: 'View-only', icon: 'visibility' },
] as const

const SCOPE_TO_ARRAY: Record<string, string[]> = {
  all: ['records', 'medications', 'labs', 'visits', 'documents', 'immunizations'],
  medications: ['medications'],
  labs: ['labs'],
  visits: ['visits'],
}

const ROLE_TO_API: Record<string, string> = {
  provider: 'provider',
  caregiver: 'caregiver',
  readonly: 'viewer',
}

export function InviteShare() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string>('provider')
  const [scope, setScope] = useState<string>('all')
  const [expires, setExpires] = useState('30')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const expiresAt =
        expires === 'never'
          ? undefined
          : new Date(Date.now() + Number(expires) * 86_400_000).toISOString()
      const res = await http.post('/api/sharing', {
        recipient_email: email,
        recipient_name: name || undefined,
        role: ROLE_TO_API[role] ?? 'viewer',
        scope: SCOPE_TO_ARRAY[scope] ?? ['records'],
        expires_at: expiresAt,
      })
      const grant = unwrapSingle<{ id: string }>(res)
      track({
        name: 'record.shared',
        properties: {
          grant_id: grant?.id,
          role: ROLE_TO_API[role] ?? 'viewer',
          scope: SCOPE_TO_ARRAY[scope] ?? ['records'],
          expires_in_days: expires === 'never' ? null : Number(expires),
        },
      })
      navigate('/sharing')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('inviteShare.error', {}, { defaultValue: 'Could not send invitation.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.sp('p', 8))}
      data-mol-id="page-invite-share"
    >
      <div className={cm.cn(cm.sp('mb', 8))}>
        <Link
          to="/sharing"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary hover:underline mb-3',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
          {t('inviteShare.back', {}, { defaultValue: 'Sharing' })}
        </Link>
        <p className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-primary mb-1')}>
          {t('inviteShare.eyebrow', {}, { defaultValue: 'Grant access' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('inviteShare.title', {}, { defaultValue: 'Invite someone' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mt', 2),
            'text-on-surface-variant max-w-prose',
          )}
        >
          {t(
            'inviteShare.subtitle',
            {},
            {
              defaultValue:
                'Share a precise slice of your record. You can revoke or change this any time.',
            },
          )}
        </p>
      </div>

      <form onSubmit={handleSend} className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
        {/* Recipient card */}
        <section
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
              cm.sp('mb', 4),
            )}
          >
            {t('inviteShare.recipient', {}, { defaultValue: 'Recipient' })}
          </h2>
          <div className={cm.cn('space-y-4')}>
            <label className={cm.cn('block')}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'block uppercase tracking-widest text-on-surface-variant mb-1',
                )}
              >
                {t('form.fullName', {}, { defaultValue: 'Full name' })}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(
                  'inviteShare.namePlaceholder',
                  {},
                  { defaultValue: 'Dr. Anika Patel' },
                )}
                className={cm.cn(
                  cm.sp('p', 3),
                  'w-full bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40',
                )}
                required
              />
            </label>
            <label className={cm.cn('block')}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'block uppercase tracking-widest text-on-surface-variant mb-1',
                )}
              >
                {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t(
                  'inviteShare.emailPlaceholder',
                  {},
                  { defaultValue: 'provider@example.com' },
                )}
                className={cm.cn(
                  cm.sp('p', 3),
                  'w-full bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40',
                )}
                required
              />
            </label>
          </div>
        </section>

        {/* Role */}
        <section
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
              cm.sp('mb', 4),
            )}
          >
            {t('inviteShare.role', {}, { defaultValue: 'Their role' })}
          </h2>
          <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-1 md:grid-cols-3')}>
            {ROLES.map((r) => (
              <label
                key={r.id}
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'start', gap: 'xs' }),
                  cm.sp('p', 4),
                  'cursor-pointer rounded-xl border-2 transition-colors',
                  role === r.id
                    ? 'border-primary bg-primary-container/40'
                    : 'border-outline-variant hover:border-primary/40',
                )}
              >
                <input
                  type="radio"
                  className="sr-only"
                  checked={role === r.id}
                  onChange={() => setRole(r.id)}
                />
                <span
                  className={cm.cn('material-symbols-outlined text-primary')}
                  aria-hidden="true"
                >
                  {r.icon}
                </span>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                  {t(`inviteShare.role.${r.id}`, {}, { defaultValue: r.label })}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Scope */}
        <section
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
              cm.sp('mb', 4),
            )}
          >
            {t('inviteShare.scope', {}, { defaultValue: 'What they can see' })}
          </h2>
          <ul className={cm.cn('space-y-3')}>
            {SCOPES.map((s) => (
              <li key={s.id}>
                <label
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 'sm' }),
                    cm.sp('p', 3),
                    'cursor-pointer rounded-lg border-2 transition-colors',
                    scope === s.id
                      ? 'border-primary bg-primary-container/30'
                      : 'border-transparent hover:bg-surface-container-low',
                  )}
                >
                  <input
                    type="radio"
                    className={cm.sp('mt', 1)}
                    checked={scope === s.id}
                    onChange={() => setScope(s.id)}
                  />
                  <div>
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                      {t(`inviteShare.scopeOption.${s.id}.label`, {}, { defaultValue: s.label })}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(`inviteShare.scopeOption.${s.id}.desc`, {}, { defaultValue: s.desc })}
                    </p>
                  </div>
                </label>
              </li>
            ))}
          </ul>
        </section>

        {/* Expires */}
        <section
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
              cm.sp('mb', 4),
            )}
          >
            {t('inviteShare.expires', {}, { defaultValue: 'Access expires' })}
          </h2>
          <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
            {[
              {
                v: '7',
                label: t('inviteShare.expiry.days', { days: 7 }, { defaultValue: '{{days}} days' }),
              },
              {
                v: '30',
                label: t(
                  'inviteShare.expiry.days',
                  { days: 30 },
                  { defaultValue: '{{days}} days' },
                ),
              },
              {
                v: '90',
                label: t(
                  'inviteShare.expiry.days',
                  { days: 90 },
                  { defaultValue: '{{days}} days' },
                ),
              },
              {
                v: 'never',
                label: t('inviteShare.expiry.never', {}, { defaultValue: 'No expiry' }),
              },
            ].map((opt) => (
              <button
                type="button"
                key={opt.v}
                onClick={() => setExpires(opt.v)}
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'px-4 py-2 text-[11px] uppercase tracking-widest rounded-full transition-colors',
                  expires === opt.v
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Privacy note + actions */}
        <section
          className={cm.cn(
            cm.sp('p', 5),
            cm.accentCard({ tone: 'info' }),
            'bg-surface-container-lowest rounded-xl',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }))}>
            <span className={cm.cn('material-symbols-outlined text-primary')} aria-hidden="true">
              verified_user
            </span>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant leading-relaxed')}>
              {t(
                'inviteShare.privacy',
                {},
                {
                  defaultValue:
                    'All shares are encrypted in transit and at rest. The recipient receives a one-time code to verify their identity. You can audit and revoke access at any time.',
                },
              )}
            </p>
          </div>
        </section>

        <div className={cm.cn(cm.flex({ align: 'center', justify: 'end', gap: 'sm' }))}>
          <Link
            to="/sharing"
            className={cm.cn(
              cm.fontWeight('bold'),
              'px-5 py-3 text-[11px] uppercase tracking-widest rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-colors',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </Link>
          <button
            type="submit"
            disabled={submitting}
            data-mol-id="invite-send"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              'px-5 py-3 text-[11px] uppercase tracking-widest rounded-full bg-primary text-on-primary shadow-sm hover:shadow-md transition-shadow disabled:opacity-50',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>send</span>
            {submitting
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('inviteShare.send', {}, { defaultValue: 'Send invitation' })}
          </button>
        </div>
        {error && (
          <p
            role="alert"
            data-mol-id="invite-error"
            className={cm.cn(cm.textSize('sm'), 'text-error font-bold')}
          >
            {error}
          </p>
        )}
      </form>
    </div>
  )
}
