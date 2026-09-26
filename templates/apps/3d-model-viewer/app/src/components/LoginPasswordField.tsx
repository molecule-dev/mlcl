import { type ChangeEvent, useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function LoginPasswordField({
  value,
  onChange,
}: {
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const [showPassword, setShowPassword] = useState(false)
  const inputCls = cm.cn(
    cm.w('full'),
    cm.sp('py', 3),
    cm.sp('px', 4),
    cm.sp('pr', 10),
    'block rounded-[12px] border-0 bg-surface-container-low text-on-surface shadow-sm ring-1 ring-inset ring-outline-variant/20 placeholder:text-outline focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all duration-200',
  )
  return (
    <div className={cm.stack(1)}>
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <label
          className={cm.cn(
            cm.fontWeight('medium'),
            'block font-label text-[11px] uppercase tracking-[0.05em] text-on-surface-variant',
          )}
          htmlFor="password"
        >
          {t('auth.login.password', {}, { defaultValue: 'Password' })}
        </label>
        <Link
          className={cm.cn(
            'font-label text-[11px] font-medium text-primary hover:text-primary-container transition-colors',
          )}
          to="/forgot-password"
        >
          {t('loginPasswordField.forgotPassword', {}, { defaultValue: 'Forgot Password?' })}
        </Link>
      </div>
      <div className="relative">
        <input
          autoComplete="current-password"
          className={inputCls}
          id="password"
          name="password"
          onChange={onChange}
          required={true}
          type={showPassword ? 'text' : 'password'}
          value={value}
        />
        <button
          aria-label={
            showPassword
              ? t('loginPasswordField.hidePassword', {}, { defaultValue: 'Hide password' })
              : t('loginPasswordField.showPassword', {}, { defaultValue: 'Show password' })
          }
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('pl', 3),
            cm.sp('pr', 3),
            'absolute inset-y-0 right-0 text-outline hover:text-on-surface transition-colors',
          )}
          onClick={() => setShowPassword((v) => !v)}
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]" data-icon="visibility">
            {showPassword ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>
    </div>
  )
}

export default LoginPasswordField
export { LoginPasswordField }
