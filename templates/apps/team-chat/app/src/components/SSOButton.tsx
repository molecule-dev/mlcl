import { useState } from 'react'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function SSOButton() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const handleSSO = async () => {
    setIsLoading(true)
    setNotice(null)
    try {
      await Promise.resolve(auth)
      setNotice(
        t('demo.ssoUnavailable', {}, { defaultValue: 'Single sign-on is not wired in this demo.' }),
      )
    } catch (err) {
      console.error('SSO initiation failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.w('full'), 'gap-3')}>
      {notice && (
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('px', 3),
            cm.sp('py', 2),
            'rounded-md bg-warning-light text-amber-950',
          )}
        >
          {notice}
        </p>
      )}
      <button
        type="button"
        onClick={handleSSO}
        disabled={isLoading}
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w('full'),
          cm.sp('p', 3),
          'rounded-lg',
          cm.fontWeight('medium'),
          cm.textSize('sm'),
          'gap-3 border-none bg-[var(--mol-color-primary-light)] text-[var(--mol-color-text)] transition hover:opacity-90',
          'dark:bg-primary-container/50 dark:text-on-primary-container',
          isLoading ? 'cursor-wait opacity-70' : cm.cursorPointer,
        )}
      >
        <span className={cm.cn('material-symbols-outlined')} data-icon="cloud">
          cloud
        </span>
        {t('sso.continue', {}, { defaultValue: 'Continue with SSO' })}
      </button>
    </div>
  )
}
export default SSOButton
