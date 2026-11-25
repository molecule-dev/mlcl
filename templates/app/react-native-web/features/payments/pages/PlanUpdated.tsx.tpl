import { Link } from 'react-router'
import { useAuth, useTranslation, useVerifyPaymentReturn } from '@molecule/app-react'
import { Button, Flex, Spinner } from '@molecule/app-ui-react-native'
import { getClassMap } from '@molecule/app-ui'

/**
 * The page a checkout returns to. The provider sends the user here with the purchase id in the
 * URL, and confirming it with the API from this page is what grants the plan, so the thank-you
 * shows only once the API has confirmed it.
 */
export function PlanUpdated() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { state } = useAuth()
  const verification = useVerifyPaymentReturn()

  if (!state.initialized || verification.status === 'verifying') {
    return (
      <Flex align="center" justify="center" className={cm.sp('py', 12)}>
        <Spinner />
      </Flex>
    )
  }

  if (verification.status === 'failed') {
    return (
      <div className={cm.cn(cm.textCenter, cm.sp('py', 12))}>
        <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8))}>
          {t('planUpdated.verifyFailed')}
        </h2>
        <Button onClick={verification.retry}>{t('planUpdated.retry')}</Button>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.textCenter, cm.sp('py', 12))}>
      <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
        {t('planUpdated.message')}
      </h2>
      <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8))}>
        {t('planUpdated.thankYou')}
      </h2>
      <Link to="/">
        <Button>{t('planUpdated.returnHome')}</Button>
      </Link>
    </div>
  )
}
