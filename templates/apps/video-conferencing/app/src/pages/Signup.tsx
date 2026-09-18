import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useHttpClient, useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandPanel } from '../components/AuthBrandPanel.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { FormField } from './Login.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
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
  const workspace = authFormFields.workspace ?? ''
  const setWorkspace = (value: string): void => setAuthFormField('workspace', value)
  const firstName = authFormFields.firstName ?? ''
  const setFirstName = (value: string): void => setAuthFormField('firstName', value)
  const lastName = authFormFields.lastName ?? ''
  const setLastName = (value: string): void => setAuthFormField('lastName', value)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) return
    try {
      await signup({ email, password, name: `${firstName} ${lastName}`.trim() })
      clearAuthForm()
      // Provision a default workspace using the name from the form so the
      // post-signup app immediately has a workspace context (TeamMembers,
      // workspace-scoped queries, etc.).
      try {
        await http.post('/api/workspaces', {
          name: workspace.trim() || `${firstName.trim() || 'My'} workspace`.trim(),
        })
      } catch (_error) {
        // non-fatal — workspace provisioning failure; user can create one later
      }
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state — surfaced via useSignup().error
    }
  }

  const isPending = status === 'pending'

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.grid({ cols: 1 }),
        'lg:grid-cols-2 bg-surface-container-lowest',
      )}
    >
      <AuthBrandPanel />
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.sp('p', 8),
        )}
      >
        <div className={cm.cn(cm.maxW('md'), 'w-full', cm.stack(6))}>
          <header className={cm.stack(2)}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('auth.eyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </span>
            <h1 className={cm.cn('text-4xl font-extrabold tracking-tight text-on-surface')}>
              {t(
                'auth.signupTitle',
                { appName: APP_NAME },
                { defaultValue: 'Create your {{appName}} workspace' },
              )}
            </h1>
            <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
              {t(
                'auth.signupSubtitle',
                {},
                { defaultValue: 'Bring your team into a single meeting room.' },
              )}
            </p>
          </header>

          <form onSubmit={handleSubmit} className={cm.stack(3)}>
            <FormField
              label={t('auth.workspaceLabel', {}, { defaultValue: 'Workspace name' })}
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              required
            />
            <div className={cm.cn(cm.grid({ cols: 2, gap: 'sm' }))}>
              <FormField
                label={t('form.firstName', {}, { defaultValue: 'First name' })}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                required
              />
              <FormField
                label={t('form.lastName', {}, { defaultValue: 'Last name' })}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                required
              />
            </div>
            <FormField
              label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <FormField
              label={t('auth.login.password', {}, { defaultValue: 'Password' })}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <FormField
              label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={isPending}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'w-full bg-gradient-to-r from-primary to-secondary text-on-primary shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/40 transition-all disabled:opacity-60',
              )}
            >
              {isPending
                ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
                : t('common.signUp', {}, { defaultValue: 'Create workspace' })}
            </button>
            {error && (
              <div
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.textSize('sm'),
                  'rounded-lg bg-error/10 text-error border border-error/20',
                )}
              >
                {error.message}
              </div>
            )}
          </form>

          <OAuthButtons />

          <p className={cm.cn(cm.textCenter, cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('auth.hasAccount', {}, { defaultValue: 'Already have a workspace?' })}{' '}
            <Link
              to="/login"
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-secondary hover:text-primary transition-colors',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
