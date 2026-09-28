import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'

import { Footer } from '../components/Footer.js'
import StorefrontTopNavBar from '../components/StorefrontTopNavBar.js'

interface Product {
  id: string
  name: string
  /** Price in minor units (cents). */
  price: number
  thumbnails?: string[]
  images?: string[]
  category: string
  rating?: number
  total_sold?: number
  featured?: boolean
}

interface Category {
  name: string
  count: number
}

const CATEGORY_IMAGES: Record<string, string> = {
  Electronics: 'https://picsum.photos/seed/bazaar-cat-electronics/400/500',
  Fashion: 'https://picsum.photos/seed/bazaar-cat-fashion/400/500',
  'Home & Living': 'https://picsum.photos/seed/bazaar-cat-home/400/500',
  Sports: 'https://picsum.photos/seed/bazaar-cat-sports/400/500',
  Accessories: 'https://picsum.photos/seed/bazaar-cat-accessories/400/500',
}

function categoryImage(name: string): string {
  return CATEGORY_IMAGES[name] || `https://picsum.photos/seed/bazaar-cat-${name}/400/500`
}

function categorySlug(name: string): string {
  return encodeURIComponent(
    name
      .toLowerCase()
      .replace(/\s+&\s+/g, '-')
      .replace(/\s+/g, '-'),
  )
}

