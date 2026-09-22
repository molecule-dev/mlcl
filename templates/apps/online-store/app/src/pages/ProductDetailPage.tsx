// Phase 1 baseline — verbatim JSX of design-online-store-product-detail.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AnnouncementBar from '../components/AnnouncementBar.js'
import Breadcrumb, { categoryToSlug } from '../components/Breadcrumb.js'
import ProductDescriptionPanel from '../components/ProductDescriptionPanel.js'
import ProductDetailInfoPanel, {
  type ProductDetailShape,
} from '../components/ProductDetailInfoPanel.js'
import ProductDetailNavBar from '../components/ProductDetailNavBar.js'
import ProductImageGallery from '../components/ProductImageGallery.js'
import ProductRelatedSection, {
  type RelatedProductCard,
} from '../components/ProductRelatedSection.js'
import ProductReviewsPanel, {
  type ProductReviewDisplay,
} from '../components/ProductReviewsPanel.js'
import ProductTabNav from '../components/ProductTabNav.js'
import StoreFooter from '../components/StoreFooter.js'
import { unpackListPayload } from '../utils/httpUnpack.js'

/** Full product record as consumed by this page's sections. */
type ProductDetail = ProductDetailShape & {
  id: string | number
  category?: string
  images?: string[]
}

function ProductDetailPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [reviews, setReviews] = useState<ProductReviewDisplay[]>([])
  const [aggregate, setAggregate] = useState({ averageRating: 0, totalReviews: 0 })
  const [relatedProducts, setRelatedProducts] = useState<RelatedProductCard[]>([])
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedColor, setSelectedColor] = useState('Silver')
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>(
    'description',
  )
  const [wishlistEntryId, setWishlistEntryId] = useState<string | null>(null)
  const [wishlistBusy, setWishlistBusy] = useState(false)

  useEffect(() => {
    if (!id || !isAuthenticated) {
      setWishlistEntryId(null)
      return
    }
    let cancelled = false
    http
      .get<{ data?: Array<{ id: string; product_id?: string; productId?: string }> }>(
        '/api/wishlist',
      )
      .then((res) => {
        if (cancelled) return
        const body = (res as { data?: unknown })?.data ?? res
        const list = (
          Array.isArray(body) ? body : ((body as { data?: unknown[] })?.data ?? [])
        ) as Array<{
          id: string
          product_id?: string
          productId?: string
        }>
        const entry = list.find(
          (row) => String(row.product_id ?? row.productId ?? '') === String(id),
        )
        setWishlistEntryId(entry?.id ?? null)
      })
      // Wishlist state is optional decoration — on fetch failure the heart
      // button simply stays in its default (not-wishlisted) state.
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [id, isAuthenticated, http])

  const toggleWishlist = async () => {
    if (!id) return
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setWishlistBusy(true)
    try {
      if (wishlistEntryId) {
        await http.delete(`/api/wishlist/${wishlistEntryId}`)
        setWishlistEntryId(null)
      } else {
        const created = (await http.post('/api/wishlist', { productId: id })) as
          { data?: { id?: string }; id?: string } | undefined
        const newId =
          (created as { data?: { id?: string } })?.data?.id ?? (created as { id?: string })?.id
        setWishlistEntryId(typeof newId === 'string' ? newId : 'pending')
        void track({ name: 'wishlist.item_added', properties: { product_id: id } })
      }
    } finally {
      setWishlistBusy(false)
    }
  }

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    const unwrap = (res: unknown): unknown =>
      res && typeof res === 'object' && 'data' in res ? (res as { data: unknown }).data : res
    Promise.allSettled([
      http.get(`/api/products/${id}`),
      http.get(`/api/reviews/product/${id}`),
      http.get(`/api/products?limit=20`),
    ])
      .then(([productSettled, reviewsSettled, productsSettled]) => {
        if (productSettled.status === 'fulfilled') {
          const body = unwrap(productSettled.value)
          setProduct(body && typeof body === 'object' ? (body as ProductDetail) : null)
        }
        if (reviewsSettled.status === 'fulfilled') {
          const body = unwrap(reviewsSettled.value)
          setReviews(unpackListPayload(body) as ProductReviewDisplay[])
          const agg = (
            body as { aggregate?: { averageRating: number; totalReviews: number } } | null
          )?.aggregate
          if (agg) setAggregate(agg)
        }
        if (productsSettled.status === 'fulfilled') {
          const all = unpackListPayload(productsSettled.value) as RelatedProductCard[]
          setRelatedProducts(all.filter((x) => String(x.id) !== String(id)).slice(0, 4))
        }
      })
      .finally(() => setLoading(false))
  }, [id, http])

  const addToCart = async () => {
    if (!product) return
    setAdding(true)
    setAddError(null)
    try {
      await http.post('/api/cart/items', {
        productId: product.id,
        quantity,
        variantId: selectedColor,
      })
    } catch (err) {
      const status =
        (err as { status?: number; response?: { status?: number } })?.status ??
        (err as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        navigate('/login')
        return
      }
      setAddError(
        t(
          'storefront.addToCartError',
          {},
          { defaultValue: 'Failed to add to cart. Please try again.' },
        ),
      )
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.surface, cm.textPrimary, 'font-sans antialiased')}>
        <AnnouncementBar />
        <ProductDetailNavBar />
        <main className={cm.cn(cm.maxW('[1280px]'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 8))}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60vh',
            }}
          >
            <span className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
              {t('productDetail.loading', {}, { defaultValue: 'Loading product...' })}
            </span>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.surface, cm.textPrimary, 'font-sans antialiased')}>
      {/* Announcement Bar */}
      <AnnouncementBar />
      {/* TopNavBar (Shared Component) */}
      <ProductDetailNavBar />
      <main className={cm.cn(cm.maxW('[1280px]'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 8))}>
        <div className={cm.stack(12)}>
          <Breadcrumb
            crumbs={[
              { label: t('common.home', {}, { defaultValue: 'Home' }), to: '/' },
              ...(product?.category
                ? [
                    {
                      label: String(product.category),
                      to: `/category/${categoryToSlug(String(product.category))}`,
                    },
                  ]
                : []),
              ...(product?.name ? [{ label: String(product.name) }] : []),
            ]}
          />
          <div className={cm.cn(cm.grid({ cols: 1, gap: 12 }), 'lg:grid-cols-2')}>
            <ProductImageGallery
              images={product?.images}
              selectedImage={selectedImage}
              onImageSelect={setSelectedImage}
            />
            <ProductDetailInfoPanel
              product={product}
              selectedColor={selectedColor}
              onColorChange={setSelectedColor}
              quantity={quantity}
              onQuantityChange={setQuantity}
              onAddToCart={addToCart}
              adding={adding}
              wishlisted={Boolean(wishlistEntryId)}
              onToggleWishlist={toggleWishlist}
              wishlistBusy={wishlistBusy}
            />
          </div>
          {addError && (
            <p
              className={cm.cn(cm.textSize('sm'), 'text-error')}
              role="alert"
              data-mol-id="product-add-error"
            >
              {addError}
            </p>
          )}
          <ProductTabNav activeTab={activeTab} onTabChange={setActiveTab} />
          <div className={cm.cn(cm.grid({ cols: 1, gap: 12 }), 'lg:grid-cols-3')}>
            {activeTab === 'description' && (
              <ProductDescriptionPanel description={product?.description} name={product?.name} />
            )}
            {activeTab === 'reviews' && (
              <ProductReviewsPanel reviews={reviews} aggregate={aggregate} />
            )}
          </div>
          <ProductRelatedSection relatedProducts={relatedProducts} />
        </div>
      </main>
      <StoreFooter />
    </div>
  )
}

export default ProductDetailPage
export { ProductDetailPage, ProductDetailPage as ProductDetailPagePage }
