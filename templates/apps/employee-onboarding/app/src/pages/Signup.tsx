import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { EmbarkAuthShell } from '../components/EmbarkAuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, error, signup } = useSignup()
  // Cross-view auth form persistence via the shared @molecule hook: the
  // non-secret identity fields (email, firstName, lastName) are shared across the auth
  // views (Login/Signup/Forgot/Reset) and cleared on success. Secrets
  // (password) are deliberately kept in LOCAL state, never shared — see
  // useAuthFormState's docs for the rationale.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const firstName = authFormFields.firstName ?? ''
  const setFirstName = (value: string): void => setAuthFormField('firstName', value)
  const lastName = authFormFields.lastName ?? ''
  const setLastName = (value: string): void => setAuthFormField('lastName', value)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    try {
      await signup({
        email,
        password,
        name: [firstName, lastName].filter(Boolean).join(' ') || undefined,
      })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state
    }
  }

  return (
    <EmbarkAuthShell
      heading={t('auth.signup.heading', {}, { defaultValue: 'Welcome to your first 90 days.' })}
      subheading={t(
        'auth.signup.subheading',
        { appName: APP_NAME },
        {
          defaultValue: 'Create your {{appName}} account to start your guided onboarding journey.',
        },
      )}
      error={
        mismatch
          ? t(
              'auth.signup.passwordsDoNotMatchPeriod',
              {},
              { defaultValue: 'Passwords do not match.' },
            )
          : error?.message
      }
      panelHeadline={t('auth.signup.panel.headline', {}, { defaultValue: 'Day one, on day one.' })}
      panelBody={t(
        'auth.signup.panel.body',
        {},
        {
          defaultValue:
            'A guided checklist, role-aware training, and human introductions — ready before you walk in.',
        },
      )}
      footer={
        <>
          {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
          <Link to="/login" className="font-bold text-primary">
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cm.flex({ direction: 'col', gap: 'md' })}>
        {/* minmax(0,1fr) tracks (Tailwind grid-cols-*) + w-full inputs: a bare
            `1fr 1fr` inline grid cannot shrink below the inputs' intrinsic
            width and overflowed every <~570px viewport. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField cm={cm} label={t('form.firstName', {}, { defaultValue: 'First name' })}>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
              className="w-full bg-surface-container-lowest transition-all"
              style={{ padding: '14px 16px' }}
            />
          </FormField>
          <FormField cm={cm} label={t('form.lastName', {}, { defaultValue: 'Last name' })}>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
              className="w-full bg-surface-container-lowest transition-all"
              style={{ padding: '14px 16px' }}
            />
          </FormField>
        </div>
        <FormField cm={cm} label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder={t(
              'auth.signup.emailPlaceholder',
              {},
              { defaultValue: 'name@yourcompany.com' },
            )}
            className="bg-surface-container-lowest transition-all"
            style={{ padding: '14px 16px' }}
          />
        </FormField>
        <FormField cm={cm} label={t('auth.login.password', {}, { defaultValue: 'Password' })}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder={t(
              'common.atLeast8Characters',
              {},
              { defaultValue: 'At least 8 characters' },
            )}
            className="bg-surface-container-lowest transition-all"
            style={{ padding: '14px 16px' }}
          />
        </FormField>
        <FormField
          cm={cm}
          label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
        >
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            className="bg-surface-container-lowest transition-all"
            style={{ padding: '14px 16px' }}
          />
        </FormField>

        <button
          type="submit"
          disabled={isSigningUp}
          className="font-bold text-white transition-all duration-200"
          style={{
            marginTop: '8px',
            padding: '14px',
            borderRadius: '12px',
            background:
              'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-secondary) 100%)',
            boxShadow: '0 10px 24px -10px rgba(13, 148, 136, 0.5)',
            opacity: isSigningUp ? 0.7 : 1,
          }}
        >
          {isSigningUp
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>
      </form>

      <div className={cm.cn(cm.sp('mt', 8))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <div
            style={{
              flex: 1,
              height: '1px',
              background: 'var(--color-border, var(--mol-color-background-tertiary))',
            }}
          />
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant">
            {t('common.or', {}, { defaultValue: 'or' })}
          </span>
          <div
            style={{
              flex: 1,
              height: '1px',
              background: 'var(--color-border, var(--mol-color-background-tertiary))',
            }}
          />
        </div>
        <div className={cm.sp('mt', 4)}>
          <OAuthButtons />
        </div>
      </div>
    </EmbarkAuthShell>
  )
}

function FormField({
  cm,
  label,
  children,
}: {
  cm: ReturnType<typeof getClassMap>
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        className={cm.cn(
          'block text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant',
        )}
        style={{ marginBottom: '8px' }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}
