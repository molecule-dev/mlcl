import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation, useUser } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface User {
  id: string
  name?: string | null
  email?: string | null
  phone?: string | null
  oauthData?: { preferences?: Record<string, unknown> }
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const user = useUser<User>()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [emergencySaving, setEmergencySaving] = useState(false)
  const [emergencyStatus, setEmergencyStatus] = useState<string | null>(null)
  const [emergencyError, setEmergencyError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setName(user.name ?? '')
      setEmail(user.email ?? '')
      setPhone(user.phone ?? '')
    }
  }, [user])

  // Emergency contact lives in the app's own table (not the shared users
  // resource, whose update schema whitelists a fixed field set).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await http.get<{ data?: { contact_name?: string; contact_phone?: string } }>(
          '/api/emergency-contact',
        )
        if (cancelled || !res.data?.data) return
        setEmergencyName(res.data.data.contact_name ?? '')
        setEmergencyPhone(res.data.data.contact_phone ?? '')
      } catch (loadError) {
        logError('profile.emergencyContactLoad', loadError)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http])

  const handleSaveEmergency = useCallback(async () => {
    if (!user?.id) return
    setEmergencySaving(true)
    setEmergencyError(null)
    setEmergencyStatus(null)
    try {
      await http.put('/api/emergency-contact', {
        contact_name: emergencyName,
        contact_phone: emergencyPhone,
      })
      setEmergencyStatus(
        t('profile.emergencySaved', {}, { defaultValue: 'Emergency contact saved.' }),
      )
    } catch (saveError) {
      logError('profile.emergencyContactSave', saveError)
      setEmergencyError(
        t(
          'profile.emergencySaveFailed',
          {},
          { defaultValue: 'Could not save the emergency contact.' },
        ),
      )
    } finally {
      setEmergencySaving(false)
    }
  }, [http, user, emergencyName, emergencyPhone, t])

  const handleSave = useCallback(async () => {
    if (!user?.id) return
    setSaving(true)
    setError(null)
    setStatus(null)
    try {
      await http.patch(`/api/users/${user.id}`, { name, email, phone })
      setStatus(t('common.profileSavedPeriod', {}, { defaultValue: 'Profile saved.' }))
    } catch (error) {
      logError('profile.save', error)
      setError(t('common.couldNotSaveProfile', {}, { defaultValue: 'Could not save profile.' }))
    } finally {
      setSaving(false)
    }
  }, [http, user, name, email, phone, t])

  const initials = (name || user?.email || '??')
    .split(/[\s@]/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'lg' }),
          cm.sp('p', 8),
          'rounded-3xl bg-gradient-to-br from-primary-container to-surface-container-lowest',
        )}
      >
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(20),
            cm.h(20),
            cm.roundedFull,
            'bg-gradient-to-br from-primary to-tertiary text-on-primary text-3xl font-extrabold font-display shadow-lg shadow-primary/20',
          )}
        >
          {initials}
        </span>
        <div className={cm.flex1}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('profile.eyebrow', {}, { defaultValue: 'Personal account' })}
          </p>
          <h1
            data-testid="profile-name"
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight font-display')}
          >
            {name || t('profile.untitled', {}, { defaultValue: 'No name set' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{email}</p>
        </div>
      </header>

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-2')}>
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
            cm.stack(5),
          )}
        >
          <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold font-display')}>
            {t('profile.personal', {}, { defaultValue: 'Personal info' })}
          </h2>
          <Field
            id="full-name"
            label={t('form.fullName', {}, { defaultValue: 'Full name' })}
            value={name}
            onChange={setName}
          />
          <Field
            id="email"
            type="email"
            label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            value={email}
            onChange={setEmail}
          />
          <Field
            id="phone"
            type="tel"
            label={t('form.phone', {}, { defaultValue: 'Phone' })}
            value={phone}
            onChange={setPhone}
          />
          {error ? (
            <p data-testid="profile-error" className={cm.cn(cm.textSize('sm'), 'text-error')}>
              {error}
            </p>
          ) : null}
          {status ? (
            <p data-testid="profile-success" className={cm.cn(cm.textSize('sm'), 'text-primary')}>
              {status}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !user?.id}
            data-testid="profile-save"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50',
            )}
          >
            {saving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('common.saveProfile', {}, { defaultValue: 'Save profile' })}
          </button>
        </div>

        <div
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
            cm.stack(5),
          )}
        >
          <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold font-display')}>
            {t('nav.security', {}, { defaultValue: 'Security' })}
          </h2>
          <Link
            to="/forgot-password"
            data-testid="profile-change-password"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'block border border-outline-variant rounded-full hover:bg-surface-container-low transition-colors text-left',
            )}
          >
            {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </Link>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'profile.changePasswordHint',
              {},
              { defaultValue: 'You will be sent a reset link to your email.' },
            )}
          </p>
        </div>

        {/* Emergency contact (design: medical_services card) */}
        <div
          data-testid="emergency-contact-card"
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
            cm.stack(5),
          )}
        >
          <h2
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('xl'),
              'font-extrabold font-display',
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'h-8 w-8 rounded-lg bg-primary/10 shrink-0',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-lg text-primary')}>
                medical_services
              </span>
            </span>
            {t('profile.emergency', {}, { defaultValue: 'Emergency Contact' })}
          </h2>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'profile.emergencyHint',
              {},
              {
                defaultValue:
                  'Who should the restaurant call if something happens during your visit?',
              },
            )}
          </p>
          <Field
            id="emergency-name"
            label={t('profile.emergencyName', {}, { defaultValue: 'Name' })}
            value={emergencyName}
            onChange={setEmergencyName}
          />
          <Field
            id="emergency-phone"
            type="tel"
            label={t('form.phone', {}, { defaultValue: 'Phone' })}
            value={emergencyPhone}
            onChange={setEmergencyPhone}
          />
          {emergencyError ? (
            <p data-testid="emergency-error" className={cm.cn(cm.textSize('sm'), 'text-error')}>
              {emergencyError}
            </p>
          ) : null}
          {emergencyStatus ? (
            <p data-testid="emergency-success" className={cm.cn(cm.textSize('sm'), 'text-primary')}>
              {emergencyStatus}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleSaveEmergency}
            disabled={emergencySaving || !user?.id}
            data-testid="emergency-save"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50 self-start',
            )}
          >
            {emergencySaving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('profile.emergencySave', {}, { defaultValue: 'Save emergency contact' })}
          </button>
        </div>
      </section>
    </div>
  )
}

interface FieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}

function Field({ id, label, value, onChange, type = 'text' }: FieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-1.5')}>
      <label
        htmlFor={id}
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          'bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-0',
        )}
      />
    </div>
  )
}