export function StorefrontPage() {
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [trending, setTrending] = useState<Product[]>([])
  const [arrivals, setArrivals] = useState<Product[]>([])
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addedId, setAddedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get<{ data?: Category[] } | Category[]>('/api/storefront/categories'),
      http.get<{ data?: Product[] }>('/api/storefront/bestsellers?limit=4'),
      http.get<{ data?: Product[] }>('/api/storefront/new-arrivals?limit=4'),
    ])
      .then(([catsRes, bestRes, newRes]) => {
        if (cancelled) return
        const catsBody = (catsRes as { data?: unknown })?.data ?? catsRes
        const cats = Array.isArray(catsBody)
          ? (catsBody as Category[])
          : ((catsBody as { data?: Category[] })?.data ?? [])
        setCategories(Array.isArray(cats) ? cats : [])
        const bestBody = (bestRes as { data?: unknown })?.data ?? bestRes
        const bestArr = Array.isArray(bestBody)
          ? (bestBody as Product[])
          : ((bestBody as { data?: Product[] })?.data ?? [])
        setTrending(bestArr)
        const newBody = (newRes as { data?: unknown })?.data ?? newRes
        const newArr = Array.isArray(newBody)
          ? (newBody as Product[])
          : ((newBody as { data?: Product[] })?.data ?? [])
        setArrivals(newArr)
      })
      .catch(() =>
        setError(
          t('storefront.loadError', {}, { defaultValue: 'Failed to load storefront content.' }),
        ),
      )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http]) // t is stable and intentionally omitted to avoid re-fetching on locale change

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100)

  async function handleAddToCart(product: Product) {
    setAddingId(product.id)
    setAddedId(null)
    try {
      await http.post('/api/cart/items', { productId: product.id, quantity: 1 })
      void track({ name: 'cart.item_added', properties: { product_id: product.id } })
      setAddedId(product.id)
      setTimeout(() => setAddedId(null), 2500)
    } catch (err) {
      const status =
        (err as { status?: number; response?: { status?: number } })?.status ??
        (err as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        navigate('/login')
        return
      }
      setError(
        t(
          'storefront.addToCartError',
          {},
          { defaultValue: 'Failed to add to cart. Please try again.' },
        ),
      )
    } finally {
      setAddingId(null)
    }
  }

  const categoryDisplay: Category[] =
    categories.length > 0
      ? categories.slice(0, 4)
      : [
          { name: 'Electronics', count: 0 },
          { name: 'Fashion', count: 0 },
          { name: 'Home & Living', count: 0 },
          { name: 'Sports', count: 0 },
        ]

  return (
    <div data-mol-id="page-storefront">
      {/* Announcement bar (design: announcement-bar-01) */}
      <div
        data-mol-id="announcement-bar-01"
        style={{
          backgroundColor: 'var(--color-surface-secondary)',
          padding: '8px 24px',
          borderBottom: '1px solid var(--color-border-light)',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            margin: '0 auto',
            maxWidth: '1280px',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
          }}
        >
          {t(
            'storefront.announcement',
            {},
            { defaultValue: 'Free shipping on orders over $75 — ' },
          )}
          <Link
            to="/search?q=all"
            style={{
              color: 'var(--color-in-stock)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            {t('storefront.shopNowLink', {}, { defaultValue: 'Shop now' })}
          </Link>
        </p>
      </div>
      <StorefrontTopNavBar />
      {/* Hero Section */}
      <section
        data-mol-id="hero-section-01"
        style={{
          position: 'relative',
          height: '600px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img
            alt=""
            src="https://picsum.photos/seed/bazaar-hero/1920/600"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to right, rgba(255,255,255,0.85), transparent)',
            }}
          />
        </div>
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0 24px',
            width: '100%',
          }}
        >
          <div style={{ maxWidth: '500px' }}>
            <span
              style={{
                color: 'var(--color-in-stock)',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontSize: '12px',
                marginBottom: '16px',
                display: 'block',
              }}
            >
              {t('storefront.heroTag', {}, { defaultValue: 'Seasonal Edit' })}
            </span>
            <h1
              style={{
                fontSize: 'clamp(40px, 5vw, 60px)',
                fontWeight: 900,
                color: 'var(--mol-color-secondary)',
                lineHeight: 1.1,
                marginBottom: '24px',
              }}
            >
              {t('storefront.heroTitleLine1', {}, { defaultValue: 'Spring' })}
              <br />
              {t('storefront.heroTitleLine2', {}, { defaultValue: 'Collection 2025' })}
            </h1>
            <p
              style={{
                fontSize: '18px',
                color: 'var(--mol-color-text-secondary)',
                marginBottom: '32px',
                lineHeight: 1.6,
              }}
            >
              {t(
                'storefront.heroDesc',
                {},
                {
                  defaultValue:
                    'Discover our handpicked selection of premium products crafted for comfort and style this season.',
                },
              )}
            </p>
            <Link
              to="/search?q=spring"
              data-mol-id="hero-cta"
              style={{
                display: 'inline-block',
                backgroundColor: 'var(--color-in-stock)',
                color: 'var(--color-surface)',
                padding: '16px 40px',
                borderRadius: '8px',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                transition: 'all 0.2s',
              }}
            >
              {t('storefront.shopNow', {}, { defaultValue: 'Shop Now' })}
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section
        data-mol-id="categories-section-01"
        style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px 24px' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '40px',
          }}
        >
          <h2 style={{ fontSize: '30px', fontWeight: 700, color: 'var(--mol-color-secondary)' }}>
            {t('storefront.categoriesTitle', {}, { defaultValue: 'Shop by Category' })}
          </h2>
          <Link
            to="/search?q=all"
            style={{
              color: 'var(--color-in-stock)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            {t('storefront.viewAll', {}, { defaultValue: 'View All' })}{' '}
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              arrow_forward
            </span>
          </Link>
        </div>
        <div
          className="storefront-section-cols"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '24px' }}
        >
          {categoryDisplay.map((cat, index) => (
            <Link
              key={cat.name}
              to={`/category/${categorySlug(cat.name)}`}
              data-mol-id={`cat-card-${index + 1}`}
              className="category-card"
              style={{
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                aspectRatio: '4/5',
                textDecoration: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'box-shadow 0.2s',
              }}
            >
              <img
                src={categoryImage(cat.name)}
                alt={cat.name}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transition: 'transform 0.5s',
                }}
              />
              <div
                className="category-overlay"
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  transition: 'background-color 0.2s',
                }}
              />
              <div style={{ position: 'absolute', bottom: '24px', left: '24px' }}>
                <h3 style={{ color: 'var(--color-surface)', fontSize: '20px', fontWeight: 700 }}>
                  {cat.name}
                </h3>
                {cat.count > 0 && (
                  <p
                    style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', marginTop: '4px' }}
                  >
                    {t(
                      'storefront.categoryCount',
                      { count: cat.count },
                      { defaultValue: '{{count}} products' },
                    )}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {error && (
        <div
          data-mol-id="storefront-error"
          role="alert"
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '12px 24px',
            color: 'var(--color-error-text)',
            backgroundColor: 'var(--color-surface-secondary)',
            borderRadius: '8px',
          }}
        >
          {error}
        </div>
      )}

      {/* Trending Now */}
      <section
        data-mol-id="trending-section-01"
        style={{ backgroundColor: 'var(--color-surface-secondary)', padding: '80px 24px' }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2
              data-mol-id="trending-title-01"
              style={{
                fontSize: '30px',
                fontWeight: 700,
                color: 'var(--mol-color-secondary)',
                marginBottom: '8px',
              }}
            >
              {t('storefront.trendingTitle', {}, { defaultValue: 'Trending Now' })}
            </h2>
            <p style={{ color: 'var(--color-out-of-stock)' }}>
              {t(
                'storefront.trendingSubtitle',
                {},
                { defaultValue: 'What everyone is talking about this week' },
              )}
            </p>
          </div>
          <div
            className="storefront-section-cols"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '24px' }}
          >
            {trending.length === 0 && (
              <p
                data-mol-id="trending-empty"
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  color: 'var(--color-out-of-stock)',
                }}
              >
                {t(
                  'storefront.trendingEmpty',
                  {},
                  { defaultValue: 'No trending products yet — check back soon.' },
                )}
              </p>
            )}
            {trending.map((product) => (
              <div
                key={product.id}
                data-mol-id={`product-card-${product.id}`}
                className="product-card"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  transition: 'box-shadow 0.2s',
                }}
              >
                <Link
                  to={`/product/${product.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    style={{
                      position: 'relative',
                      aspectRatio: '1',
                      overflow: 'hidden',
                      backgroundColor: 'var(--color-border-light)',
                    }}
                  >
                    <img
                      src={
                        product.thumbnails?.[0] ||
                        product.images?.[0] ||
                        `https://picsum.photos/seed/${product.id}/400/400`
                      }
                      alt={product.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.3s',
                      }}
                    />
                    {product.featured && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          backgroundColor: 'var(--color-low-stock)',
                          color: 'var(--color-surface)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          zIndex: 10,
                        }}
                      >
                        {t('storefront.featuredBadge', {}, { defaultValue: 'Featured' })}
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '16px' }}>
                    {typeof product.rating === 'number' && product.rating > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginBottom: '8px',
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{
                            fontSize: '14px',
                            color: 'var(--color-low-stock)',
                            fontVariationSettings: "'FILL' 1",
                          }}
                          aria-hidden="true"
                        >
                          star
                        </span>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {product.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    <h3
                      style={{
                        fontWeight: 500,
                        color: 'var(--mol-color-secondary)',
                        marginBottom: '4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontSize: '14px',
                      }}
                    >
                      {product.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        className="price-tabular"
                        style={{ fontWeight: 700, color: 'var(--mol-color-secondary)' }}
                      >
                        {formatPrice(product.price)}
                      </span>
                    </div>
                  </div>
                </Link>
                <div style={{ padding: '0 16px 16px' }}>
                  <button
                    type="button"
                    data-mol-id={`add-to-cart-${product.id}`}
                    className="add-to-cart-btn"
                    onClick={() => handleAddToCart(product)}
                    disabled={addingId === product.id}
                    style={{
                      width: '100%',
                      backgroundColor:
                        addedId === product.id
                          ? 'var(--color-primary-dark)'
                          : 'var(--color-in-stock)',
                      color: 'var(--color-surface)',
                      padding: '12px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {addedId === product.id
                      ? t('storefront.addedToCart', {}, { defaultValue: 'Added!' })
                      : addingId === product.id
                        ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                        : t('storefront.addToCart', {}, { defaultValue: 'Add to Cart' })}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Promotional Banner */}
      <section
        data-mol-id="promo-banner-01"
        style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 24px' }}
      >
        <div
          style={{
            backgroundColor: 'var(--color-low-stock)',
            borderRadius: '1rem',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '32px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: '-80px',
              bottom: '-80px',
              width: '256px',
              height: '256px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '50%',
              filter: 'blur(64px)',
            }}
          />
          <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
            <h2
              data-mol-id="promo-title-01"
              style={{
                color: 'var(--color-surface)',
                fontSize: '36px',
                fontWeight: 900,
                marginBottom: '16px',
              }}
            >
              {t('storefront.promoTitle', {}, { defaultValue: 'Summer Sale — Up to 40% Off' })}
            </h2>
            <p style={{ color: '#ffffff', fontSize: '18px' }}>
              {t(
                'storefront.promoDesc',
                {},
                {
                  defaultValue:
                    'Limited time offer on all seasonal essentials. Grab yours before they are gone.',
                },
              )}
            </p>
          </div>
          <Link
            to="/search?q=sale"
            data-mol-id="promo-cta-01"
            style={{
              position: 'relative',
              zIndex: 10,
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-low-stock)',
              padding: '16px 40px',
              borderRadius: '8px',
              fontWeight: 700,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              transition: 'all 0.2s',
            }}
          >
            {t('storefront.shopSale', {}, { defaultValue: 'Shop the Sale' })}
          </Link>
        </div>
      </section>

      {/* New Arrivals */}
      <section
        data-mol-id="arrivals-section-01"
        style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px 24px' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '40px',
          }}
        >
          <h2
            data-mol-id="arrivals-title-01"
            style={{ fontSize: '30px', fontWeight: 700, color: 'var(--mol-color-secondary)' }}
          >
            {t('storefront.arrivalsTitle', {}, { defaultValue: 'New Arrivals' })}
          </h2>
          <Link
            to="/search?q=new"
            style={{
              color: 'var(--color-in-stock)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            {t('storefront.exploreNew', {}, { defaultValue: 'Explore New' })}{' '}
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              chevron_right
            </span>
          </Link>
        </div>
        <div
          className="storefront-section-cols"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '24px' }}
        >
          {arrivals.length === 0 && (
            <p
              data-mol-id="arrivals-empty"
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                color: 'var(--color-out-of-stock)',
              }}
            >
              {t('storefront.arrivalsEmpty', {}, { defaultValue: 'No new arrivals yet.' })}
            </p>
          )}
          {arrivals.map((product, index) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              data-mol-id={`arrival-card-${index + 1}`}
              className="arrival-card"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  aspectRatio: '1',
                  backgroundColor: 'var(--color-border-light)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  marginBottom: '16px',
                  position: 'relative',
                }}
              >
                <img
                  src={
                    product.thumbnails?.[0] ||
                    product.images?.[0] ||
                    `https://picsum.photos/seed/${product.id}/400/400`
                  }
                  alt={product.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.3s',
                  }}
                />
              </div>
              <h3
                style={{
                  fontWeight: 500,
                  color: 'var(--mol-color-secondary)',
                  marginBottom: '4px',
                  fontSize: '14px',
                }}
              >
                {product.name}
              </h3>
              <p
                className="price-tabular"
                style={{ fontWeight: 700, color: 'var(--mol-color-secondary)' }}
              >
                {formatPrice(product.price)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <style>{`
        /* Inter + Material Symbols are served locally (index.html @font-face) —
           never load fonts from Google. */

        [data-mol-id="page-storefront"] {
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        [data-mol-id="page-storefront"] * {
          font-family: inherit;
        }

        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined', sans-serif;
          font-weight: normal;
          font-style: normal;
          font-size: 24px;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          vertical-align: middle;
        }

        .price-tabular {
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum";
        }

        @media (min-width: 768px) {
          [data-mol-id="promo-banner-01"] > div {
            flex-direction: row !important;
            padding: 64px !important;
          }
          [data-mol-id="promo-banner-01"] > div > div:nth-child(2) {
            text-align: left !important;
          }
          .storefront-section-cols {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }

        @media (max-width: 1023px) and (min-width: 640px) {
          .storefront-section-cols {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        .product-card:hover { box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important; }
        .product-card:hover img { transform: scale(1.05); }
        .category-card:hover img { transform: scale(1.1); }
        .category-card:hover .category-overlay { background-color: rgba(0,0,0,0.3) !important; }
        .arrival-card:hover img { transform: scale(1.1); }
        [data-mol-id="hero-cta"]:hover { background-color: #15803d !important; transform: translateY(-2px); }
        [data-mol-id="promo-cta-01"]:hover { background-color: #f9fafb !important; transform: translateY(-2px); }
      `}</style>
      <Footer />
    </div>
  )
}
