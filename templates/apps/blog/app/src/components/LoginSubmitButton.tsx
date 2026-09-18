import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function LoginSubmitButton({ loading }: { loading: boolean }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.sp('pt', 4)}>
      <button
        className={cm.cn(
          cm.w('full'),
          'h-[48px]',
          cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
          cm.roundedFull,
          cm.fontWeight('semibold'),
          cm.textSize('sm'),
          'bg-gradient-to-br from-primary to-primary-container text-on-primary font-sans-ui tracking-wide shadow-lg shadow-primary/10 transition-transform active:scale-95',
          loading ? 'opacity-80 cursor-not-allowed' : '',
        )}
        data-mol-id="button-login-submit"
        disabled={loading}
        type="submit"
      >
        {loading && (
          <svg
            className={cm.cn(cm.h(4), cm.w(4), 'animate-spin text-on-primary')}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className={cm.fv54eab745}
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className={cm.fv54eab7e0}
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              fill="currentColor"
            ></path>
          </svg>
        )}
        {loading
          ? t('loginSubmitButton.loading', {}, { defaultValue: 'Signing in...' })
          : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
      </button>
    </div>
  )
}

export default LoginSubmitButton
export { LoginSubmitButton }
