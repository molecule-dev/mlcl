import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface ListItem {
  product_id: string
  name: string
  brand?: string
  size?: string
  price_cents: number
  qty?: number
  quantity?: number
}

interface ShoppingList {
  id: string
  name: string
  item_count: number
  total_cents: number
  items: ListItem[]
}

interface ListsResponse {
  lists: ShoppingList[]
  staples: ListItem[]
  smart_reorder_due: ListItem[]
}

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function Lists() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [data, setData] = useState<ListsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [busyListId, setBusyListId] = useState<string | null>(null)
  const [busyProductId, setBusyProductId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setError(null)
    try {
      const res = await http.get('/api/lists')
      setData(unwrapSingle<ListsResponse>(res))
    } catch (_error) {
      setError(t('lists.loadError', {}, { defaultValue: 'Failed to load lists.' }))
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void reload()
  }, [reload])

  async function handleCreateList(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    const name = newListName.trim()
    if (!name || creating) return
    setCreating(true)
    setCreateError(null)
    try {
      await http.post('/api/lists', { name })
      void track({ name: 'list.created', properties: { name } })
      setNewListName('')
      setShowCreate(false)
      await reload()
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : t('lists.createError', {}, { defaultValue: 'Could not create list.' }),
      )
    } finally {
      setCreating(false)
    }
  }

  async function handleAddListToCart(list: ShoppingList): Promise<void> {
    if (busyListId) return
    setBusyListId(list.id)
    try {
      for (const item of list.items) {
        await http
          .post('/api/cart/items', {
            productId: item.product_id,
            quantity: item.qty ?? item.quantity ?? 1,
          })
          .catch(() => null)
      }
      void track({
        name: 'list.added_to_cart',
        properties: { list_id: list.id, item_count: list.items.length },
      })
      navigate('/cart')
    } finally {
      setBusyListId(null)
    }
  }

  async function handleAddSingleItem(productId: string): Promise<void> {
    if (busyProductId) return
    setBusyProductId(productId)
    try {
      await http.post('/api/cart/items', { productId, quantity: 1 })
    } finally {
      setBusyProductId(null)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.maxW('7xl'),
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.mxAuto,
        cm.grid({ cols: 12, gap: 'lg' }),
      )}
    >
      <div className={'col-span-12 lg:col-span-8'}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('lists.heading', {}, { defaultValue: 'Your lists' })}
          </h1>
          <button
            type="button"
            data-test="lists-new-cta"
            onClick={() => setShowCreate((s) => !s)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-full hover:bg-primary-hover',
            )}
          >
            {showCreate
              ? t('common.cancel', {}, { defaultValue: 'Cancel' })
              : t('lists.newCta', {}, { defaultValue: 'New list' })}
          </button>
        </div>

        {showCreate ? (
          <form
            onSubmit={handleCreateList}
            className={cm.cn(
              cm.sp('p', 4),
              cm.sp('mb', 4),
              'bg-surface rounded-xl shadow-sm',
              cm.flex({ align: 'center', gap: 'sm' }),
            )}
          >
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder={t('lists.namePlaceholder', {}, { defaultValue: 'List name' })}
              aria-label={t('lists.namePlaceholder', {}, { defaultValue: 'List name' })}
              data-test="lists-name-input"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'flex-1 border border-outline-variant rounded-md',
              )}
              required
            />
            <button
              type="submit"
              data-test="lists-create-submit"
              disabled={creating || newListName.trim().length === 0}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-md disabled:opacity-50',
              )}
            >
              {creating
                ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                : t('common.create', {}, { defaultValue: 'Create' })}
            </button>
            {createError ? <span className="text-error text-sm">{createError}</span> : null}
          </form>
        ) : null}

        {error ? (
          <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
        ) : loading ? (
          <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : !data || data.lists.length === 0 ? (
          <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
            <p className={cm.cn(cm.textSize('lg'), cm.textMuted)}>
              {t('lists.empty', {}, { defaultValue: 'No saved lists yet.' })}
            </p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.sp('mt', 4),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-full hover:bg-primary-hover',
              )}
            >
              {t('lists.createCta', {}, { defaultValue: 'Create your first list' })}
            </button>
          </div>
        ) : (
          <ul className={'space-y-3'} data-test="lists-grid">
            {data.lists.map((list) => (
              <li
                key={list.id}
                className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm')}
                data-test="list-card"
              >
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <div className={'min-w-0'}>
                    <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                      {list.name}
                    </h2>
                    <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                      {t(
                        'lists.itemCountTotal',
                        { count: list.item_count, total: fmt(list.total_cents) },
                        { defaultValue: '{{count}} items · {{total}}' },
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddListToCart(list)}
                    disabled={list.items.length === 0 || busyListId === list.id}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'bg-primary text-on-primary rounded-full hover:bg-primary-hover disabled:opacity-50',
                    )}
                  >
                    {busyListId === list.id
                      ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                      : t('lists.addAllCta', {}, { defaultValue: 'Add all to cart' })}
                  </button>
                </div>
                <ul className={cm.cn(cm.sp('mt', 3), cm.textSize('sm'), cm.textMuted)}>
                  {list.items.slice(0, 5).map((i) => (
                    <li key={i.product_id}>· {i.name}</li>
                  ))}
                  {list.items.length > 5 ? (
                    <li>
                      {t(
                        'lists.moreItems',
                        { n: list.items.length - 5 },
                        { defaultValue: '+ {{n}} more' },
                      )}
                    </li>
                  ) : null}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className={'col-span-12 lg:col-span-4'}>
        <div
          className={cm.cn(
            cm.sp('p', 5),
            'bg-surface rounded-xl shadow-sm space-y-3 sticky top-24',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wide text-on-surface-variant',
            )}
          >
            {t('lists.smartReorderHeading', {}, { defaultValue: 'Smart reorder' })}
          </h2>
          {data && data.smart_reorder_due.length > 0 ? (
            data.smart_reorder_due.slice(0, 6).map((item) => (
              <div
                key={item.product_id}
                className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}
              >
                <div className={'min-w-0'}>
                  <Link
                    to={`/product/${item.product_id}`}
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'truncate block hover:underline',
                    )}
                  >
                    {item.name}
                  </Link>
                  <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                    {item.size} · {fmt(item.price_cents)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddSingleItem(item.product_id)}
                  disabled={busyProductId === item.product_id}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'bg-primary text-on-primary rounded-full disabled:opacity-50',
                  )}
                >
                  {busyProductId === item.product_id
                    ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                    : t('common.add', {}, { defaultValue: 'Add' })}
                </button>
              </div>
            ))
          ) : (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t(
                'lists.smartReorderEmpty',
                {},
                { defaultValue: 'No suggestions yet — order more to train the recommender.' },
              )}
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}
