import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ProductDescriptionPanelProps {
  description?: string
  name?: string
}

export default function ProductDescriptionPanel({
  description,
  name,
}: ProductDescriptionPanelProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const heading =
    name && name.length > 0
      ? t('productDescriptionPanel.aboutHeading', { name }, { defaultValue: 'About {{name}}' })
      : t('productDescriptionPanel.heading', {}, { defaultValue: 'Product Details' })
  const body =
    description && description.length > 0
      ? description
      : t(
          'productDescriptionPanel.empty',
          {},
          { defaultValue: 'No description provided yet for this product.' },
        )
  return (
    <div className={cm.cn(cm.stack(6), 'lg:col-span-2')}>
      <h2 className={cm.cn(cm.textSize('3xl'), 'font-extrabold text-foreground')}>{heading}</h2>
      <div className={cm.cn(cm.stack(4), 'text-foreground-secondary leading-loose')}>
        <p>{body}</p>
      </div>
    </div>
  )
}
export { ProductDescriptionPanel }
