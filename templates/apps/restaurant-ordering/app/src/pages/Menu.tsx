import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type DietaryTag, type MenuItem, MenuItemCard } from '../components/MenuItemCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface ApiMenuItem {
  id: string
  name: string
  description?: string
  price: number
  category?: string
  image_url?: string | null
  dietary_tags?: string[]
  available?: boolean
}

const KNOWN_DIETARY: ReadonlySet<DietaryTag> = new Set([
  'vegetarian',
  'vegan',
  'gluten_free',
  'spicy',
  'allergen',
])

const normalizeDietary = (tags: string[] | undefined): ReadonlyArray<DietaryTag> => {
  if (!Array.isArray(tags)) return []
  const out: DietaryTag[] = []
  for (const raw of tags) {
    const normalized = String(raw)
      .toLowerCase()
      .replace(/[\s-]+/g, '_') as DietaryTag
    if (KNOWN_DIETARY.has(normalized) && !out.includes(normalized)) out.push(normalized)
  }
  return out
}

const toMenuItem = (row: ApiMenuItem): MenuItem => ({
  id: row.id,
  name: row.name,
  description: row.description ?? '',
  priceCents: Math.round(Number(row.price ?? 0) * 100),
  category: row.category,
  imageUrl: row.image_url ?? undefined,
  unavailable: row.available === false,
  dietary: normalizeDietary(row.dietary_tags),
})

export function Menu() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [items, setItems] = useState<ReadonlyArray<MenuItem>>([])
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    return http
      .get('/api/menu')
      .then((res) => {
        const list = unwrapList<ApiMenuItem>(res).map(toMenuItem)
        setItems(list)
      })
      .catch(() => {
        setError(t('menu.loadError', {}, { defaultValue: 'Could not load menu items.' }))
      })
      .finally(() => setLoading(false))
  }, [http, t])

  useEffect(() => {
    let cancelled = false
    void reload().then(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
  }, [reload])

  const handleAddItem = useCallback(async () => {
    setCreating(true)
    try {
      const created = unwrapSingle<ApiMenuItem>(
        await http.post('/api/menu', {
          name: t('menu.newItemName', {}, { defaultValue: 'New menu item' }),
          description: '',
          price: 10,
          category: t('menu.defaultCategory', {}, { defaultValue: 'Mains' }),
          available: true,
        }),
      )
      if (created?.id) {
        navigate(`/menu/${created.id}`)
      } else {
        await reload()
      }
    } catch (error) {
      logError('menu.addItem', error)
      setError(
        t(
          'menu.addError',
          {},
          { defaultValue: 'Could not create menu item. You may have hit your tier limit.' },
        ),
      )
    } finally {
      setCreating(false)
    }
  }, [http, navigate, reload, t])

  const categories = useMemo(() => {
    const set = new Set<string>()
    items.forEach((i) => {
      if (i.category) set.add(i.category)
    })
    return ['all', ...Array.from(set)]
  }, [items])

  const filtered = filter === 'all' ? items : items.filter((i) => i.category === filter)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('menu.eyebrow', {}, { defaultValue: 'Menu management' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight font-display')}>
            {t('menu.heading', {}, { defaultValue: 'The menu' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'menu.subheading',
              {},
              { defaultValue: 'Tap an item to edit photo, modifiers, dietary, and pricing.' },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <Link
            to="/menu/guest"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors inline-flex items-center gap-2',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              qr_code_2
            </span>
            {t('menu.guestPreview', {}, { defaultValue: 'Guest view' })}
          </Link>
          <button
            onClick={handleAddItem}
            disabled={creating}
            type="button"
            data-testid="menu-add-item"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              add
            </span>
            {creating
              ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
              : t('menu.addItem', {}, { defaultValue: 'Add item' })}
          </button>
        </div>
      </header>

      <nav
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
          cm.sp('py', 1),
          'overflow-x-auto',
        )}
        aria-label={t('menu.categoryNavLabel', {}, { defaultValue: 'Menu categories' })}
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
                'transition-colors',
                active
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )}
            >
              {c === 'all' ? t('status.all', {}, { defaultValue: 'All' }) : c}
            </button>
          )
        })}
      </nav>

      {error ? (
        <p data-testid="menu-error" className={cm.cn(cm.sp('py', 4), cm.textCenter, 'text-error')}>
          {error}
        </p>
      ) : null}

      {loading && filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('menu.loading', {}, { defaultValue: 'Loading menu…' })}
        </p>
      ) : filtered.length === 0 ? (
        <div
          data-testid="menu-empty"
          className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.stack(3))}
        >
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('menu.empty', {}, { defaultValue: 'No menu items yet.' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('menu.emptyHint', {}, { defaultValue: 'Tap "Add item" to create your first dish.' })}
          </p>
        </div>
      ) : (
        <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
          {filtered.map((item) => (
            <MenuItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
