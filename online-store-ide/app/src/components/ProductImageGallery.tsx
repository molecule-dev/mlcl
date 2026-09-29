import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const FALLBACK_IMAGES = [
  'https://picsum.photos/seed/ProductImageGallery-1/1200/800',
  'https://picsum.photos/seed/ProductImageGallery-2/1200/800',
  'https://picsum.photos/seed/ProductImageGallery-3/1200/800',
  'https://picsum.photos/seed/ProductImageGallery-4/1200/800',
  'https://picsum.photos/seed/ProductImageGallery-5/1200/800',
]

export default function ProductImageGallery({
  images,
  selectedImage = 0,
  onImageSelect,
}: {
  images?: string[]
  selectedImage?: number
  onImageSelect?: (i: number) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const imgs = images && images.length > 0 ? images : FALLBACK_IMAGES
  const thumbs = imgs.slice(0, 4)
  return (
    <div className={cm.stack(4)}>
      <div
        className={cm.cn(
          'aspect-[4/3] rounded-xl bg-surface-secondary overflow-hidden group relative',
        )}
      >
        <img
          className={cm.cn(cm.w('full'), cm.h('full'), cm.sp('p', 8), 'object-contain')}
          src={imgs[selectedImage] ?? imgs[0]}
          alt={t('productImageGallery.mainAlt', {}, { defaultValue: 'Product image' })}
        />
      </div>
      <div className={cm.grid({ cols: 4, gap: 'md' })}>
        {thumbs.map((src, i) => (
          <button
            key={i}
            className={cm.cn(
              cm.sp('p', 2),
              `aspect-square rounded-lg border-2 overflow-hidden bg-surface-secondary${selectedImage === i ? 'border-green-600' : 'border-transparent hover:border-slate-200'}`,
            )}
            data-mol-id={`thumb-${i + 1}`}
            onClick={() => onImageSelect?.(i)}
          >
            <img
              className={cm.cn(cm.w('full'), cm.h('full'), 'object-contain')}
              src={src}
              alt={t(
                'productImageGallery.thumbnailAlt',
                { index: i + 1 },
                { defaultValue: 'Product view {{index}}' },
              )}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
export { ProductImageGallery }
