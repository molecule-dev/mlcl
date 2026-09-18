import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function LoginSubmitButton({ loading }: { loading: boolean }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.sp('pt', 2)}>
      <button
        className={cm.cn(
          cm.flex({ justify: 'center' }),
          cm.w('full'),
          cm.sp('py', 3),
          cm.sp('px', 4),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'btn-gradient rounded-[12px] text-on-primary shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-200 hover:shadow-[0_8px_32px_rgba(26,26,46,0.12)] active:scale-[0.98]',
        )}
        disabled={loading}
        type="submit"
      >
        {loading
          ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
          : t('loginSubmitButton.signIn', {}, { defaultValue: 'Sign In' })}
      </button>
    </div>
  )
}

export default LoginSubmitButton
export { LoginSubmitButton }
