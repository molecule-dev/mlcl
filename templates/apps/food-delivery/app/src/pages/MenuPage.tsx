import { useCallback, useEffect, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useNavigate, useParams, useTranslation } from '@molecule/app-react'

interface MenuPageData {
  restaurant?: Restaurant
  categories?: Record<string, MenuItem[]>
}

interface ItemDetail {
  modifiers?: Modifier[]
}

interface Restaurant {
  id: string
  name: string
  cuisine: string
  rating: number
  review_count: number
  estimated_delivery_min: number
  address: string
  image_url: string | null
}

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  image_url: string | null
  thumbnail_url: string | null
  dietary_tags: string[]
  preparation_time: number
  status: string
}

interface Modifier {
  id: string
  name: string
  options: Array<{ name: string; price: number }>
  required: boolean
  max_selections: number
}

interface CartItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  modifiers: Array<{ name: string; option: string; price: number }>
  specialInstructions: string
}

export function MenuPage() {
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id: restaurantId } = useParams<{ id: string }>()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [categories, setCategories] = useState<Record<string, MenuItem[]>>({})
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [modifiers, setModifiers] = useState<Modifier[]>([])
  const [selectedModifiers, setSelectedModifiers] = useState<
    Record<string, { name: string; option: string; price: number }>
  >({})
  const [itemQuantity, setItemQuantity] = useState(1)
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [loading, setLoading] = useState(true)

  // Fetch menu
  useEffect(() => {
    if (!restaurantId) return
    http
      .get<MenuPageData>(`/api/menu/restaurant/${restaurantId}`)
      .then((res) => {
        setRestaurant(res.data?.restaurant ?? null)
        setCategories(res.data?.categories ?? {})
      })
      .finally(() => setLoading(false))
  }, [restaurantId, http])

  // Escape closes the item detail modal
  useEffect(() => {
    if (!selectedItem) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedItem(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [selectedItem])

  // Fetch modifiers for selected item
  const selectItem = useCallback(
    async (item: MenuItem) => {
      setSelectedItem(item)
      setItemQuantity(1)
      setSelectedModifiers({})
      setSpecialInstructions('')
      try {
        const res = await http.get<ItemDetail>(`/api/menu/${item.id}`)
        setModifiers(res.data?.modifiers ?? [])
      } catch (error) {
        logError('fetchItemDetail', error)
        setModifiers([])
      }
    },
    [http],
  )

  const addToCart = () => {
    if (!selectedItem) return

    const modifierList = Object.values(selectedModifiers)
    const modifierTotal = modifierList.reduce((sum, m) => sum + m.price, 0)

    setCart((prev) => {
      const existing = prev.findIndex(
        (item) =>
          item.menuItemId === selectedItem.id &&
          JSON.stringify(item.modifiers) === JSON.stringify(modifierList),
      )

      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = {
          ...updated[existing],
          quantity: updated[existing].quantity + itemQuantity,
        }
        return updated
      }

      return [
        ...prev,
        {
          menuItemId: selectedItem.id,
          name: selectedItem.name,
          price: selectedItem.price + Math.round(modifierTotal * 100),
          quantity: itemQuantity,
          modifiers: modifierList,
          specialInstructions,
        },
      ]
    })

    setSelectedItem(null)
    setModifiers([])
  }

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index))
  }

  const updateCartQuantity = (index: number, delta: number) => {
    setCart((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        const newQty = item.quantity + delta
        return newQty > 0 ? { ...item, quantity: newQty } : item
      }),
    )
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(
      cents / 100,
    )
  }

  const handleCheckout = () => {
    if (cart.length === 0) return
    // Store cart in session and navigate to checkout
    sessionStorage.setItem('checkout_cart', JSON.stringify({ restaurantId, items: cart }))
    navigate('/checkout')
  }

  if (loading) {
    return <div className="loading">{t('common.loading', {}, { defaultValue: 'Loading...' })}</div>
  }

  if (!restaurant) {
    return (
      <div className="error">
        {t('restaurant.notFound', {}, { defaultValue: 'Restaurant not found' })}
      </div>
    )
  }

  return (
    <div data-mol-id="page-menu" className="menu-page">
      <header className="restaurant-header">
        {restaurant.image_url && (
          <img src={restaurant.image_url} alt={restaurant.name} className="restaurant-banner" />
        )}
        <div className="restaurant-header-info">
          <h1>{restaurant.name}</h1>
          <span className="restaurant-cuisine">{restaurant.cuisine}</span>
          <div className="restaurant-header-meta">
            {restaurant.rating > 0 && (
              <span className="restaurant-rating">
                <span className="star-icon" aria-hidden="true">
                  &#9733;
                </span>
                {restaurant.rating.toFixed(1)}
                <span className="review-count">
                  (
                  {t(
                    'restaurants.reviews',
                    { count: restaurant.review_count },
                    { defaultValue: `${restaurant.review_count}` },
                  )}
                  )
                </span>
              </span>
            )}
            <span className="restaurant-eta">
              {t(
                'restaurants.deliveryTime',
                { min: restaurant.estimated_delivery_min },
                { defaultValue: `${restaurant.estimated_delivery_min} min` },
              )}
            </span>
          </div>
          <span className="restaurant-address">{restaurant.address}</span>
        </div>
      </header>

      <div className="menu-layout">
        <div className="menu-content">
          {Object.entries(categories).map(([category, items]) => (
            <section key={category} className="menu-category">
              <h2 className="category-title">{category}</h2>
              <div className="menu-items">
                {items.map((item) => (
                  <button
                    data-mol-id="button-action"
                    key={item.id}
                    className="menu-item-card"
                    onClick={() => selectItem(item)}
                    disabled={item.status !== 'available'}
                  >
                    <div className="menu-item-info">
                      <h3 className="menu-item-name">{item.name}</h3>
                      {item.description && (
                        <p className="menu-item-description">{item.description}</p>
                      )}
                      <div className="menu-item-footer">
                        <span className="menu-item-price">{formatPrice(item.price)}</span>
                        {item.dietary_tags?.length > 0 && (
                          <div className="dietary-tags">
                            {item.dietary_tags.map((tag) => (
                              <span key={tag} className="dietary-tag">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {item.status !== 'available' && (
                        <span className="sold-out-badge">
                          {t('menu.soldOut', {}, { defaultValue: 'Sold Out' })}
                        </span>
                      )}
                    </div>
                    {item.thumbnail_url && (
                      <img src={item.thumbnail_url} alt="" className="menu-item-image" />
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Cart sidebar */}
        <aside className="cart-sidebar">
          <h2 className="cart-title">
            {t('cart.title', {}, { defaultValue: 'Your Order' })}
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </h2>

          {cart.length === 0 ? (
            <p className="cart-empty">
              {t('cart.empty', {}, { defaultValue: 'Your cart is empty' })}
            </p>
          ) : (
            <>
              <ul className="cart-items">
                {cart.map((item, index) => (
                  <li key={index} className="cart-item">
                    <div className="cart-item-header">
                      <span className="cart-item-name">{item.name}</span>
                      <span className="cart-item-price">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                    {item.modifiers.length > 0 && (
                      <div className="cart-item-modifiers">
                        {item.modifiers.map((mod, i) => (
                          <span key={i} className="cart-modifier">
                            {mod.option}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="cart-item-controls">
                      <button
                        data-mol-id="button-decrease"
                        className="qty-btn"
                        onClick={() => updateCartQuantity(index, -1)}
                        aria-label={t('cart.decrease', {}, { defaultValue: 'Decrease quantity' })}
                      >
                        -
                      </button>
                      <span className="qty-value">{item.quantity}</span>
                      <button
                        data-mol-id="button-increase"
                        className="qty-btn"
                        onClick={() => updateCartQuantity(index, 1)}
                        aria-label={t('cart.increase', {}, { defaultValue: 'Increase quantity' })}
                      >
                        +
                      </button>
                      <button
                        data-mol-id="button-remove-item"
                        className="remove-btn"
                        onClick={() => removeFromCart(index)}
                        aria-label={t('cart.removeItem', {}, { defaultValue: 'Remove item' })}
                      >
                        &times;
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="cart-summary">
                <div className="cart-subtotal">
                  <span>{t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                <button
                  data-mol-id="button-checkout"
                  className="checkout-btn"
                  onClick={handleCheckout}
                >
                  {t('cart.checkout', {}, { defaultValue: 'Proceed to Checkout' })}
                </button>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Item detail modal */}
      {selectedItem && (
        <div
          role="presentation"
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedItem(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-item-title"
            className="modal-content"
          >
            <button
              data-mol-id="button-close"
              className="modal-close"
              onClick={() => setSelectedItem(null)}
              aria-label={t('common.close', {}, { defaultValue: 'Close' })}
            >
              &times;
            </button>

            {selectedItem.image_url && (
              <img src={selectedItem.image_url} alt={selectedItem.name} className="modal-image" />
            )}

            <h2 id="menu-item-title">{selectedItem.name}</h2>
            {selectedItem.description && (
              <p className="modal-description">{selectedItem.description}</p>
            )}
            <span className="modal-price">{formatPrice(selectedItem.price)}</span>

            {modifiers.map((mod) => (
              <div key={mod.id} className="modifier-group">
                <h3 className="modifier-name">
                  {mod.name}
                  {mod.required && (
                    <span className="required-badge">
                      {t('menu.required', {}, { defaultValue: 'Required' })}
                    </span>
                  )}
                </h3>
                <div className="modifier-options">
                  {mod.options.map((opt) => (
                    <label key={opt.name} className="modifier-option">
                      <input
                        type="radio"
                        name={mod.id}
                        checked={selectedModifiers[mod.id]?.option === opt.name}
                        onChange={() =>
                          setSelectedModifiers((prev) => ({
                            ...prev,
                            [mod.id]: { name: mod.name, option: opt.name, price: opt.price },
                          }))
                        }
                      />
                      <span className="modifier-option-name">{opt.name}</span>
                      {opt.price > 0 && (
                        <span className="modifier-option-price">
                          +{formatPrice(Math.round(opt.price * 100))}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="special-instructions">
              <label htmlFor="instructions">
                {t('menu.specialInstructions', {}, { defaultValue: 'Special instructions' })}
              </label>
              <textarea
                id="instructions"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder={t(
                  'menu.instructionsPlaceholder',
                  {},
                  { defaultValue: 'Allergies, preferences...' },
                )}
              />
            </div>

            <div className="modal-actions">
              <div className="quantity-selector">
                <button
                  data-mol-id="button-decrease-2"
                  className="qty-btn"
                  onClick={() => setItemQuantity((q) => Math.max(1, q - 1))}
                  aria-label={t('cart.decrease', {}, { defaultValue: 'Decrease quantity' })}
                >
                  -
                </button>
                <span className="qty-value">{itemQuantity}</span>
                <button
                  data-mol-id="button-increase-2"
                  className="qty-btn"
                  onClick={() => setItemQuantity((q) => q + 1)}
                  aria-label={t('cart.increase', {}, { defaultValue: 'Increase quantity' })}
                >
                  +
                </button>
              </div>
              <button
                data-mol-id="button-add-to-order"
                className="add-to-cart-btn"
                onClick={addToCart}
              >
                {t('menu.addToOrder', {}, { defaultValue: 'Add to Order' })} -{' '}
                {formatPrice(selectedItem.price * itemQuantity)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
