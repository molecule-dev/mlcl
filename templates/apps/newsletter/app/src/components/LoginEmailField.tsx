import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function LoginEmailField({
  email,
  setEmail,
  error,
  formContext = 'login',
}: {
  email: string
  setEmail: (v: string) => void
  error: string | null
  formContext?: string
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <>
      {/* Email Field */}
      <div className={cm.fv4f3df6dd}>
        <label
          className={cm.cn(
            cm.sp('ml', 1),
            'font-sans-ui text-[0.7rem] uppercase tracking-widest text-on-surface-variant',
          )}
          htmlFor={`${formContext}-email`}
        >
          {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
        </label>
        <div className={cm.fvdef3facc}>
          <input
            className={cm.cn(
              cm.sp('py', 3),
              cm.textSize('base'),
              'w-full bg-transparent border-0 border-b border-outline-variant/30 focus:ring-0 focus:border-primary transition-all font-sans-ui placeholder:text-outline/50',
            )}
            data-mol-id={`input-${formContext}-email`}
            id={`${formContext}-email`}
            placeholder={t(
              'auth.passwordPlaceholderNameExample',
              {},
              { defaultValue: 'name@example.com' },
            )}
            name="email"
            autoComplete="email"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
          />
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
    </>
  )
}

export default LoginEmailField
export { LoginEmailField }
