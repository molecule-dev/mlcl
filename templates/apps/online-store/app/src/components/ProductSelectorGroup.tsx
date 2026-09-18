import { getClassMap } from '@molecule/app-ui'

import ProductColorSelector from './ProductColorSelector.js'
import ProductQuantitySelector from './ProductQuantitySelector.js'

interface ProductSelectorGroupProps {
  selectedColor: string
  onColorChange: (c: string) => void
  quantity: number
  onQuantityChange: (q: number) => void
}

function ProductSelectorGroup({
  selectedColor,
  onColorChange,
  quantity,
  onQuantityChange,
}: ProductSelectorGroupProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.stack(6), cm.sp('mb', 8))}>
      <ProductColorSelector selectedColor={selectedColor} onColorChange={onColorChange} />
      {/* Quantity */}
      <ProductQuantitySelector quantity={quantity} onQuantityChange={onQuantityChange} />
    </div>
  )
}

export default ProductSelectorGroup
export { ProductSelectorGroup }
