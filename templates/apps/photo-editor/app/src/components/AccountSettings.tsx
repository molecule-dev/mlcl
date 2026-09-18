/**
 * Lustra account-management cards for the Settings page.
 *
 * The shared `@molecule/app-settings-panel-react` sections are not a
 * dependency of this app, so these flows are wired directly against the
 * standard auth client + API endpoints, mirroring AccountSection /
 * AuthSection / LogOutDeleteSection behaviour but styled to match the
 * Lustra dark-workspace surface cards used across Settings.
 *
 *  - Account (C6):  edit email          → PATCH /users/:id { email }
 *  - Security (C4): change password      → useChangePassword()
 *  - Devices (C7):  registered devices   → GET /devices
 *  - Danger (C10):  delete account       → DELETE /users/:id { password }
 *
 * Sign out (C9) already lives in PhotoEditorLayout's sidebar, so it is
 * intentionally not duplicated here.
 */
import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import {
  useAuth,
  useAuthClient,
  useChangePassword,
  useHttpClient,
  useTranslation,
} from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface Device {
  id: string
  name?: string
  platform?: string
  lastSeen?: string
  /** `true` for the device making the current request (the API marks it). */
  isCurrent?: boolean
}

const CARD = 'rounded-2xl bg-[var(--photo-surface)] border border-[var(--photo-border)] p-6'
const EYEBROW =
  'text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--photo-panel-text-accent)]'
const TITLE = 'text-xl font-bold tracking-tight text-[var(--photo-text)] mt-1'
const BODY = 'text-sm text-[var(--photo-text-muted)] mt-1 max-w-md'
const LABEL =
  'block text-[11px] font-mono uppercase tracking-widest text-[var(--photo-text-muted)] mb-1.5'
const FIELD =
  'w-full rounded-lg bg-[var(--photo-surface-elevated)] border border-[var(--photo-border)] px-3 py-2 text-sm text-[var(--photo-text)] outline-none focus:border-[var(--photo-accent)] transition-colors'
const BTN_PRIMARY =
  'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-[var(--photo-accent)] to-[var(--photo-danger)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed'
const BTN_OUTLINE =
  'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--photo-text)] border border-[var(--photo-border)] hover:bg-[var(--photo-surface-elevated)] transition-colors disabled:opacity-50'
const BTN_DANGER =
  'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-[var(--photo-danger)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed'

function LustraModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const cm = getClassMap()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    globalThis.addEventListener('keydown', onKey)
    return () => globalThis.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className={cm.cn('fixed inset-0 z-50 flex items-center justify-center p-4')}>
      <div
        className={cm.cn('absolute inset-0 bg-black/60 backdrop-blur-sm')}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cm.cn(
          'relative z-10 w-full max-w-md rounded-2xl bg-[var(--photo-surface)] border border-[var(--photo-border)] p-6 shadow-2xl',
        )}
      >
        <h3 className={cm.cn('text-lg font-bold tracking-tight text-[var(--photo-text)] mb-4')}>
          {title}
        </h3>
        {children}
      </div>
    </div>
  )
}

