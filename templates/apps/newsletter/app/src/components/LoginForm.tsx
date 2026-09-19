import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import LoginDivider from './LoginDivider.js'
import LoginEmailField from './LoginEmailField.js'
import LoginOAuthButtons from './LoginOAuthButtons.js'
import LoginPasswordField from './LoginPasswordField.js'
import LoginSignupLink from './LoginSignupLink.js'
import LoginSubmitButton from './LoginSubmitButton.js'

function LoginForm() {
  const cm = getClassMap()
  const { t } = useTranslation()
  // Cross-view auth form persistence (email shared across Login/Signup/
  // Forgot/Reset, cleared on success) via the shared @molecule hook.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('auth.error.loginFailed', {}, { defaultValue: 'Login failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={cm.stack(6)} onSubmit={onSubmit}>
      <LoginEmailField
        email={email}
        setEmail={(v) => {
          setEmail(v)
          setError(null)
        }}
        error={error}
      />
      <LoginPasswordField
        password={password}
        setPassword={(v) => {
          setPassword(v)
          setError(null)
        }}
      />
      <LoginSubmitButton loading={loading} />
      {/* Divider */}
      <LoginDivider />
      <LoginOAuthButtons />
      {/* Footer Link */}
      <LoginSignupLink />
    </form>
  )
}

export default LoginForm
export { LoginForm }
