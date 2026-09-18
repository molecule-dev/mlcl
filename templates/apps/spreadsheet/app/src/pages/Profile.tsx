import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WorkbenchLayout } from '../components/WorkbenchLayout.js'

interface AppUser {
  id: string
  name?: string
  email?: string
  created_at?: string
}

function initials(name?: string | null, email?: string | null): string {
  const src = (name ?? email ?? '').trim()
  if (!src) return 'ME'
  const parts = src.split(/\s+|[._@-]/).filter(Boolean)
  const a = parts[0]?.[0] ?? ''
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? ''
  return (a + b).toUpperCase().slice(0, 2) || 'ME'
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { user, logout, setUser } = useAuth<AppUser>()

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
  }, [user?.name, user?.email])

  async function saveProfile() {
    if (!user?.id) return
    setSaving(true)
    setError(null)
    try {
      const res = await http.patch<AppUser | { props?: AppUser }>(`/users/${user.id}`, {
        name: name.trim(),
        email: email.trim(),
      })
      const updated = (res.data as { props?: AppUser })?.props ?? (res.data as AppUser | null)
      if (updated) {
        setUser({ ...user, ...updated, name: name.trim(), email: email.trim() })
      } else {
        setUser({ ...user, name: name.trim(), email: email.trim() })
      }
      setSavedAt(Date.now())
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  async function deleteAccount() {
    if (!user?.id || !deletePassword) return
    setDeleting(true)
    setError(null)
    try {
      await http.delete(`/users/${user.id}`, { data: { password: deletePassword } })
      await logout()
      navigate('/signup', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setDeleting(false)
    }
  }

  const initialsValue = initials(user?.name, user?.email)

  return (
    <WorkbenchLayout>
      <div>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('lg'), 'text-on-surface-variant')}>
          {t('profile.subhead', {}, { defaultValue: 'Personal info and account-level controls.' })}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className={cm.cn('p-4 rounded-2xl text-sm bg-error-container/40 text-error')}
        >
          {error}
        </div>
      )}

      <section
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'md' }),
          cm.sp('p', 8),
          'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(20),
              cm.h(20),
              'rounded-full text-2xl font-extrabold text-on-primary bg-primary',
            )}
            aria-hidden="true"
          >
            {initialsValue}
          </span>
          <div className={cm.cn(cm.flex1, 'min-w-0')}>
            <h2
              className={cm.cn(
                cm.textSize('2xl'),
                'font-extrabold tracking-tight text-on-surface truncate',
              )}
            >
              {user?.name ||
                user?.email ||
                t('nav.yourAccount', {}, { defaultValue: 'Your account' })}
            </h2>
            <p className={'text-sm text-on-surface-variant truncate font-mono'}>
              {user?.email ?? '—'}
            </p>
            {user?.created_at && (
              <p
                className={
                  'text-xs text-on-surface-variant uppercase tracking-widest font-bold mt-1'
                }
              >
                {t(
                  'profile.memberSince',
                  { date: new Date(user.created_at).toLocaleDateString() },
                  { defaultValue: 'Member since {{date}}' },
                )}
              </p>
            )}
          </div>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={
                'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-on-surface-variant rounded-full border border-outline-variant hover:border-primary hover:text-primary transition-colors'
              }
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                edit
              </span>
              {t('nav.editProfile', {}, { defaultValue: 'Edit profile' })}
            </button>
          )}
        </div>

        {editing && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void saveProfile()
            }}
            className={cm.cn(cm.stack(4), cm.sp('mt', 4))}
          >
            <div className={cm.stack(2)}>
              <label
                htmlFor="profile-name"
                className={'text-xs font-bold uppercase tracking-widest text-on-surface-variant'}
              >
                {t('form.fullName', {}, { defaultValue: 'Full name' })}
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface-container-low rounded-xl border-0 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none',
                )}
              />
            </div>
            <div className={cm.stack(2)}>
              <label
                htmlFor="profile-email"
                className={'text-xs font-bold uppercase tracking-widest text-on-surface-variant'}
              >
                {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface-container-low rounded-xl border-0 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none',
                )}
              />
            </div>
            <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
              <button
                type="submit"
                disabled={saving}
                className={
                  'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-on-primary rounded-full bg-primary hover:bg-primary-dark transition-colors disabled:opacity-60'
                }
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setName(user?.name ?? '')
                  setEmail(user?.email ?? '')
                }}
                className={
                  'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-on-surface-variant rounded-full border border-outline-variant hover:border-primary hover:text-primary transition-colors'
                }
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
            </div>
            {savedAt && !editing === false && (
              <p className={'text-xs text-success'} role="status">
                {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
              </p>
            )}
          </form>
        )}
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 8),
          'rounded-2xl border-2 border-dashed border-error/40 bg-error-container/30',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-error')}>
          {t('nav.dangerZone', {}, { defaultValue: 'Danger zone' })}
        </h2>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'profile.danger.subhead',
            {},
            { defaultValue: 'Delete your account. This action is irreversible.' },
          )}
        </p>
        {showDelete ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void deleteAccount()
            }}
            className={cm.cn(cm.stack(3), cm.sp('mt', 4))}
          >
            <label
              htmlFor="delete-pw"
              className={'text-xs font-bold uppercase tracking-widest text-on-surface-variant'}
            >
              {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
            </label>
            <input
              id="delete-pw"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'bg-surface-container-low rounded-xl border-0 focus:bg-surface-container-lowest focus:ring-2 focus:ring-error/30 outline-none',
              )}
            />
            <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
              <button
                type="submit"
                disabled={!deletePassword || deleting}
                className={
                  'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full bg-error text-on-error hover:bg-error-hover transition-colors disabled:opacity-50'
                }
              >
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  delete_forever
                </span>
                {deleting
                  ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
                  : t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDelete(false)
                  setDeletePassword('')
                }}
                className={
                  'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-on-surface-variant rounded-full border border-outline-variant'
                }
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
            </div>
          </form>
        ) : (
          <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 4))}>
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className={
                'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full bg-error text-on-error hover:bg-error-hover transition-colors'
              }
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                delete_forever
              </span>
              {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
            </button>
          </div>
        )}
      </section>
    </WorkbenchLayout>
  )
}

export default Profile
