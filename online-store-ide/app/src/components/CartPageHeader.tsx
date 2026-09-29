import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function CartPageHeader({ count }: { count: number }) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div className={cm.stack(1)}>
      <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-foreground')}>
        {t('cartPageHeader.title', {}, { defaultValue: 'Shopping Cart' })}
      </h1>
      <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
        {t('cartPageHeader.itemCount', { count }, { defaultValue: '({{count}} items)' })}
      </p>
    </div>
  )
}

export default CartPageHeader
export { CartPageHeader }
