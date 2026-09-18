import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ProductDetailDescription({ description }: { description?: string }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <p className={cm.cn(cm.sp('mb', 8), 'text-foreground-secondary leading-relaxed')}>
      {description ??
        t(
          'productDetailDescription.features',
          { hours: 30, processorVersion: 'V1' },
          {
            defaultValue:
              'Industry-leading noise cancellation optimized to you. Experience crystal clear hands-free calling and up to {{hours}} hours of battery life with quick charging. Redefining your listening experience with the Integrated Processor {{processorVersion}}.',
          },
        )}
    </p>
  )
}

export default ProductDetailDescription
export { ProductDetailDescription }
