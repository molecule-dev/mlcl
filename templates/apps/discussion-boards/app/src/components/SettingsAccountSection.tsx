/**
 * Template-local Account section for the /settings page.
 *
 * Replaces the shared `AccountSection` because of a contract mismatch:
 * the platform user resource REQUIRES `currentPassword` on any request
 * that changes a password-bearing account's email (the email is the
 * account-recovery anchor — changing it from a hijacked session must
 * not be silent), while the shared component never collects a password,
 * so every email edit died with a 400. This version reveals an inline
 * "current password" confirm step exactly when the server demands it,
 * then PATCHes `{ email, currentPassword }`. Name changes need no
 * password and behave like the shared section.
 */
import { type JSX, useEffect, useRef, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuthClient, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Flex, Input, Spinner } from '@molecule/app-ui-react'

interface ApiUserResponse {
  props?: UserProfile
  id?: string
  email?: string
  name?: string
}

export function SettingsAccountSection(): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const authClient = useAuthClient<UserProfile>()
  const http = useHttpClient()

  const cachedUser = authClient.getState().user
  const [email, setEmail] = useState(cachedUser?.email || '')
  const [name, setName] = useState(cachedUser?.name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const pendingEmailRef = useRef<string | null>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  // Refresh the current user via the canonical `/users/me` endpoint on
  // mount and push the result into the auth cache so reloads pick up
  // fresh data. Failures are silent — the cached profile is the fallback.
  useEffect(() => {
    let cancelled = false
    http
      .get<ApiUserResponse>('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const body = (res as { data?: ApiUserResponse }).data ?? (res as ApiUserResponse)
        const next = (body.props ?? body) as UserProfile | undefined
        if (next && typeof next === 'object' && (next as UserProfile).id) {
          authClient.setUser(next)
          setEmail((curr) =>
            curr === (cachedUser?.email || '') ? (next.email as string | undefined) || curr : curr,
          )
          setName((curr) =>
            curr === (cachedUser?.name || '') ? (next.name as string | undefined) || curr : curr,
          )
        }
      })
      .catch(() => {
        /* refresh is best-effort */
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, authClient])

  const saveName = async (value: string): Promise<void> => {
    const currentUser = authClient.getState().user
    if (value === (currentUser?.name || '')) return
    setSaving(true)
    setError('')
    try {
      await http.patch(`/api/users/${currentUser?.id}`, { name: value })
      if (currentUser) authClient.setUser({ ...currentUser, name: value })
      setSaved(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.failedToUpdateProfile', undefined, {
              defaultValue: 'Failed to update profile',
            }),
      )
      setName(currentUser?.name || '')
    } finally {
      setSaving(false)
    }
  }

  const saveEmail = async (value: string, password: string): Promise<void> => {
    const currentUser = authClient.getState().user
    if (!currentUser) return
    setSaving(true)
    setError('')
    try {
      await http.patch(`/api/users/${currentUser.id}`, {
        email: value,
        currentPassword: password,
      })
      authClient.setUser({ ...currentUser, email: value })
      // Change committed — collapse the password step until the next change.
      setNeedsPassword(false)
      setCurrentPassword('')
      pendingEmailRef.current = null
      setSaved(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      // The server demands re-authentication (or the password was wrong):
      // reveal the inline confirm step and let the user retry. The typed
      // email is kept so nothing the user wrote is silently reverted.
      if (/password/i.test(message)) {
        setNeedsPassword(true)
        setError(
          /incorrect|wrong|invalid/i.test(message)
            ? message
            : t('settings.currentPasswordRequired', undefined, {
                defaultValue: 'Confirm this change with your current password.',
              }),
        )
        requestAnimationFrame(() => passwordRef.current?.focus())
      } else {
        setError(
          message ||
            t('settings.failedToUpdateProfile', undefined, {
              defaultValue: 'Failed to update profile',
            }),
        )
        setEmail(currentUser.email || '')
      }
    } finally {
      setSaving(false)
    }
  }

  const onEmailBlur = (): void => {
    const currentUser = authClient.getState().user
    if (!currentUser || email === (currentUser.email || '') || !email.trim()) return
    if (needsPassword && currentPassword.trim()) {
      pendingEmailRef.current = email
      void saveEmail(email, currentPassword)
    } else {
      pendingEmailRef.current = email
      setNeedsPassword(true)
      setError(
        t('settings.currentPasswordRequired', undefined, {
          defaultValue: 'Confirm this change with your current password.',
        }),
      )
      requestAnimationFrame(() => passwordRef.current?.focus())
    }
  }

  const confirmPasswordChange = (): void => {
    const pending = pendingEmailRef.current ?? email
    if (!currentPassword.trim() || !pending.trim()) return
    void saveEmail(pending, currentPassword)
  }

  return (
    <section>
      <Flex align="center" gap="sm" className={cm.sp('mb', 3)}>
        <h3 className={cm.sectionHeading}>{t('settings.account')}</h3>
        {saving && <Spinner size="xs" />}
      </Flex>
      <div className={cm.stack(3)}>
        <div>
          <label htmlFor="settings-name" className={cm.formLabelSmall}>
            {t('settings.name', undefined, { defaultValue: 'Name' })}
          </label>
          <Input
            id="settings-name"
            type="text"
            value={name}
            onChange={(e) => setName((e.target as HTMLInputElement).value)}
            onBlur={() => saveName(name)}
            autoComplete="name"
            size="sm"
          />
        </div>
        <div>
          <label htmlFor="settings-email" className={cm.formLabelSmall}>
            {t('settings.email')}
          </label>
          <Input
            id="settings-email"
            type="email"
            value={email}
            onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
            onBlur={onEmailBlur}
            autoComplete="email"
            size="sm"
          />
        </div>
        {needsPassword && (
          <div>
            <label htmlFor="settings-current-password" className={cm.formLabelSmall}>
              {t('settings.currentPasswordLabel', undefined, { defaultValue: 'Current password' })}
            </label>
            <Input
              id="settings-current-password"
              ref={passwordRef}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmPasswordChange()
              }}
              onBlur={confirmPasswordChange}
              autoComplete="current-password"
              size="sm"
            />
            <p className={cm.textSize('xs')}>
              {t('settings.currentPasswordHint', undefined, {
                defaultValue:
                  'Changing your email requires your password. Press Enter or leave the field to confirm.',
              })}
            </p>
          </div>
        )}
        {error && (
          <p role="alert" className={cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))}>
            {error}
          </p>
        )}
        {saved && !error && (
          <p role="status" className={cm.cn(cm.textSize('xs'), cm.textSuccess, cm.sp('mt', 1))}>
            {t('settings.saved', undefined, { defaultValue: 'Saved.' })}
          </p>
        )}
      </div>
    </section>
  )
}

export default SettingsAccountSection
