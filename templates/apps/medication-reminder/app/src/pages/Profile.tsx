import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth, useDevice, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

const SECTIONS = ['identity', 'medical', 'emergency', 'security'] as const
type Section = (typeof SECTIONS)[number]

interface ProfileData {
  dob?: string
  phone?: string
  allergies?: string
  conditions?: string
  bloodType?: string
  height?: string
  weight?: string
  emergency?: {
    name?: string
    relationship?: string
    phone?: string
  }
}

interface AccountUser {
  id: string
  name?: string | null
  email?: string | null
  oauthData?: { profile?: ProfileData } & Record<string, unknown>
}

const emptyProfile = (): ProfileData => ({
  dob: '',
  phone: '',
  allergies: '',
  conditions: '',
  bloodType: '',
  height: '',
  weight: '',
  emergency: { name: '', relationship: '', phone: '' },
})

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth<AccountUser>()
  const http = useHttpClient()
  const user = auth.user
  const [section, setSection] = useState<Section>('identity')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<ProfileData>(emptyProfile)
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [savingMedical, setSavingMedical] = useState(false)
  const [savingEmergency, setSavingEmergency] = useState(false)
  const [identityMessage, setIdentityMessage] = useState<{
    kind: 'ok' | 'error'
    text: string
  } | null>(null)
  const [medicalMessage, setMedicalMessage] = useState<{
    kind: 'ok' | 'error'
    text: string
  } | null>(null)
  const [emergencyMessage, setEmergencyMessage] = useState<{
    kind: 'ok' | 'error'
    text: string
  } | null>(null)

  // Hydrate fields from the authenticated user.
  useEffect(() => {
    if (!user) return
    setName(user.name ?? '')
    setEmail(user.email ?? '')
    setProfile({ ...emptyProfile(), ...(user.oauthData?.profile ?? {}) })
  }, [user])

  const baseOauthData = useMemo(() => user?.oauthData ?? {}, [user])

  const patchUser = async (body: Record<string, unknown>) => {
    if (!user?.id) throw new Error('Not signed in')
    await http.patch(`/api/users/${user.id}`, body)
    const nextOauth =
      typeof body.oauthData === 'object' && body.oauthData !== null
        ? (body.oauthData as Record<string, unknown>)
        : user.oauthData
    auth.setUser({
      ...user,
      ...('name' in body ? { name: body.name as string } : {}),
      ...('email' in body ? { email: body.email as string } : {}),
      oauthData: nextOauth,
    })
  }

  const submitIdentity = async (event: FormEvent) => {
    event.preventDefault()
    setSavingIdentity(true)
    setIdentityMessage(null)
    try {
      const nextProfile: ProfileData = {
        ...profile,
        dob: profile.dob,
        phone: profile.phone,
      }
      await patchUser({
        name,
        email,
        oauthData: { ...baseOauthData, profile: nextProfile },
      })
      setIdentityMessage({
        kind: 'ok',
        text: t('common.savedPeriod', {}, { defaultValue: 'Saved.' }),
      })
    } catch (err) {
      setIdentityMessage({
        kind: 'error',
        text:
          err instanceof Error
            ? err.message
            : t('common.couldNotSaveChanges', {}, { defaultValue: 'Could not save changes.' }),
      })
    } finally {
      setSavingIdentity(false)
    }
  }

  const submitMedical = async (event: FormEvent) => {
    event.preventDefault()
    setSavingMedical(true)
    setMedicalMessage(null)
    try {
      await patchUser({ oauthData: { ...baseOauthData, profile } })
      setMedicalMessage({
        kind: 'ok',
        text: t('common.savedPeriod', {}, { defaultValue: 'Saved.' }),
      })
    } catch (err) {
      setMedicalMessage({
        kind: 'error',
        text:
          err instanceof Error
            ? err.message
            : t('common.couldNotSaveChanges', {}, { defaultValue: 'Could not save changes.' }),
      })
    } finally {
      setSavingMedical(false)
    }
  }

  const submitEmergency = async (event: FormEvent) => {
    event.preventDefault()
    setSavingEmergency(true)
    setEmergencyMessage(null)
    try {
      await patchUser({ oauthData: { ...baseOauthData, profile } })
      setEmergencyMessage({
        kind: 'ok',
        text: t('common.savedPeriod', {}, { defaultValue: 'Saved.' }),
      })
    } catch (err) {
      setEmergencyMessage({
        kind: 'error',
        text:
          err instanceof Error
            ? err.message
            : t('common.couldNotSaveChanges', {}, { defaultValue: 'Could not save changes.' }),
      })
    } finally {
      setSavingEmergency(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.grid({ cols: 12, gap: 'lg' }))}>
      <aside className={cm.cn('col-span-12 md:col-span-3')}>
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </h1>
        <nav
          className={cm.cn('space-y-1')}
          aria-label={t('profile.navLabel', {}, { defaultValue: 'Profile sections' })}
        >
          {SECTIONS.map((s) => {
            const isActive = section === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSection(s)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block w-full text-left rounded-md',
                  isActive
                    ? cm.cn('bg-primary-container', cm.textPrimary)
                    : cm.cn(
                        'text-on-surface-variant',
                        'hover:bg-surface-container hover:text-on-surface',
                      ),
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {t(
                  `profile.section.${s}`,
                  {},
                  { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      <main className={cm.cn('col-span-12 md:col-span-9 space-y-4')}>
        {section === 'identity' && (
          <form onSubmit={submitIdentity} className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('profile.identity.heading', {}, { defaultValue: 'Identity' })}
            </h2>
            <Field
              label={t('form.fullName', {}, { defaultValue: 'Full name' })}
              value={name}
              onChange={setName}
            />
            <Field
              label={t('profile.identity.dob', {}, { defaultValue: 'Date of birth' })}
              value={profile.dob ?? ''}
              onChange={(v) => setProfile((p) => ({ ...p, dob: v }))}
              type="date"
            />
            <Field
              label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              value={email}
              onChange={setEmail}
              type="email"
            />
            <Field
              label={t('form.phone', {}, { defaultValue: 'Phone' })}
              value={profile.phone ?? ''}
              onChange={(v) => setProfile((p) => ({ ...p, phone: v }))}
              type="tel"
            />
            <SaveBar saving={savingIdentity} message={identityMessage} />
          </form>
        )}

        {section === 'medical' && (
          <form onSubmit={submitMedical} className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('profile.medical.heading', {}, { defaultValue: 'Medical information' })}
            </h2>
            <Field
              label={t('profile.medical.allergies', {}, { defaultValue: 'Allergies' })}
              value={profile.allergies ?? ''}
              onChange={(v) => setProfile((p) => ({ ...p, allergies: v }))}
            />
            <Field
              label={t('profile.medical.conditions', {}, { defaultValue: 'Active conditions' })}
              value={profile.conditions ?? ''}
              onChange={(v) => setProfile((p) => ({ ...p, conditions: v }))}
            />
            <Field
              label={t('profile.medical.bloodType', {}, { defaultValue: 'Blood type' })}
              value={profile.bloodType ?? ''}
              onChange={(v) => setProfile((p) => ({ ...p, bloodType: v }))}
            />
            <Field
              label={t('profile.medical.height', {}, { defaultValue: 'Height' })}
              value={profile.height ?? ''}
              onChange={(v) => setProfile((p) => ({ ...p, height: v }))}
            />
            <Field
              label={t('profile.medical.weight', {}, { defaultValue: 'Weight' })}
              value={profile.weight ?? ''}
              onChange={(v) => setProfile((p) => ({ ...p, weight: v }))}
            />
            <SaveBar saving={savingMedical} message={medicalMessage} />
          </form>
        )}

        {section === 'emergency' && (
          <form onSubmit={submitEmergency} className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('profile.emergency.heading', {}, { defaultValue: 'Emergency contact' })}
            </h2>
            <Field
              label={t('form.name', {}, { defaultValue: 'Name' })}
              value={profile.emergency?.name ?? ''}
              onChange={(v) =>
                setProfile((p) => ({ ...p, emergency: { ...(p.emergency ?? {}), name: v } }))
              }
            />
            <Field
              label={t('profile.emergency.relationship', {}, { defaultValue: 'Relationship' })}
              value={profile.emergency?.relationship ?? ''}
              onChange={(v) =>
                setProfile((p) => ({
                  ...p,
                  emergency: { ...(p.emergency ?? {}), relationship: v },
                }))
              }
            />
            <Field
              label={t('form.phone', {}, { defaultValue: 'Phone' })}
              value={profile.emergency?.phone ?? ''}
              onChange={(v) =>
                setProfile((p) => ({ ...p, emergency: { ...(p.emergency ?? {}), phone: v } }))
              }
              type="tel"
            />
            <SaveBar saving={savingEmergency} message={emergencyMessage} />
          </form>
        )}

        {section === 'security' && (
          <>
            <SecurityPanel userId={user?.id ?? ''} />
            <TwoFactorPanel userId={user?.id ?? ''} />
            <DevicesPanel />
            <DangerZone userId={user?.id ?? ''} />
          </>
        )}
      </main>
    </div>
  )
}

function SaveBar({
  saving,
  message,
}: {
  saving: boolean
  message: { kind: 'ok' | 'error'; text: string } | null
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
      <button
        type="submit"
        disabled={saving}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'rounded-md bg-primary text-on-primary disabled:opacity-60',
        )}
      >
        {saving
          ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
          : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
      </button>
      {message ? (
        <span
          role="status"
          aria-live="polite"
          className={cm.cn(
            cm.textSize('sm'),
            message.kind === 'ok' ? 'text-success' : 'text-error',
          )}
        >
          {message.text}
        </span>
      ) : null}
    </div>
  )
}

function SecurityPanel({ userId }: { userId: string }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage(null)
    if (next.length < 8) {
      setMessage({
        kind: 'error',
        text: t(
          'profile.security.tooShort',
          {},
          {
            defaultValue: 'Password must be at least 8 characters.',
          },
        ),
      })
      return
    }
    if (next !== confirm) {
      setMessage({
        kind: 'error',
        text: t(
          'auth.signup.passwordsDoNotMatchPeriod',
          {},
          { defaultValue: 'Passwords do not match.' },
        ),
      })
      return
    }
    setSubmitting(true)
    try {
      await http.patch(`/api/users/${userId}/password`, {
        currentPassword: current,
        newPassword: next,
      })
      setMessage({
        kind: 'ok',
        text: t('auth.resetPassword.passwordUpdated', {}, { defaultValue: 'Password updated.' }),
      })
      setCurrent('')
      setNext('')
      setConfirm('')
      setOpen(false)
    } catch (err) {
      setMessage({
        kind: 'error',
        text:
          err instanceof Error
            ? err.message
            : t('profile.security.error', {}, { defaultValue: 'Could not change password.' }),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('nav.security', {}, { defaultValue: 'Security' })}
      </h2>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t(
          'profile.security.body',
          {},
          {
            defaultValue:
              'Change password, manage two-factor authentication, and review active sessions.',
          },
        )}
      </p>

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'border border-outline-variant rounded-md',
          )}
        >
          {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
        </button>
      )}

      {open && (
        <form onSubmit={submit} className={cm.cn('space-y-3')}>
          <Field
            label={t('profile.security.current', {}, { defaultValue: 'Current password' })}
            value={current}
            onChange={setCurrent}
            type="password"
          />
          <Field
            label={t('profile.security.next', {}, { defaultValue: 'New password' })}
            value={next}
            onChange={setNext}
            type="password"
          />
          <Field
            label={t(
              'auth.signup.confirmNewPassword',
              {},
              { defaultValue: 'Confirm new password' },
            )}
            value={confirm}
            onChange={setConfirm}
            type="password"
          />
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <button
              type="submit"
              disabled={submitting}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'rounded-md bg-primary text-on-primary disabled:opacity-60',
              )}
            >
              {submitting
                ? t('common.updatingEllipsis', {}, { defaultValue: 'Updating…' })
                : t('auth.resetPassword.updatePassword', {}, { defaultValue: 'Update password' })}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setCurrent('')
                setNext('')
                setConfirm('')
                setMessage(null)
              }}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-md border border-outline-variant',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      )}

      {message ? (
        <p
          role="status"
          aria-live="polite"
          className={cm.cn(
            cm.textSize('sm'),
            message.kind === 'ok' ? 'text-success' : 'text-error',
          )}
        >
          {message.text}
        </p>
      ) : null}
    </section>
  )
}