export function AccountSettings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user, logout } = useAuth<UserProfile>()
  const authClient = useAuthClient<UserProfile>()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { status: pwStatus, error: pwError, changePassword, reset: resetPw } = useChangePassword()

  // C6 — email -------------------------------------------------------------
  const [email, setEmail] = useState(user?.email ?? '')
  const [emailTouched, setEmailTouched] = useState(false)
  const [emailState, setEmailState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [emailError, setEmailError] = useState('')

  useEffect(() => {
    // Adopt the profile email once it loads, unless the user already typed.
    if (!emailTouched && user?.email) setEmail(user.email)
  }, [user?.email, emailTouched])

  // C6 — display name ------------------------------------------------------
  const [name, setName] = useState(user?.name ?? '')
  const [nameTouched, setNameTouched] = useState(false)
  const [nameState, setNameState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    // Adopt the profile name once it loads, unless the user already typed.
    if (!nameTouched && user?.name) setName(user.name)
  }, [user?.name, nameTouched])

  const handleSaveName = async (): Promise<void> => {
    const current = authClient.getState().user
    if (name === (current?.name ?? '')) return
    setNameState('saving')
    setNameError('')
    try {
      await http.patch(`/users/${current?.id}`, { name })
      if (current) authClient.setUser({ ...current, name })
      setNameState('saved')
      setNameTouched(false)
    } catch (err) {
      setNameError(
        err instanceof Error
          ? err.message
          : t('settings.account.nameError', {}, { defaultValue: 'Could not update your name.' }),
      )
      setNameState('idle')
    }
  }

  const handleSaveEmail = async (): Promise<void> => {
    const current = authClient.getState().user
    if (!email || email === current?.email) return
    setEmailState('saving')
    setEmailError('')
    try {
      await http.patch(`/users/${current?.id}`, { email })
      if (current) authClient.setUser({ ...current, email })
      setEmailState('saved')
      setEmailTouched(false)
    } catch (err) {
      setEmailError(
        err instanceof Error
          ? err.message
          : t('settings.account.emailError', {}, { defaultValue: 'Could not update your email.' }),
      )
      setEmailState('idle')
    }
  }

  // C4 — change password ---------------------------------------------------
  const [showPwModal, setShowPwModal] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const handleChangePassword = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    try {
      await changePassword(currentPw, newPw)
      setShowPwModal(false)
      setCurrentPw('')
      setNewPw('')
      setPwSuccess(true)
      resetPw()
    } catch (_error) {
      // Error surfaced via the useChangePassword hook's `error`; the modal
      // stays open so the user can retry.
    }
  }

  // C7 — devices -----------------------------------------------------------
  const [devices, setDevices] = useState<Device[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const loadDevices = useCallback(async (): Promise<void> => {
    try {
      const resp = await http.get<{ data?: Device[] } | Device[]>('/devices')
      const body = resp.data
      const list = Array.isArray(body) ? body : (body?.data ?? [])
      setDevices(list)
    } catch (_error) {
      // Devices endpoint is optional; the section renders empty when unavailable.
    } finally {
      setDevicesLoading(false)
    }
  }, [http])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  // Revoking deletes the device row (DELETE /devices/:id). The API's
  // authorization layer enforces server-side revocation, so the removed
  // device is actually signed out — not just hidden from the list.
  const revokeDevice = async (id: string): Promise<void> => {
    setRevokingId(id)
    try {
      await http.delete(`/devices/${id}`)
      setConfirmingId(null)
      await loadDevices()
    } catch (_error) {
      // Best-effort — keep the row so the user can retry the revoke.
    } finally {
      setRevokingId(null)
    }
  }

  // C10 — delete account ---------------------------------------------------
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePw, setDeletePw] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleDelete = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const current = authClient.getState().user
    setDeleting(true)
    setDeleteError('')
    try {
      await http.delete(`/users/${current?.id}`, { data: { password: deletePw } })
      await logout()
      navigate('/login', { replace: true })
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : t(
              'settings.account.deleteError',
              {},
              { defaultValue: 'Could not delete your account. Check your password and try again.' },
            ),
      )
      setDeleting(false)
    }
  }

  const emailDirty = email !== (user?.email ?? '') && email.length > 0

  return (
    <div
      className={cm.cn('grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6')}
      data-mol-id="settings-account"
    >
      {/* C6 — Account / email */}
      <section className={cm.cn(CARD)}>
        <p className={cm.cn(EYEBROW)}>
          {t('settings.account.eyebrow', {}, { defaultValue: '// account' })}
        </p>
        <h3 className={cm.cn(TITLE)}>
          {t('settings.account.title', {}, { defaultValue: 'Account' })}
        </h3>
        <p className={cm.cn(BODY)}>
          {t(
            'settings.account.body',
            { appName: APP_NAME },
            { defaultValue: 'The email tied to your {{appName}} workspace and sign-in.' },
          )}
        </p>
        <div className={cm.cn('mt-5')}>
          <label htmlFor="account-name" className={cm.cn(LABEL)}>
            {t('settings.account.name', {}, { defaultValue: 'Display name' })}
          </label>
          <input
            id="account-name"
            type="text"
            value={name}
            onChange={(e) => {
              setNameTouched(true)
              setName(e.target.value)
              setNameState('idle')
            }}
            onBlur={handleSaveName}
            className={cm.cn(FIELD)}
            autoComplete="name"
            data-mol-id="account-name-input"
          />
          {nameError && (
            <p
              className={cm.cn('text-xs mt-2 text-[var(--mol-color-error)]')}
              data-mol-id="account-name-error"
            >
              {nameError}
            </p>
          )}
          {nameState === 'saving' && (
            <p
              className={cm.cn('text-xs mt-2 text-[var(--photo-text-muted)]')}
              data-mol-id="account-name-saving"
            >
              {t('settings.account.nameSaving', {}, { defaultValue: 'Saving…' })}
            </p>
          )}
          {nameState === 'saved' && (
            <p
              className={cm.cn('text-xs mt-2 text-[var(--mol-color-success)]')}
              data-mol-id="account-name-saved"
            >
              {t('settings.account.nameSaved', {}, { defaultValue: 'Name updated.' })}
            </p>
          )}
        </div>
        <div className={cm.cn('mt-4')}>
          <label htmlFor="account-email" className={cm.cn(LABEL)}>
            {t('settings.account.email', {}, { defaultValue: 'Email address' })}
          </label>
          <input
            id="account-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmailTouched(true)
              setEmail(e.target.value)
              setEmailState('idle')
            }}
            className={cm.cn(FIELD)}
            autoComplete="email"
            data-mol-id="account-email-input"
          />
          {emailError && (
            <p
              className={cm.cn('text-xs mt-2 text-[var(--mol-color-error)]')}
              data-mol-id="account-email-error"
            >
              {emailError}
            </p>
          )}
          {emailState === 'saved' && !emailDirty && (
            <p
              className={cm.cn('text-xs mt-2 text-[var(--mol-color-success)]')}
              data-mol-id="account-email-saved"
            >
              {t('settings.account.emailSaved', {}, { defaultValue: 'Email updated.' })}
            </p>
          )}
          <div className={cm.cn('mt-4')}>
            <button
              type="button"
              onClick={handleSaveEmail}
              disabled={!emailDirty || emailState === 'saving'}
              className={cm.cn(BTN_PRIMARY)}
              data-mol-id="account-email-save"
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                save
              </span>
              {emailState === 'saving'
                ? t('settings.account.emailSaving', {}, { defaultValue: 'Saving…' })
                : t('settings.account.emailSave', {}, { defaultValue: 'Save email' })}
            </button>
          </div>
        </div>
      </section>

      {/* C4 — Security / password */}
      <section className={cm.cn(CARD)}>
        <p className={cm.cn(EYEBROW)}>
          {t('settings.security.eyebrow', {}, { defaultValue: '// security' })}
        </p>
        <h3 className={cm.cn(TITLE)}>
          {t('settings.security.title', {}, { defaultValue: 'Password' })}
        </h3>
        <p className={cm.cn(BODY)}>
          {t(
            'settings.security.body',
            { appName: APP_NAME },
            { defaultValue: 'Update the password you use to sign in to {{appName}}.' },
          )}
        </p>
        <div className={cm.cn('mt-5')}>
          <button
            type="button"
            onClick={() => {
              setPwSuccess(false)
              resetPw()
              setShowPwModal(true)
            }}
            className={cm.cn(BTN_OUTLINE)}
            data-mol-id="account-change-password"
          >
            <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
              lock
            </span>
            {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </button>
          {pwSuccess && (
            <p
              className={cm.cn('text-xs mt-3 text-[var(--mol-color-success)]')}
              data-mol-id="account-password-saved"
            >
              {t('settings.account.passwordSaved', {}, { defaultValue: 'Password changed.' })}
            </p>
          )}
        </div>
      </section>

      {/* C7 — Devices */}
      <section className={cm.cn(CARD)}>
        <p className={cm.cn(EYEBROW)}>
          {t('settings.devices.eyebrow', {}, { defaultValue: '// devices' })}
        </p>
        <h3 className={cm.cn(TITLE)}>
          {t('settings.devices.title', {}, { defaultValue: 'Devices' })}
        </h3>
        <p className={cm.cn(BODY)}>
          {t(
            'settings.devices.body',
            {},
            { defaultValue: 'Sessions currently signed in to your account.' },
          )}
        </p>
        {devicesLoading ? (
          <p
            className={cm.cn('text-sm italic text-[var(--photo-text-muted)] mt-4')}
            data-mol-id="account-devices-loading"
          >
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : devices.length === 0 ? (
          <p
            className={cm.cn('text-sm italic text-[var(--photo-text-muted)] mt-4')}
            data-mol-id="account-devices-empty"
          >
            {t('settings.devices.empty', {}, { defaultValue: 'No other devices on file.' })}
          </p>
        ) : (
          <ul
            className={cm.cn('divide-y divide-[var(--photo-border)] mt-3')}
            data-mol-id="account-devices-list"
          >
            {devices.map((device) => (
              <li
                key={device.id}
                className={cm.cn('py-3')}
                data-mol-id={`account-device-${device.id}`}
              >
                <div className={cm.cn('flex items-center justify-between gap-3')}>
                  <div className={cm.cn('flex items-center gap-3 min-w-0')}>
                    <span
                      className={cm.cn(
                        'material-symbols-outlined text-[18px] text-[var(--photo-text-muted)]',
                      )}
                      aria-hidden="true"
                    >
                      devices
                    </span>
                    <span className={cm.cn('text-sm text-[var(--photo-text)] truncate')}>
                      {device.name ||
                        device.platform ||
                        t('settings.devices.unknown', {}, { defaultValue: 'Unknown device' })}
                    </span>
                    {device.isCurrent && (
                      <span
                        className={cm.cn(
                          'text-[10px] font-mono uppercase tracking-widest text-[var(--photo-panel-text-accent)] shrink-0',
                        )}
                      >
                        {t('settings.devices.thisDevice', {}, { defaultValue: 'This device' })}
                      </span>
                    )}
                  </div>
                  <div className={cm.cn('flex items-center gap-3 shrink-0')}>
                    {device.lastSeen && (
                      <span
                        className={cm.cn(
                          'text-[10px] font-mono uppercase tracking-widest text-[var(--photo-text-muted)]',
                        )}
                      >
                        {device.lastSeen}
                      </span>
                    )}
                    {!device.isCurrent &&
                      (confirmingId === device.id ? (
                        <span className={cm.cn('flex items-center gap-2')}>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            disabled={revokingId === device.id}
                            className={cm.cn(
                              'text-xs px-3 py-1 rounded-md border border-[var(--photo-border)] text-[var(--photo-text)] hover:bg-[var(--photo-surface-elevated)] transition-colors disabled:opacity-50',
                            )}
                          >
                            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                          </button>
                          <button
                            type="button"
                            onClick={() => revokeDevice(device.id)}
                            disabled={revokingId === device.id}
                            className={cm.cn(
                              'text-xs font-bold px-3 py-1 rounded-md bg-[var(--photo-danger)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed',
                            )}
                            data-mol-id={`account-device-revoke-confirm-${device.id}`}
                          >
                            {revokingId === device.id
                              ? t(
                                  'settings.devices.signingOut',
                                  {},
                                  { defaultValue: 'Signing out…' },
                                )
                              : t('settings.devices.signOut', {}, { defaultValue: 'Sign out' })}
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingId(device.id)}
                          className={cm.cn(
                            'text-xs font-mono uppercase tracking-widest text-[var(--photo-text-muted)] hover:text-[var(--photo-danger)] transition-colors',
                          )}
                          data-mol-id={`account-device-revoke-${device.id}`}
                        >
                          {t('settings.devices.signOut', {}, { defaultValue: 'Sign out' })}
                        </button>
                      ))}
                  </div>
                </div>
                {confirmingId === device.id && (
                  <p
                    className={cm.cn('text-xs text-[var(--photo-text-muted)] mt-2 pl-[30px]')}
                    data-mol-id={`account-device-revoke-warning-${device.id}`}
                  >
                    {t(
                      'settings.devices.revokeWarning',
                      {},
                      {
                        defaultValue: "This device's access will be revoked shortly. Sign it out?",
                      },
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* C10 — Danger zone */}
      <section
        className={cm.cn(
          'rounded-2xl border border-[var(--photo-danger)]/40 bg-[var(--photo-danger)]/5 p-6 lg:col-span-2',
        )}
        data-mol-id="settings-danger-zone"
      >
        <p
          className={cm.cn(
            'text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--photo-danger)]',
          )}
        >
          {t('settings.danger.eyebrow', {}, { defaultValue: '// danger zone' })}
        </p>
        <h3 className={cm.cn(TITLE)}>
          {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
        </h3>
        <p className={cm.cn(BODY)}>
          {t(
            'settings.danger.body',
            {},
            {
              defaultValue:
                'Permanently delete your account, library, and edits. This cannot be undone.',
            },
          )}
        </p>
        <div className={cm.cn('mt-5')}>
          <button
            type="button"
            onClick={() => {
              setDeleteError('')
              setDeletePw('')
              setShowDeleteModal(true)
            }}
            className={cm.cn(BTN_DANGER)}
            data-mol-id="account-delete-account"
          >
            <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
              delete_forever
            </span>
            {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
          </button>
        </div>
      </section>

      {/* Change-password modal */}
      <LustraModal
        open={showPwModal}
        onClose={() => {
          setShowPwModal(false)
          resetPw()
        }}
        title={t('settings.changePasswordModal.title', {}, { defaultValue: 'Change password' })}
      >
        {pwError && (
          <p
            className={cm.cn(
              'text-sm mb-4 rounded-lg px-3 py-2 bg-[var(--photo-danger)]/10 text-[var(--mol-color-error)] border border-[var(--photo-danger)]/30',
            )}
            data-mol-id="account-password-error"
          >
            {pwError.message ||
              t(
                'settings.changePasswordModal.error',
                {},
                { defaultValue: 'Could not change password.' },
              )}
          </p>
        )}
        <form onSubmit={handleChangePassword} className={cm.cn('flex flex-col gap-4')}>
          <div>
            <label htmlFor="current-pw" className={cm.cn(LABEL)}>
              {t(
                'settings.changePasswordModal.currentPassword',
                {},
                { defaultValue: 'Current password' },
              )}
            </label>
            <input
              id="current-pw"
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              autoComplete="current-password"
              required
              className={cm.cn(FIELD)}
              data-mol-id="account-current-password"
            />
          </div>
          <div>
            <label htmlFor="new-pw" className={cm.cn(LABEL)}>
              {t('settings.changePasswordModal.newPassword', {}, { defaultValue: 'New password' })}
            </label>
            <input
              id="new-pw"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
              required
              className={cm.cn(FIELD)}
              data-mol-id="account-new-password"
            />
          </div>
          <div className={cm.cn('flex items-center justify-end gap-3 mt-2')}>
            <button
              type="button"
              onClick={() => {
                setShowPwModal(false)
                resetPw()
              }}
              className={cm.cn(BTN_OUTLINE)}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={pwStatus === 'pending'}
              className={cm.cn(BTN_PRIMARY)}
              data-mol-id="account-password-submit"
            >
              {pwStatus === 'pending'
                ? t('settings.changePasswordModal.changing', {}, { defaultValue: 'Changing…' })
                : t('settings.changePassword', {}, { defaultValue: 'Change password' })}
            </button>
          </div>
        </form>
      </LustraModal>

      {/* Delete-account modal */}
      <LustraModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('settings.deleteAccountModal.title', {}, { defaultValue: 'Delete account' })}
      >
        <p className={cm.cn('text-sm text-[var(--photo-text-muted)] mb-4')}>
          {t(
            'settings.deleteAccountModal.warning',
            {},
            {
              defaultValue:
                'This permanently deletes your account and all data. Enter your password to confirm.',
            },
          )}
        </p>
        {deleteError && (
          <p
            className={cm.cn(
              'text-sm mb-4 rounded-lg px-3 py-2 bg-[var(--photo-danger)]/10 text-[var(--mol-color-error)] border border-[var(--photo-danger)]/30',
            )}
            data-mol-id="account-delete-error"
          >
            {deleteError}
          </p>
        )}
        <form onSubmit={handleDelete} className={cm.cn('flex flex-col gap-4')}>
          <div>
            <label htmlFor="delete-pw" className={cm.cn(LABEL)}>
              {t('settings.deleteAccountModal.password', {}, { defaultValue: 'Password' })}
            </label>
            <input
              id="delete-pw"
              type="password"
              value={deletePw}
              onChange={(e) => setDeletePw(e.target.value)}
              autoComplete="current-password"
              required
              className={cm.cn(FIELD)}
              data-mol-id="account-delete-password"
            />
          </div>
          <div className={cm.cn('flex items-center justify-end gap-3 mt-2')}>
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className={cm.cn(BTN_OUTLINE)}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={deleting}
              className={cm.cn(BTN_DANGER)}
              data-mol-id="account-delete-confirm"
            >
              {deleting
                ? t('settings.deleteAccountModal.deleting', {}, { defaultValue: 'Deleting…' })
                : t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
            </button>
          </div>
        </form>
      </LustraModal>
    </div>
  )
}

export default AccountSettings
