import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Props {
  onAddToCart?: () => void
  adding?: boolean
  /**
   * Whether this product is currently in the user's wishlist.
   * `null` means "unknown / unauthenticated"; the heart icon falls back to the
   * empty state and clicks attempt to add.
   */
  wishlisted?: boolean | null
  onToggleWishlist?: () => void
  wishlistBusy?: boolean
}

export default function ProductActionButtons({
  onAddToCart,
  adding = false,
  wishlisted = false,
  onToggleWishlist,
  wishlistBusy = false,
}: Props) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ gap: 4 }), cm.sp('mb', 6))}>
      <button
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.fontWeight('bold'),
          cm.h(12),
          'flex-[3] bg-primary hover:opacity-90 text-on-primary rounded-lg transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed',
        )}
        data-mol-id="add-to-cart-btn"
        onClick={onAddToCart}
        disabled={adding}
      >
        {adding
          ? t('common.loading', {}, { defaultValue: 'Adding...' })
          : t('productActionButtons.addToCart', {}, { defaultValue: 'Add to Cart' })}
      </button>
      <button
        type="button"
        className={cm.cn(
          cm.flex1,
          cm.flex({ align: 'center', justify: 'center' }),
          'border border-border hover:bg-surface-secondary rounded-lg disabled:opacity-50',
        )}
        data-mol-id="add-to-wishlist"
        data-wishlisted={wishlisted ? 'true' : 'false'}
        onClick={onToggleWishlist}
        disabled={wishlistBusy}
        aria-pressed={wishlisted ? 'true' : 'false'}
        aria-label={
          wishlisted
            ? t(
                'productActionButtons.removeFromWishlistAria',
                {},
                { defaultValue: 'Remove from wishlist' },
              )
            : t('productActionButtons.addToWishlistAria', {}, { defaultValue: 'Add to wishlist' })
        }
      >
        <span
          className={cm.cn('material-symbols-outlined', wishlisted ? 'text-error' : cm.textMuted)}
        >
          {wishlisted ? 'favorite' : 'favorite_border'}
        </span>
      </button>
      <button
        className={cm.cn(
          cm.flex1,
          cm.flex({ align: 'center', justify: 'center' }),
          'border border-border hover:bg-surface-secondary rounded-lg',
        )}
        data-mol-id="share-btn"
        onClick={() => navigator.share?.({ url: window.location.href, title: document.title })}
      >
        <span className={cm.cn('material-symbols-outlined', cm.textMuted)}>share</span>
      </button>
    </div>
  )
}
export { ProductActionButtons }