interface TwoFactorSetup {
  QRImageUrl?: string
  secret?: string
}

/**
 * Two-factor authentication — real TOTP enrollment against the user
 * resource's POST /api/users/:id/verify-two-factor endpoint
 * (@molecule/api-two-factor + @molecule/api-two-factor-otplib):
 *  - Enable → {action:'setup'} returns a QR code + secret to scan into an
 *    authenticator app → user enters the 6-digit code → {action:'enable', token}
 *    (200 = enabled, 403 = invalid code).
 *  - Disable → user enters a current code → {action:'disable', token}.
 * Current status is read from GET /api/users/me (twoFactorEnabled). If the
 * API has no two-factor provider bonded, setup fails gracefully with an
 * inline "not available" message. Recreates the shared AuthSection 2FA flow,
 * presented inline (not in a Modal) to match this page's expand-in-place
 * idiom (see SecurityPanel / DangerZone). 2FA is warranted here because the
 * app stores protected health information (medications, conditions, allergies).
 */
function TwoFactorPanel({ userId }: { userId: string }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [enabled, setEnabled] = useState(false)
  const [mode, setMode] = useState<null | 'enable' | 'disable'>(null)
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Read the persisted 2FA status from /api/users/me on mount.
  useEffect(() => {
    let cancelled = false
    http
      .get<Record<string, unknown>>('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const body = ((res as { data?: Record<string, unknown> }).data ?? res) as Record<
          string,
          unknown
        >
        const u = ((body.props as Record<string, unknown> | undefined) ?? body) as {
          twoFactorEnabled?: boolean
        }
        setEnabled(Boolean(u?.twoFactorEnabled))
      })
      .catch(() => {
        /* Status read is best-effort; defaults to disabled. */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const close = () => {
    setMode(null)
    setSetup(null)
    setToken('')
    setError(null)
  }

  const startEnable = async () => {
    setError(null)
    setBusy(true)
    setMode('enable')
    try {
      const res = await http.post<TwoFactorSetup>(`/api/users/${userId}/verify-two-factor`, {
        action: 'setup',
      })
      const data = ((res as { data?: TwoFactorSetup }).data ?? res) as TwoFactorSetup
      setSetup(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'settings.twoFactorUnavailable',
              {},
              { defaultValue: 'Two-factor authentication is not available for this app.' },
            ),
      )
    } finally {
      setBusy(false)
    }
  }

  const submit = async (action: 'enable' | 'disable') => {
    setError(null)
    setBusy(true)
    try {
      await http.post(`/api/users/${userId}/verify-two-factor`, { action, token })
      setEnabled(action === 'enable')
      close()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.twoFactorInvalidCode', {}, { defaultValue: 'Invalid code.' }),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t('settings.twoFactor', {}, { defaultValue: 'Two-factor authentication' })}
          {enabled ? (
            <span className={cm.cn(cm.textSize('xs'), cm.textPrimary, cm.sp('ml', 2))}>
              {t('settings.twoFactorOn', {}, { defaultValue: 'On' })}
            </span>
          ) : null}
        </h2>
        {mode === null ? (
          enabled ? (
            <button
              type="button"
              onClick={() => {
                setError(null)
                setToken('')
                setMode('disable')
              }}
              data-mol-id="two-factor-disable"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'border border-outline-variant rounded-md',
              )}
            >
              {t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void startEnable()}
              data-mol-id="two-factor-enable"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'border border-outline-variant rounded-md',
              )}
            >
              {t('settings.twoFactorEnable', {}, { defaultValue: 'Enable' })}
            </button>
          )
        ) : null}
      </div>

      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t(
          'settings.twoFactorBody',
          {},
          {
            defaultValue:
              'Require a one-time code from an authenticator app at sign-in for an extra layer of protection on your health data.',
          },
        )}
      </p>

      {mode === 'enable' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submit('enable')
          }}
          className={cm.cn('space-y-3')}
        >
          {busy && !setup ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : null}
          {setup?.QRImageUrl ? (
            <div className={cm.cn('space-y-2')}>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.twoFactorScan',
                  {},
                  {
                    defaultValue:
                      'Scan this QR code with your authenticator app, then enter the 6-digit code.',
                  },
                )}
              </p>
              <img
                src={setup.QRImageUrl}
                alt={t('settings.twoFactorQrAlt', {}, { defaultValue: 'Two-factor QR code' })}
                className={cm.cn('mx-auto', cm.maxW('xs'))}
              />
              {setup.secret ? (
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'text-on-surface-variant text-center break-all',
                  )}
                >
                  {setup.secret}
                </p>
              ) : null}
            </div>
          ) : null}
          {setup ? (
            <>
              <Field
                label={t('settings.twoFactorCode', {}, { defaultValue: 'Authentication code' })}
                value={token}
                onChange={setToken}
              />
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <button
                  type="submit"
                  disabled={busy}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'rounded-md bg-primary text-on-primary disabled:opacity-60',
                  )}
                >
                  {busy
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('settings.twoFactorVerify', {}, { defaultValue: 'Verify & enable' })}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'rounded-md border border-outline-variant',
                  )}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
              </div>
            </>
          ) : (
            !busy && (
              <button
                type="button"
                onClick={close}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-md border border-outline-variant',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
            )
          )}
        </form>
      ) : null}

      {mode === 'disable' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submit('disable')
          }}
          className={cm.cn('space-y-3')}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'settings.twoFactorDisableBody',
              {},
              {
                defaultValue:
                  'Enter a current code from your authenticator app to turn off two-factor authentication.',
              },
            )}
          </p>
          <Field
            label={t('settings.twoFactorCode', {}, { defaultValue: 'Authentication code' })}
            value={token}
            onChange={setToken}
          />
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <button
              type="submit"
              disabled={busy}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-md bg-error text-on-error disabled:opacity-60',
              )}
            >
              {busy
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })}
            </button>
            <button
              type="button"
              onClick={close}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-md border border-outline-variant',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      ) : null}

      {error ? (
        <p role="status" aria-live="polite" className={cm.cn(cm.textSize('sm'), 'text-error')}>
          {error}
        </p>
      ) : null}
    </section>
  )
}

