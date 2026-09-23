import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  addLine,
  cartCount,
  type GuestCart,
  readGuestCart,
  writeGuestCart,
} from '../lib/guest-cart.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiMenuItem {
  id: string
  name: string
  description?: string
  price: number
  category?: string
  available?: boolean
  user_id?: string
}

export function GuestMenu() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [params] = useSearchParams()
  const ownerParam = params.get('owner')
  const tableParam = params.get('table')
  const tableNumber = tableParam ? Number(tableParam) : null

  const [items, setItems] = useState<ReadonlyArray<ApiMenuItem>>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cart, setCart] = useState<GuestCart>(() => readGuestCart())

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const url = ownerParam
      ? `/api/menu?owner=${encodeURIComponent(ownerParam)}&available=true`
      : '/api/menu?available=true'
    http
      .get(url)
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<ApiMenuItem>(res).filter((i) => i.available !== false)
        setItems(list)
        // Top of the guest ordering funnel: the QR-code menu was viewed.
        void track({
          name: 'menu.viewed',
          properties: { itemCount: list.length, table: tableNumber ?? undefined },
        })
      })
      .catch(() => {
        if (!cancelled)
          setError(t('guestMenu.loadError', {}, { defaultValue: 'Could not load menu.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, ownerParam, tableNumber, t])

  useEffect(() => {
    setCart((prev) => {
      const inferredOwner = ownerParam ?? prev.ownerId ?? items[0]?.user_id ?? null
      const next: GuestCart = {
        ownerId: inferredOwner ?? null,
        tableNumber: tableNumber ?? prev.tableNumber,
        lines: prev.lines,
      }
      writeGuestCart(next)
      return next
    })
  }, [items, ownerParam, tableNumber])

  const categories = useMemo(() => {
    const set = new Set<string>()
    items.forEach((i) => {
      if (i.category) set.add(i.category)
    })
    return ['all', ...Array.from(set)]
  }, [items])

  const filtered = filter === 'all' ? items : items.filter((i) => i.category === filter)
  const count = cartCount(cart)

  const handleAdd = useCallback((item: ApiMenuItem) => {
    void track({
      name: 'item.added_to_cart',
      properties: { itemId: item.id, name: item.name },
    })
    setCart((prev) => {
      const next = addLine(prev, {
        id: item.id,
        name: item.name,
        priceCents: Math.round(Number(item.price ?? 0) * 100),
      })
      writeGuestCart({
        ...next,
        ownerId: next.ownerId ?? item.user_id ?? null,
      })
      return { ...next, ownerId: next.ownerId ?? item.user_id ?? null }
    })
  }, [])

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background pb-32')}>
      <header
        className={cm.cn(
          cm.sp('px', 5),
          cm.sp('py', 6),
          'bg-gradient-to-br from-primary via-tertiary to-primary text-on-primary relative overflow-hidden',
        )}
      >
        <div className={cm.cn(cm.maxW('lg'), cm.mxAuto, 'relative z-10')}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-surface/20 backdrop-blur-md',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-on-primary text-base')}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                local_fire_department
              </span>
            </span>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest opacity-80',
              )}
            >
              {tableNumber
                ? t(
                    'guestMenu.eyebrowTable',
                    { table: tableNumber },
                    { defaultValue: 'Table {{table}}' },
                  )
                : t('guestMenu.eyebrow', {}, { defaultValue: 'Guest menu' })}
            </p>
          </div>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.sp('mt', 3),
              'font-extrabold tracking-tight font-display',
            )}
          >
            {t('guestMenu.heading', {}, { defaultValue: 'Welcome — order from your table.' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'opacity-90')}>
            {t(
              'guestMenu.subheading',
              {},
              { defaultValue: 'Tap a dish to add. Pay together at the end.' },
            )}
          </p>
        </div>
        <div
          className={cm.cn(
            'absolute -right-24 -bottom-24 w-64 h-64 rounded-full bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
      </header>

      <main
        className={cm.cn(cm.maxW('lg'), cm.mxAuto, cm.sp('px', 5), cm.sp('py', 6), cm.stack(6))}
      >
        {error ? (
          <p
            data-testid="guestmenu-error"
            className={cm.cn(cm.sp('py', 4), cm.textCenter, 'text-error')}
          >
            {error}
          </p>
        ) : null}

        {categories.length > 1 ? (
          <nav
            className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'overflow-x-auto')}
            aria-label={t('guestMenu.categoryNavLabel', {}, { defaultValue: 'Menu categories' })}
          >
            {categories.map((c) => {
              const active = filter === c
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilter(c)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    cm.roundedFull,
                    'whitespace-nowrap transition-colors',
                    active
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low text-on-surface-variant',
                  )}
                >
                  {c === 'all' ? t('status.all', {}, { defaultValue: 'All' }) : c}
                </button>
              )
            })}
          </nav>
        ) : null}

        {loading ? (
          <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
            {t('guestMenu.loading', {}, { defaultValue: 'Loading menu…' })}
          </p>
        ) : filtered.length === 0 ? (
          <p
            data-testid="guestmenu-empty"
            className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}
          >
            {t(
              'guestMenu.empty',
              {},
              { defaultValue: 'This restaurant has not published a menu yet.' },
            )}
          </p>
        ) : (
          <div className={cm.stack(4)}>
            {filtered.map((item) => (
              <article
                key={item.id}
                data-testid={`guestmenu-item-${item.id}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('p', 3),
                  'bg-surface-container-lowest rounded-xl shadow-sm',
                )}
              >
                <div
                  className={cm.cn(
                    cm.w(20),
                    cm.h(20),
                    cm.flex({ align: 'center', justify: 'center' }),
                    'rounded-lg bg-gradient-to-br from-primary/20 to-tertiary/20 flex-shrink-0',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-3xl text-primary/40')}
                    aria-hidden="true"
                  >
                    restaurant
                  </span>
                </div>
                <div className={cm.flex1}>
                  <p
                    className={cm.cn(
                      cm.textSize('base'),
                      cm.fontWeight('semibold'),
                      'font-display',
                    )}
                  >
                    {item.name}
                  </p>
                  {item.description && (
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('mt', 1),
                        'text-on-surface-variant line-clamp-2',
                      )}
                    >
                      {item.description}
                    </p>
                  )}
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.sp('mt', 1),
                      'font-extrabold tabular-nums text-primary',
                    )}
                  >
                    ${Number(item.price ?? 0).toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAdd(item)}
                  data-testid={`guestmenu-add-${item.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    'bg-primary text-on-primary hover:bg-primary/90 transition-colors',
                  )}
                  aria-label={t(
                    'guestMenu.addToCart',
                    { name: item.name },
                    { defaultValue: 'Add {{name}} to cart' },
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
                    add
                  </span>
                </button>
              </article>
            ))}
          </div>
        )}
      </main>

      {count > 0 && (
        <Link
          to="/cart"
          data-testid="guestmenu-view-cart"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 5),
            cm.sp('py', 4),
            'fixed bottom-4 left-1/2 -translate-x-1/2 w-[min(94vw,28rem)] rounded-full bg-primary text-on-primary shadow-2xl shadow-primary/30 hover:bg-primary/90 transition-colors',
          )}
        >
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.fontWeight('bold'))}>
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              shopping_basket
            </span>
            {t('guestMenu.viewCart', { count }, { defaultValue: 'View cart · {{count}} items' })}
          </span>
          <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      )}
    </div>
  )
}
