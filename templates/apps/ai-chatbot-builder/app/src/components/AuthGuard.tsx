import { useEffect, useState } from 'react'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { AuthGuard as SharedAuthGuard } from '@molecule/app-ui-react'

/**
 * Per-app AuthGuard wrapper for ai-chatbot-builder.
 *
 * Composes the shared @molecule/app-ui-react AuthGuard for the
 * auth-check + redirect + outlet behavior, but supplies a full-page
 * spinner as the loadingFallback. Also keeps a 100ms grace window
 * before letting the shared guard make its initialization decision —
 * that's an intentional UX choice specific to this app, not something
 * the shared component should encode.
 */
export function AuthGuard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth()
  const [graceDone, setGraceDone] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setGraceDone(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const spinner = (
    <div
      data-mol-id="auth-loading"
      className={cm.flex({ direction: 'col', align: 'center', justify: 'center' })}
      style={{
        minHeight: '100vh',
        width: '100%',
      }}
    >
      <div className={cm.flex({ direction: 'col', align: 'center', gap: 'lg' })}>
        <div className={cm.spinner({ size: 'xl' })} />
        <p className={cm.cn(cm.textMuted, cm.fontWeight('medium'))}>
          {t('auth.checkingSession', {}, { defaultValue: 'Checking session...' })}
        </p>
      </div>
    </div>
  )

  if (!graceDone || auth.isLoading) return spinner
  return <SharedAuthGuard loadingFallback={spinner} />
}

export default AuthGuard