interface DeviceRow {
  id: string
  name?: string | null
  isCurrent?: boolean
}

/**
 * Devices section — "this device" detail strip + the user's registered
 * devices (GET /api/devices, served by @molecule/api-resource-device).
 * Fulfills the "review active sessions" promise in the security copy.
 *
 * Each non-current device has a "Sign out" control that revokes it
 * (DELETE /api/devices/:id) after an inline confirm, then refetches the
 * list. The API enforces server-side session revocation when the device
 * row is deleted, so the device is actually signed out — not just hidden.
 * The current device is labelled "This device" and is not revocable here
 * (use Sign out for the current session). Recreates molecule v1's
 * device-revocation behaviour (see the shared DevicesSection reference).
 */
function DevicesPanel() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { deviceInfo } = useDevice()
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await http.get('/api/devices')
      setDevices(unwrapList<DeviceRow>(res))
    } catch (_error) {
      /* Devices endpoint is optional; render the empty state on failure. */
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void load()
  }, [load])

  const revoke = async (id: string) => {
    setRevokingId(id)
    try {
      await http.delete(`/api/devices/${id}`)
      setConfirmingId(null)
      await load()
    } catch (_error) {
      /* Best-effort — keep the row so the user can retry the revoke. */
    } finally {
      setRevokingId(null)
    }
  }

  const unknown = t('settings.unknown', {}, { defaultValue: 'Unknown' })

  return (
    <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('settings.devices', {}, { defaultValue: 'Devices' })}
      </h2>

      <div className={cm.cn('space-y-1')}>
        <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), cm.sp('mb', 1))}>
          {t('settings.thisDevice', {}, { defaultValue: 'This device' })}
        </h3>
        <dl className={cm.cn(cm.textSize('sm'), 'space-y-1')}>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <dt className="text-on-surface-variant">
              {t('settings.platform', {}, { defaultValue: 'Platform' })}
            </dt>
            <dd>{deviceInfo.os.name || unknown}</dd>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <dt className="text-on-surface-variant">
              {t('settings.browser', {}, { defaultValue: 'Browser' })}
            </dt>
            <dd>{deviceInfo.browser.name || unknown}</dd>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <dt className="text-on-surface-variant">
              {t('settings.network', {}, { defaultValue: 'Network' })}
            </dt>
            <dd>
              {navigator.onLine
                ? t('settings.online', {}, { defaultValue: 'Online' })
                : t('settings.offline', {}, { defaultValue: 'Offline' })}
            </dd>
          </div>
        </dl>
      </div>

      <div className={cm.cn('space-y-2')}>
        <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
          {t('settings.registeredDevices', {}, { defaultValue: 'Registered devices' })}
        </h3>
        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : devices.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('settings.noDevices', {}, { defaultValue: 'No registered devices.' })}
          </p>
        ) : (
          <ul className={cm.cn('space-y-1')}>
            {devices.map((device) => (
              <li key={device.id} className={cm.cn(cm.textSize('sm'), cm.sp('py', 1))}>
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <span>
                    {device.name ||
                      t('settings.unnamedDevice', {}, { defaultValue: 'Unnamed device' })}
                    {device.isCurrent ? (
                      <span className={cm.cn(cm.textSize('xs'), cm.textPrimary, cm.sp('ml', 2))}>
                        {t('settings.thisDevice', {}, { defaultValue: 'This device' })}
                      </span>
                    ) : null}
                  </span>
                  {device.isCurrent ? null : confirmingId === device.id ? (
                    <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                      <button
                        type="button"
                        disabled={revokingId === device.id}
                        onClick={() => setConfirmingId(null)}
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          'rounded-md border border-outline-variant disabled:opacity-60',
                        )}
                      >
                        {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                      </button>
                      <button
                        type="button"
                        disabled={revokingId === device.id}
                        onClick={() => void revoke(device.id)}
                        data-mol-id="device-revoke-confirm"
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          cm.fontWeight('medium'),
                          'rounded-md bg-error text-on-error disabled:opacity-60',
                        )}
                      >
                        {revokingId === device.id
                          ? t('settings.signingOutDevice', {}, { defaultValue: 'Signing out…' })
                          : t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(device.id)}
                      data-mol-id="device-revoke"
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        cm.fontWeight('medium'),
                        'rounded-md text-error hover:bg-error/10',
                      )}
                    >
                      {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                    </button>
                  )}
                </div>
                {confirmingId === device.id ? (
                  <p
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}
                  >
                    {t(
                      'settings.revokeDeviceWarning',
                      {},
                      {
                        defaultValue: "This device's access will be revoked shortly. Sign it out?",
                      },
                    )}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

/**
 * Danger zone — permanently delete the account. Confirms with the user's
 * password (matching the shared LogOutDeleteSection contract), then
 * DELETE /api/users/:id → logout → /login. Mirrors the app's existing
 * destructive-action pattern (see MedicationDetail's delete flow).
 */
function DangerZone({ userId }: { userId: string }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { logout } = useAuth()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await http.delete(`/api/users/${userId}`, { data: { password } })
      await logout()
      navigate('/login', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.failedToDeleteAccount', {}, { defaultValue: 'Could not delete account.' }),
      )
      setSubmitting(false)
    }
  }

  return (
    <section className={cm.cn(cm.card(), cm.sp('p', 5), 'border border-error space-y-4')}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-error')}>
        {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
      </h2>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t(
          'settings.deleteAccountModal.warning',
          {},
          {
            defaultValue:
              'Permanently delete your account and all medication, schedule, and adherence data. This cannot be undone.',
          },
        )}
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'border border-error text-error rounded-md hover:bg-error/10',
          )}
        >
          {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
        </button>
      ) : (
        <form onSubmit={submit} className={cm.cn('space-y-3')}>
          <Field
            label={t(
              'settings.deleteAccountModal.password',
              {},
              { defaultValue: 'Enter your password to confirm' },
            )}
            value={password}
            onChange={setPassword}
            type="password"
          />
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <button
              type="submit"
              disabled={submitting}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'bg-error text-on-error rounded-md disabled:opacity-60',
              )}
            >
              {submitting
                ? t('settings.deleteAccountModal.deleting', {}, { defaultValue: 'Deleting…' })
                : t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setPassword('')
                setError(null)
              }}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'border border-outline-variant rounded-md',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      )}

      {error ? (
        <p role="status" aria-live="polite" className={cm.cn(cm.textSize('sm'), 'text-error')}>
          {error}
        </p>
      ) : null}
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}
