import { useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function LoginPasswordField({
  password,
  setPassword,
  error,
  showForgot = true,
  formContext = 'login',
}: {
  password: string
  setPassword: (v: string) => void
  error?: string | null
  showForgot?: boolean
  formContext?: string
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)
  return (
    <div className={cm.fv4f3df6dd}>
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'end' }))}>
        <label
          className={cm.cn(
            cm.sp('ml', 1),
            'font-sans-ui text-[0.7rem] uppercase tracking-widest text-on-surface-variant',
          )}
          htmlFor={`${formContext}-password`}
        >
          {t('auth.login.password', {}, { defaultValue: 'Password' })}
        </label>
        {showForgot && (
          <Link className={cm.fv03767af6} data-mol-id="link-forgot-password" to="/forgot-password">
            {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
          </Link>
        )}
      </div>
      <div className={cm.fvdef3facc}>
        <input
          className={cm.cn(
            cm.sp('py', 3),
            cm.textSize('base'),
            `w-full bg-transparent border-0 border-b ${error ? 'border-error' : 'border-outline-variant/30'} focus:ring-0 focus:border-primary transition-all font-sans-ui placeholder:text-outline/50`,
          )}
          data-mol-id={`input-${formContext}-password`}
          id={`${formContext}-password`}
          placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
          name="password"
          autoComplete={formContext === 'signup' ? 'new-password' : 'current-password'}
          minLength={formContext === 'signup' ? 8 : undefined}
          required
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!error}
        />
        <button
          aria-label={
            showPassword
              ? t('loginPasswordField.hidePassword', {}, { defaultValue: 'Hide password' })
              : t('loginPasswordField.showPassword', {}, { defaultValue: 'Show password' })
          }
          className={cm.fvefaff7ef}
          onClick={() => setShowPassword((s) => !s)}
          type="button"
        >
          <span className={cm.fv5b245ffa}>{showPassword ? 'visibility_off' : 'visibility'}</span>
        </button>
      </div>
      {error && (
        <p
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('mt', 1),
            cm.textSize('xs'),
            'font-sans-ui text-error',
          )}
          role="alert"
          aria-live="polite"
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>error</span>
          {error}
        </p>
      )}
    </div>
  )
}
export default LoginPasswordField
export { LoginPasswordField }
