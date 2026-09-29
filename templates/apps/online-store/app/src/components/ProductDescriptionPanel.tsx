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
  // The design renders the copy as a lead paragraph followed by a
  // check-circle highlight list. Derive both from the product's own
  // description so every seeded product gets the same treatment.
  const sentences = body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const lead = sentences[0] ?? body
  const highlights = sentences.slice(1, 5)
  return (
    <div className={cm.cn(cm.stack(6), 'lg:col-span-2')}>
      <h2 className={cm.cn(cm.textSize('3xl'), 'font-extrabold text-foreground')}>{heading}</h2>
      <div className={cm.cn(cm.stack(4), 'text-foreground-secondary leading-loose')}>
        <p>{lead}</p>
      </div>
      {highlights.length > 0 && (
        <ul className={cm.cn(cm.stack(4))} data-mol-id="product-description-highlights">
          {highlights.map((h) => (
            <li key={h} className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }))}>
              <span
                className={cm.cn('material-symbols-outlined', cm.textPrimary, cm.sp('mt', 1))}
                aria-hidden="true"
              >
                check_circle
              </span>
              <span className="text-foreground-secondary">{h}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
export { ProductDescriptionPanel }
