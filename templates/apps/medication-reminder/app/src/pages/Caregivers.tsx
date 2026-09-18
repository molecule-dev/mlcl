import { type FormEvent, useCallback, useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Caregiver {
  id: string
  caregiver_email: string
  permission: 'view' | 'notify' | 'manage'
  invite_token: string | null
  accepted_at: string | null
  created_at: string
}

const PERMISSION_NAME: Record<Caregiver['permission'], string> = {
  view: 'View',
  notify: 'Notify',
  manage: 'Manage',
}

const PERMISSION_LABEL: Record<Caregiver['permission'], string> = {
  view: 'Read-only — can see your schedule + adherence',
  notify: 'Receives missed-dose alerts',
  manage: 'Can manage your medications',
}

export function Caregivers() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Caregiver[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePermission, setInvitePermission] = useState<Caregiver['permission']>('view')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    return http
      .get('/api/caregivers')
      .then((res) => setList(unwrapList<Caregiver>(res)))
      .catch(() =>
        setError(t('caregivers.loadError', {}, { defaultValue: 'Failed to load caregivers.' })),
      )
      .finally(() => setLoading(false))
  }, [http, t])

  useEffect(() => {
    refresh()
  }, [refresh])

  const submitInvite = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await http.post('/api/caregivers', {
        caregiver_email: inviteEmail.trim().toLowerCase(),
        permission: invitePermission,
      })
      const created = unwrapSingle<Caregiver>(res)
      if (!created?.id)
        throw new Error(
          t(
            'caregivers.inviteIncomplete',
            {},
            { defaultValue: 'Server did not return a caregiver — please try again.' },
          ),
        )
      setShowInvite(false)
      setInviteEmail('')
      setInvitePermission('view')
      await refresh()
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : t('caregivers.inviteError', {}, { defaultValue: 'Could not send the invite.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('caregivers.heading', {}, { defaultValue: 'Caregivers' })}
          </h1>
          <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'caregivers.subheading',
              {},
              { defaultValue: 'People who help you stay on schedule.' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowInvite((v) => !v)}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          {showInvite
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : `+ ${t('caregivers.inviteLabel', {}, { defaultValue: 'Invite caregiver' })}`}
        </button>
      </header>

      {showInvite && (
        <form
          onSubmit={submitInvite}
          aria-label={t(
            'caregivers.inviteFormLabel',
            {},
            { defaultValue: 'Invite caregiver form' },
          )}
          className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}
        >
          <label className="block">
            <span
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
            >
              {t('caregivers.email', {}, { defaultValue: 'Caregiver email' })}
            </span>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'w-full border border-outline-variant rounded-md',
              )}
            />
          </label>

          <fieldset className="space-y-2">
            <legend className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {t('caregivers.permissionLabel', {}, { defaultValue: 'Permission level' })}
            </legend>
            {(Object.keys(PERMISSION_LABEL) as Caregiver['permission'][]).map((p) => (
              <label key={p} className={cm.flex({ align: 'start', gap: 'sm' })}>
                <input
                  type="radio"
                  name="permission"
                  value={p}
                  checked={invitePermission === p}
                  onChange={() => setInvitePermission(p)}
                  className={cm.cn(cm.sp('mt', 1))}
                />
                <span className={cm.cn(cm.textSize('sm'))}>
                  <strong className="block">
                    {t(`caregivers.permission.${p}`, {}, { defaultValue: PERMISSION_NAME[p] })}
                  </strong>
                  <span className="text-on-surface-variant">
                    {t(
                      `caregivers.permission.${p}.desc`,
                      {},
                      { defaultValue: PERMISSION_LABEL[p] },
                    )}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          {submitError && (
            <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
              {submitError}
            </p>
          )}

          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <button
              type="submit"
              disabled={submitting || inviteEmail.trim().length === 0}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-md disabled:opacity-50',
              )}
            >
              {submitting
                ? t('caregivers.inviting', {}, { defaultValue: 'Sending\u2026' })
                : t('nav.invite', {}, { defaultValue: 'Send invite' })}
            </button>
          </div>
        </form>
      )}

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('caregivers.loading', {}, { defaultValue: 'Loading\u2026' })}
        </p>
      ) : list.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t(
            'caregivers.empty',
            {},
            { defaultValue: 'No caregivers added. Invite someone to help.' },
          )}
        </p>
      ) : (
        <ul className={cm.cn('space-y-3')}>
          {list.map((c) => {
            const status = c.accepted_at ? 'active' : 'pending'
            const statusColor =
              status === 'active'
                ? 'bg-success-container text-on-success-container'
                : 'bg-warning-container text-on-warning-container'
            return (
              <li key={c.id}>
                <article className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
                  <div className={cm.flex({ align: 'center', justify: 'between' })}>
                    <div>
                      <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                        {c.caregiver_email}
                      </p>
                      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                        {t(
                          `caregivers.permission.${c.permission}`,
                          {},
                          { defaultValue: PERMISSION_NAME[c.permission] },
                        )}{' '}
                        ·{' '}
                        {t(
                          `caregivers.permission.${c.permission}.desc`,
                          {},
                          { defaultValue: PERMISSION_LABEL[c.permission] },
                        )}
                      </p>
                    </div>
                    <span
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        cm.fontWeight('medium'),
                        'rounded shrink-0',
                        statusColor,
                      )}
                    >
                      {t(`caregivers.status.${status}`, {}, { defaultValue: status })}
                    </span>
                  </div>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {c.invite_token && !c.accepted_at
                      ? t(
                          'caregivers.inviteToken',
                          { token: c.invite_token.slice(0, 8) },
                          {
                            defaultValue: 'Invite token: {{token}}\u2026 (share with caregiver)',
                          },
                        )
                      : t(
                          'caregivers.invitedOn',
                          { when: new Date(c.created_at).toLocaleDateString() },
                          { defaultValue: 'Invited {{when}}' },
                        )}
                  </p>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
