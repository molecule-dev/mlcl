import { Link } from 'react-router'
import { useAuth, useTranslation } from '@molecule/app-react'
import { Button, Flex, Spinner } from '@molecule/app-ui-react'
import { getClassMap } from '@molecule/app-ui'

export function PlanUpdated() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { state } = useAuth()

  if (!state.initialized) {
    return (
      <Flex align="center" justify="center" className={cm.sp('py', 12)}>
        <Spinner />
      </Flex>
    )
  }

  return (
    <div className={cm.cn(cm.textCenter, cm.sp('py', 12))}>
      <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>{t('planUpdated.message')}</h1>
      <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8))}>{t('planUpdated.thankYou')}</h2>
      <Link to="/">
        <Button>{t('planUpdated.returnHome')}</Button>
      </Link>
    </div>
  )
}
