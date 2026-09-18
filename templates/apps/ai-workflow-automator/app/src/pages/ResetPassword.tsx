/**
 * ResetPassword — derived from Login per screen-map.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clear transient state on browser navigation so a prior error doesn't
  // bleed into the next route render.
  useEffect(() => {
    const handler = () => {
      setError(null)
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setLoading(true)
    try {
      await http.post('/api/users/reset-password', {
        token: params.get('token') ?? '',
        password,
      })
      navigate('/login')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.replace(/\b\d{3}\b/g, '')
          : t('resetPassword.failed', {}, { defaultValue: 'Could not update password.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      pageId="reset-password"
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subhead={t(
        'resetPassword.subhead',
        {},
        { defaultValue: 'Choose something only you would guess.' },
      )}
      footer={
        <Link
          to="/login"
          data-mol-id="reset-back-link"
          className="font-bold transition-colors"
          style={{ color: 'var(--color-accent-violet)' }}
        >
          {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
        </Link>
      }
    >
      <form className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))} onSubmit={handleSubmit}>
        {error && (
          <div
            role="alert"
            data-mol-id="reset-error"
            className={cm.cn(cm.sp('p', 3), cm.textSize('sm'), 'rounded-xl')}
            style={{
              background: 'var(--color-status-error-bg)',
              color: 'var(--color-status-error-fg)',
            }}
          >
            {error}
          </div>
        )}
        {[
          {
            id: 'password',
            molId: 'reset-password',
            label: t('resetPassword.newPassword', {}, { defaultValue: 'New password' }),
            value: password,
            set: setPassword,
          },
          {
            id: 'confirm',
            molId: 'reset-confirm',
            label: t(
              'auth.signup.confirmNewPassword',
              {},
              { defaultValue: 'Confirm new password' },
            ),
            value: confirm,
            set: setConfirm,
          },
        ].map((f) => (
          <div key={f.id}>
            <label
              htmlFor={f.id}
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest block',
                cm.sp('mb', 1),
              )}
              style={{ color: 'var(--color-status-muted-fg)' }}
            >
              {f.label}
            </label>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl',
              )}
              style={{ background: 'var(--mol-color-background)' }}
            >
              <span
                className={'material-symbols-outlined text-xl'}
                style={{ color: 'var(--color-accent-violet-light)' }}
              >
                lock
              </span>
              <input
                id={f.id}
                data-mol-id={f.molId}
                type="password"
                placeholder="••••••••"
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                required
                autoComplete="new-password"
                className={
                  'flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none text-foreground placeholder:text-foreground-tertiary'
                }
              />
            </div>
          </div>
        ))}
        <button
          type="submit"
          data-mol-id="reset-submit"
          disabled={loading}
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 3),
            cm.textSize('base'),
            cm.fontWeight('bold'),
            cm.sp('mt', 2),
            'rounded-xl text-white shadow-md transition-all active:scale-[0.98]',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-accent-violet), var(--color-accent-violet))',
            boxShadow: '0 8px 20px color-mix(in srgb, var(--color-accent-violet) 35%, transparent)',
            opacity: loading ? 0.8 : 1,
          }}
        >
          {loading
            ? t('common.updatingEllipsis', {}, { defaultValue: 'Updating…' })
            : t('auth.resetPassword.updatePassword', {}, { defaultValue: 'Update password' })}
        </button>
      </form>
    </AuthShell>
  )
}

export default ResetPassword
