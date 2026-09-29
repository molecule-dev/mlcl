import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ProductNameHeader({ name }: { name?: string }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <>
      <h1
        className={cm.cn(
          cm.textSize('4xl'),
          cm.sp('mb', 2),
          'font-black text-foreground tracking-tight',
        )}
      >
        {name ?? t('nav.product', {}, { defaultValue: 'Product' })}
      </h1>
    </>
  )
}

export default ProductNameHeader
export { ProductNameHeader }
