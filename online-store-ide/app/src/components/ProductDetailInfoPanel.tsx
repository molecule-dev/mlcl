import { getClassMap } from '@molecule/app-ui'

import ProductActionButtons from './ProductActionButtons.js'
import ProductDetailDescription from './ProductDetailDescription.js'
import ProductNameHeader from './ProductNameHeader.js'
import ProductPriceBlock from './ProductPriceBlock.js'
import ProductRatingBar from './ProductRatingBar.js'
import ProductSelectorGroup from './ProductSelectorGroup.js'
import ProductShippingBadges from './ProductShippingBadges.js'
import ProductStockBadge from './ProductStockBadge.js'

export interface ProductDetailShape {
  name?: string
  rating?: number
  review_count?: number
  price?: number
  original_price?: number
  description?: string
  inventory?: { available?: number }
  in_stock?: boolean
}

interface ProductDetailInfoPanelProps {
  product: ProductDetailShape | null
  selectedColor: string
  onColorChange: (c: string) => void
  quantity: number
  onQuantityChange: (q: number) => void
  onAddToCart: () => void
  adding: boolean
  wishlisted?: boolean | null
  onToggleWishlist?: () => void
  wishlistBusy?: boolean
}

function ProductDetailInfoPanel({
  product,
  selectedColor,
  onColorChange,
  quantity,
  onQuantityChange,
  onAddToCart,
  adding,
  wishlisted,
  onToggleWishlist,
  wishlistBusy,
}: ProductDetailInfoPanelProps) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ direction: 'col' })}>
      <ProductNameHeader name={product?.name} />
      <ProductRatingBar rating={product?.rating} reviewCount={product?.review_count} />
      <ProductPriceBlock price={product?.price} originalPrice={product?.original_price} />
      <ProductDetailDescription description={product?.description} />
      <ProductSelectorGroup
        selectedColor={selectedColor}
        onColorChange={onColorChange}
        quantity={quantity}
        onQuantityChange={onQuantityChange}
      />
      <ProductActionButtons
        onAddToCart={onAddToCart}
        adding={adding}
        wishlisted={wishlisted}
        onToggleWishlist={onToggleWishlist}
        wishlistBusy={wishlistBusy}
      />
      <ProductStockBadge
        inStock={product?.inventory?.available > 0 || product?.in_stock !== false}
      />
      <ProductShippingBadges />
    </div>
  )
}

export default ProductDetailInfoPanel
export { ProductDetailInfoPanel }
