import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface AuthMe {
  id?: string
}

function AccountSettingsSection() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const cm = getClassMap()
  const http = useHttpClient()
  const { user, logout } = useAuth<AuthMe>()
  const [showPassword, setShowPassword] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      setPwError(
        t(
          'accountSettings.passwordTooShort',
          {},
          { defaultValue: 'Password must be at least 8 characters.' },
        ),
      )
      return
    }
    if (!user?.id) {
      setPwError(
        t('accountSettings.passwordError', {}, { defaultValue: 'Could not change password.' }),
      )
      return
    }
    setPwSaving(true)
    setPwError(null)
    try {
      await http.patch(`/api/users/${user.id}/password`, {
        currentPassword,
        newPassword,
      })
      setPwSaved(true)
      setCurrentPassword('')
      setNewPassword('')
      setTimeout(() => {
        setPwSaved(false)
        setShowPassword(false)
      }, 1500)
    } catch (err) {
      setPwError(
        err instanceof Error
          ? err.message
          : t('accountSettings.passwordError', {}, { defaultValue: 'Could not change password.' }),
      )
    } finally {
      setPwSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!user?.id) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await http.delete(`/api/users/${user.id}`)
      try {
        await logout()
      } catch (_error) {
        // Ignore logout errors — user row is gone, redirect anyway.
      }
      navigate('/signup')
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : t('accountSettings.deleteError', {}, { defaultValue: 'Could not delete account.' }),
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section
      className={cm.cn(cm.sp('p', 10), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
      data-testid="account-settings"
    >
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }), 'md:flex-row')}>
        <div className={cm.cn(cm.w('full'), cm.stack(2), 'md:w-1/3')}>
          <h3
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'text-on-background tracking-tight',
            )}
          >
            {t('accountSettingsSection.heading', {}, { defaultValue: 'Account & Security' })}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'accountSettingsSection.description',
              {},
              { defaultValue: 'Manage your security credentials and account status.' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.w('full'), cm.stack(8), 'md:w-2/3')}>
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <div>
              <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-background')}>
                {t('auth.login.password', {}, { defaultValue: 'Password' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'accountSettingsSection.passwordDescription',
                  {},
                  { defaultValue: 'Use at least 8 characters with a mix of letters and numbers.' },
                )}
              </p>
            </div>
            <button
              type="button"
              data-testid="account-change-password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textPrimary,
                'rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-colors',
              )}
            >
              {t('settings.changePasswordModal.title', {}, { defaultValue: 'Change Password' })}
            </button>
          </div>

          {showPassword && (
            <div
              className={cm.cn(cm.stack(4), cm.sp('p', 6), 'rounded-xl bg-surface-container-low')}
            >
              {pwError && (
                <p
                  role="alert"
                  className={cm.cn(cm.textSize('sm'), 'text-error')}
                  data-testid="account-password-error"
                >
                  {pwError}
                </p>
              )}
              <div className={cm.stack(2)}>
                <label
                  htmlFor="account-current-password"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'text-on-surface-variant uppercase tracking-wider',
                  )}
                >
                  {t(
                    'settings.changePasswordModal.currentPassword',
                    {},
                    { defaultValue: 'Current Password' },
                  )}
                </label>
                <input
                  id="account-current-password"
                  data-testid="account-current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.h(11),
                    cm.sp('px', 4),
                    'rounded-lg bg-surface outline-none focus:ring-2 focus:ring-primary',
                  )}
                />
              </div>
              <div className={cm.stack(2)}>
                <label
                  htmlFor="account-new-password"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'text-on-surface-variant uppercase tracking-wider',
                  )}
                >
                  {t(
                    'settings.changePasswordModal.newPassword',
                    {},
                    { defaultValue: 'New Password' },
                  )}
                </label>
                <input
                  id="account-new-password"
                  data-testid="account-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.h(11),
                    cm.sp('px', 4),
                    'rounded-lg bg-surface outline-none focus:ring-2 focus:ring-primary',
                  )}
                />
              </div>
              <div className={cm.cn(cm.flex({ justify: 'end', gap: 'md', align: 'center' }))}>
                {pwSaved && (
                  <span
                    className={cm.cn(cm.textSize('sm'), 'text-success')}
                    role="status"
                    data-testid="account-password-saved"
                  >
                    {t('common.saved', {}, { defaultValue: 'Saved' })}
                  </span>
                )}
                <button
                  type="button"
                  data-testid="account-change-password-submit"
                  disabled={pwSaving || !newPassword}
                  onClick={handleChangePassword}
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 2.5),
                    cm.fontWeight('semibold'),
                    'rounded-lg text-on-primary brand-gradient disabled:opacity-50',
                  )}
                >
                  {pwSaving
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t(
                        'auth.resetPassword.updatePassword',
                        {},
                        { defaultValue: 'Update password' },
                      )}
                </button>
              </div>
            </div>
          )}

          <div className={cm.cn(cm.sp('p', 6), cm.stack(4), 'rounded-xl bg-error-container/30')}>
            <div>
              <p className={cm.cn(cm.fontWeight('bold'), 'text-error')}>
                {t('accountSettingsSection.dangerZoneTitle', {}, { defaultValue: 'Danger Zone' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                {t(
                  'accountSettingsSection.deleteWarning',
                  {},
                  {
                    defaultValue:
                      'Once you delete your account, there is no going back. Please be certain.',
                  },
                )}
              </p>
            </div>
            {!showDelete ? (
              <div>
                <button
                  type="button"
                  data-testid="account-delete-toggle"
                  onClick={() => setShowDelete(true)}
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    'rounded-lg bg-error text-on-error hover:bg-error/90 transition-colors',
                  )}
                >
                  {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
                </button>
              </div>
            ) : (
              <div className={cm.stack(3)}>
                {deleteError && (
                  <p
                    role="alert"
                    className={cm.cn(cm.textSize('sm'), 'text-error')}
                    data-testid="account-delete-error"
                  >
                    {deleteError}
                  </p>
                )}
                <label
                  htmlFor="account-delete-confirm"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'text-on-surface-variant uppercase tracking-wider',
                  )}
                >
                  {t(
                    'accountSettings.confirmEmailLabel',
                    {},
                    { defaultValue: 'Type DELETE to confirm' },
                  )}
                </label>
                <input
                  id="account-delete-confirm"
                  data-testid="account-delete-confirm"
                  type="text"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.h(11),
                    cm.sp('px', 4),
                    'rounded-lg bg-surface outline-none focus:ring-2 focus:ring-error',
                  )}
                />
                <div className={cm.cn(cm.flex({ justify: 'end', gap: 'md' }))}>
                  <button
                    type="button"
                    data-testid="account-delete-cancel"
                    onClick={() => {
                      setShowDelete(false)
                      setConfirmEmail('')
                      setDeleteError(null)
                    }}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 2.5),
                      cm.fontWeight('semibold'),
                      'rounded-lg text-on-surface-variant hover:bg-surface-container-high',
                    )}
                  >
                    {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                  </button>
                  <button
                    type="button"
                    data-testid="account-delete-confirm-button"
                    disabled={deleting || confirmEmail !== 'DELETE'}
                    onClick={handleDelete}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 2.5),
                      cm.fontWeight('semibold'),
                      'rounded-lg text-on-error bg-error disabled:opacity-50',
                    )}
                  >
                    {deleting
                      ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
                      : t(
                          'accountSettings.confirmDelete',
                          {},
                          { defaultValue: 'Permanently delete' },
                        )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default AccountSettingsSection
export { AccountSettingsSection }
