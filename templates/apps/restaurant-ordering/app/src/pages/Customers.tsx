import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface ApiCustomer {
  id: string
  name: string
  email: string | null
  phone?: string | null
  total_visits?: number
  total_spent?: number | string
  last_visit_at?: string | null
}

function fmtUsd(amount: number) {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const formatDate = (iso?: string | null) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString()
  } catch (_error) {
    // invalid ISO string — fall back to dash
    return '—'
  }
}

export function Customers() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<ReadonlyArray<ApiCustomer>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const reload = useCallback(
    async (q?: string) => {
      setLoading(true)
      setError(null)
      try {
        const url = q ? `/api/customers?search=${encodeURIComponent(q)}` : '/api/customers'
        const res = await http.get(url)
        setCustomers(unwrapList<ApiCustomer>(res))
      } catch (error) {
        logError('customers.load', error)
        setError(t('customers.loadError', {}, { defaultValue: 'Could not load guests.' }))
      } finally {
        setLoading(false)
      }
    },
    [http, t],
  )

  useEffect(() => {
    const handle = setTimeout(() => {
      void reload(search.trim() || undefined)
    }, 250)
    return () => clearTimeout(handle)
  }, [reload, search])

  const handleAdd = useCallback(async () => {
    setCreating(true)
    setError(null)
    try {
      const name = window.prompt(t('customers.namePrompt', {}, { defaultValue: 'Guest name' }))
      if (!name) return
      const email =
        window.prompt(t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })) || ''
      await http.post('/api/customers', { name, email })
      await reload()
    } catch (error) {
      logError('customers.add', error)
      setError(t('customers.addError', {}, { defaultValue: 'Could not add guest.' }))
    } finally {
      setCreating(false)
    }
  }, [http, reload, t])

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
            {t('customers.eyebrow', {}, { defaultValue: 'Guest directory' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight font-display')}>
            {t('nav.guests', {}, { defaultValue: 'Guests' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'customers.subheading',
              {},
              {
                defaultValue:
                  'Lifetime visits, preferred seating, and notes that travel between shifts.',
              },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <label
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-full bg-surface-container-low',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-base text-on-surface-variant')}
              aria-hidden="true"
            >
              search
            </span>
            <input
              type="search"
              data-testid="customers-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('customers.searchPlaceholder', {}, { defaultValue: 'Search guests' })}
              className={cm.cn(
                cm.textSize('sm'),
                'bg-transparent border-none focus:ring-0 placeholder:text-on-surface-variant w-56',
              )}
            />
          </label>
          <button
            type="button"
            onClick={handleAdd}
            disabled={creating}
            data-testid="customers-add"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors inline-flex items-center gap-2 disabled:opacity-50',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              person_add
            </span>
            {creating
              ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
              : t('customers.addGuest', {}, { defaultValue: 'Add guest' })}
          </button>
        </div>
      </header>

      {error ? (
        <p
          data-testid="customers-error"
          className={cm.cn(cm.sp('py', 4), cm.textCenter, 'text-error')}
        >
          {error}
        </p>
      ) : null}

      {loading && customers.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('customers.loading', {}, { defaultValue: 'Loading guests…' })}
        </p>
      ) : customers.length === 0 ? (
        <p
          data-testid="customers-empty"
          className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}
        >
          {t('customers.empty', {}, { defaultValue: 'No guests in your directory yet.' })}
        </p>
      ) : (
        <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
          {customers.map((c) => (
            <Link
              key={c.id}
              to={`/customers/${c.id}`}
              data-testid={`customers-row-${c.id}`}
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all',
              )}
            >
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(12),
                      cm.h(12),
                      cm.roundedFull,
                      'bg-gradient-to-br from-primary to-tertiary text-on-primary font-extrabold font-display',
                    )}
                  >
                    {initials(c.name)}
                  </span>
                  <div>
                    <p
                      className={cm.cn(
                        cm.textSize('base'),
                        cm.fontWeight('semibold'),
                        'font-display',
                      )}
                    >
                      {c.name}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {c.email ?? '—'}
                    </p>
                  </div>
                </div>
                {(c.total_visits ?? 0) >= 10 ? (
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      cm.roundedFull,
                      'uppercase tracking-widest bg-tertiary/15 text-tertiary',
                    )}
                  >
                    VIP
                  </span>
                ) : null}
              </div>
              <dl className={cm.cn(cm.sp('mt', 5), cm.grid({ gap: 'sm' }), 'grid-cols-2')}>
                <div>
                  <dt
                    className={cm.cn(
                      'text-[10px] uppercase tracking-widest font-bold text-on-surface-variant',
                    )}
                  >
                    {t('customers.visitsLabel', {}, { defaultValue: 'Visits' })}
                  </dt>
                  <dd
                    className={cm.cn(cm.textSize('xl'), 'font-extrabold tabular-nums font-display')}
                  >
                    {c.total_visits ?? 0}
                  </dd>
                </div>
                <div>
                  <dt
                    className={cm.cn(
                      'text-[10px] uppercase tracking-widest font-bold text-on-surface-variant',
                    )}
                  >
                    {t('customers.lifetimeLabel', {}, { defaultValue: 'Lifetime' })}
                  </dt>
                  <dd
                    className={cm.cn(cm.textSize('xl'), 'font-extrabold tabular-nums font-display')}
                  >
                    {fmtUsd(Number(c.total_spent ?? 0))}
                  </dd>
                </div>
              </dl>
              <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 4), 'text-on-surface-variant')}>
                {t(
                  'customers.lastVisit',
                  { date: formatDate(c.last_visit_at) },
                  { defaultValue: 'Last visit {{date}}' },
                )}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
